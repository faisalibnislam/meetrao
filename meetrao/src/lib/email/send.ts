import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import { Resend } from "resend";
import { env, siteUrl } from "@/lib/env";
import type { Profile } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────────────────────
   Transactional email.

   `src/emails/*.html` are the design's send-ready files, used as-is: table
   based, styles inlined, under 10KB each, tested against real mail clients.
   They are not rebuilt in JSX and not passed through a mail-component library —
   a div-based rewrite breaks Outlook.

   Three rules the design is explicit about:

     · Escape every merge value. A guest controls their own name and the note
       field; unescaped, a note can close a table cell and rewrite the email.
     · Host mail respects the five notification preferences. Guest mail never
       does — confirmations and cancellations are transactional. The guest
       senders below take no preference parameter at all, which is the cleanest
       way to guarantee it.
     · Default to sending when a preference cannot be read. A database blip
       should not silently mute a notification nobody turned off.
   ───────────────────────────────────────────────────────────────────────────── */

type TemplateName =
  | "welcome"
  | "booking-new-host"
  | "booking-new-guest"
  | "booking-changed"
  | "booking-cancelled";

const cache = new Map<string, string>();

function template(name: TemplateName): string {
  const hit = cache.get(name);
  if (hit) return hit;
  // next.config.ts traces src/emails into the deployment; without that include
  // this read succeeds locally and fails in production.
  const html = readFileSync(path.join(process.cwd(), "src", "emails", `${name}.html`), "utf8");
  cache.set(name, html);
  return html;
}

/** HTML-escapes a merge value. Applied to every substitution without exception. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function render(name: TemplateName, fields: Record<string, string>): string {
  let html = template(name);

  for (const [key, value] of Object.entries(fields)) {
    html = html.split(`{{${key}}}`).join(escapeHtml(value));
  }

  // A field left unfilled would ship "{{guest_name}}" to a real inbox. Fail
  // here instead, where it is a caught error rather than an embarrassment.
  const missed = html.match(/\{\{[a-z_]+\}\}/g);
  if (missed) {
    throw new Error(`Email template ${name} has unfilled fields: ${[...new Set(missed)].join(", ")}`);
  }

  return html;
}

let client: Resend | null = null;
function resend(): Resend {
  client ??= new Resend(env().RESEND_API_KEY);
  return client;
}

type SendInput = {
  to: string;
  subject: string;
  html: string;
  /** One key per booking event and recipient, so a retry sends once. */
  idempotencyKey?: string;
  /** Transactional mail must not carry List-Unsubscribe. */
  marketing?: boolean;
};

export type SendResult = { sent: boolean; error?: string };

async function deliver({ to, subject, html, idempotencyKey, marketing }: SendInput): Promise<SendResult> {
  try {
    const e = env();
    const { error } = await resend().emails.send(
      {
        from: e.EMAIL_FROM,
        to,
        subject,
        html,
        headers: marketing
          ? { "List-Unsubscribe": `<${siteUrl()}/settings/notifications>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
          : undefined,
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );
    return error ? { sent: false, error: error.message } : { sent: true };
  } catch (cause) {
    return { sent: false, error: cause instanceof Error ? cause.message : "Email failed to send." };
  }
}

/** Footer values every template shares. */
function chrome() {
  return {
    // Absolute, and a PNG. Email clients do not render SVG — Gmail and Outlook
    // drop it entirely — and a relative path has no page to be relative to.
    logo_url: `${siteUrl()}/brand/meetrao-email-logo.png`,
    // No `|| "Meetrao"` fallback: a footer with the company name and no
    // address is not a compliant footer, and quietly substituting one hides
    // the fault. env() guarantees a real value — see `optional` in env.ts.
    postal_address: env().EMAIL_POSTAL_ADDRESS,
    preferences_url: `${siteUrl()}/settings/notifications`,
    unsubscribe_url: `${siteUrl()}/settings/notifications`,
  };
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full.trim() || "there";
}

/* ── host mail ──────────────────────────────────────────────────────────── */

/**
 * Sent once the email is confirmed, or straight after a Google sign-up.
 *
 * The design's table marks this as honouring preferences, but none of the five
 * switches names it and gating it on "Product news" (off by default) would
 * silence a message the host's own action just triggered. It is sent as account
 * mail, carrying the preferences and unsubscribe footer. Worth a decision.
 */
export async function sendWelcome(profile: Profile): Promise<SendResult> {
  return deliver({
    to: profile.email,
    subject: "Welcome to Meetrao — your link is ready",
    marketing: true,
    idempotencyKey: `welcome:${profile.id}`,
    html: render("welcome", {
      ...chrome(),
      first_name: firstName(profile.full_name || profile.username),
      booking_url: `meetrao.com/${profile.username}`,
      onboarding_url: `${siteUrl()}/onboarding/1`,
    }),
  });
}

export type BookingMail = {
  bookingId: string;
  reference: string;
  meetingName: string;
  guestName: string;
  guestEmail: string;
  guestNote: string;
  hostName: string;
  hostEmail: string;
  startLong: string;
  startShort: string;
  hostTimezoneLabel: string;
  guestTimezoneLabel: string;
  durationLabel: string;
  meetUrl: string;
};

function bookingUrls(reference: string) {
  const base = `${siteUrl()}/booking/${reference}`;
  return { gcal_url: `${base}/gcal`, ics_url: `${base}/ics`, cancel_url: `${base}/cancel` };
}

function meetFields(meetUrl: string) {
  const display = meetUrl.replace(/^https?:\/\//, "");
  return { meet_url: meetUrl || `${siteUrl()}`, meet_url_display: display || "Link to follow" };
}

/** "New booking" — the host's copy. Suppressed when the host turned it off. */
export async function sendBookingNewToHost(
  mail: BookingMail,
  prefs: Pick<Profile, "notify_new_booking"> | null,
): Promise<SendResult> {
  // Default to sending: a preference we could not read is not a preference to
  // stay silent.
  if (prefs && prefs.notify_new_booking === false) return { sent: false };

  return deliver({
    to: mail.hostEmail,
    subject: `New booking: ${mail.guestName} — ${mail.meetingName}`,
    idempotencyKey: `booking-new-host:${mail.bookingId}`,
    html: render("booking-new-host", {
      ...chrome(),
      ...bookingUrls(mail.reference),
      ...meetFields(mail.meetUrl),
      guest_name: mail.guestName,
      guest_first: firstName(mail.guestName),
      guest_email: mail.guestEmail,
      guest_note: mail.guestNote || "No note left.",
      meeting_name: mail.meetingName,
      start_long: mail.startLong,
      start_short: mail.startShort,
      timezone: mail.hostTimezoneLabel,
    }),
  });
}

/* ── guest mail ─────────────────────────────────────────────────────────────
   No preference parameter anywhere below: a guest confirmation is not a
   subscription and can never be switched off by anyone's settings. */

export async function sendBookingNewToGuest(mail: BookingMail): Promise<SendResult> {
  return deliver({
    to: mail.guestEmail,
    subject: `You're booked with ${mail.hostName} — ${mail.startShort}`,
    idempotencyKey: `booking-new-guest:${mail.bookingId}`,
    html: render("booking-new-guest", {
      ...chrome(),
      ...bookingUrls(mail.reference),
      ...meetFields(mail.meetUrl),
      guest_first: firstName(mail.guestName),
      host_name: mail.hostName,
      meeting_name: mail.meetingName,
      start_long: mail.startLong,
      start_short: mail.startShort,
      guest_timezone: mail.guestTimezoneLabel,
      duration: mail.durationLabel,
    }),
  });
}

export type CancellationMail = BookingMail & {
  cancelledByName: string;
  cancelledAtLong: string;
  reason: string;
};

export async function sendCancellationToHost(
  mail: CancellationMail,
  prefs: Pick<Profile, "notify_booking_cancelled"> | null,
): Promise<SendResult> {
  if (prefs && prefs.notify_booking_cancelled === false) return { sent: false };

  return deliver({
    to: mail.hostEmail,
    subject: `Cancelled: ${mail.meetingName} on ${mail.startShort}`,
    idempotencyKey: `booking-cancelled-host:${mail.bookingId}`,
    html: render("booking-cancelled", {
      ...chrome(),
      bookings_url: `${siteUrl()}/bookings`,
      meeting_name: mail.meetingName,
      other_party: mail.guestName,
      cancelled_by: mail.cancelledByName,
      old_start_long: mail.startLong,
      old_start_short: mail.startShort,
      cancelled_at: mail.cancelledAtLong,
      cancel_reason: mail.reason || "No reason given.",
    }),
  });
}

export async function sendCancellationToGuest(mail: CancellationMail): Promise<SendResult> {
  return deliver({
    to: mail.guestEmail,
    subject: `Cancelled: ${mail.meetingName} on ${mail.startShort}`,
    idempotencyKey: `booking-cancelled-guest:${mail.bookingId}`,
    html: render("booking-cancelled", {
      ...chrome(),
      bookings_url: `${siteUrl()}/${mail.hostName}`,
      meeting_name: mail.meetingName,
      other_party: mail.hostName,
      cancelled_by: mail.cancelledByName,
      old_start_long: mail.startLong,
      old_start_short: mail.startShort,
      cancelled_at: mail.cancelledAtLong,
      cancel_reason: mail.reason || "No reason given.",
    }),
  });
}

/**
 * `booking-changed.html` has no trigger: there is no reschedule flow, because
 * guests cancel and rebook. The renderer is here and unwired, so building
 * reschedule later is a matter of calling it — not of writing an email.
 */
export async function sendRescheduled(
  mail: BookingMail & { oldStartLong: string; changedByName: string },
  to: "host" | "guest",
  prefs: Pick<Profile, "notify_booking_changed"> | null,
): Promise<SendResult> {
  if (to === "host" && prefs && prefs.notify_booking_changed === false) return { sent: false };

  return deliver({
    to: to === "host" ? mail.hostEmail : mail.guestEmail,
    subject: `Moved: ${mail.meetingName} is now ${mail.startShort}`,
    idempotencyKey: `booking-changed-${to}:${mail.bookingId}`,
    html: render("booking-changed", {
      ...chrome(),
      ...bookingUrls(mail.reference),
      ...meetFields(mail.meetUrl),
      meeting_name: mail.meetingName,
      other_party: to === "host" ? mail.guestName : mail.hostName,
      changed_by: mail.changedByName,
      old_start_long: mail.oldStartLong,
      start_long: mail.startLong,
      start_short: mail.startShort,
      timezone: to === "host" ? mail.hostTimezoneLabel : mail.guestTimezoneLabel,
    }),
  });
}
