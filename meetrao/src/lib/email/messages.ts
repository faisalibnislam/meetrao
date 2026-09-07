import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { hasServiceRole, siteUrl, supportEmail, publicEnv } from "@/lib/env";
import { formatLongDate, formatTime, formatTimeRange } from "@/lib/booking/time";
import { timezoneLabel } from "@/lib/timezones";
import { renderSubject, renderTemplate } from "./render";
import { sendAndLog } from "./send";

/* ── Preference gating ───────────────────────────────────────────────────────
 *
 * READ THIS BEFORE ADDING A SENDER.
 *
 * The five `notify_*` columns gate HOST email only. Guest-facing mail — booking
 * confirmations, cancellation notices, email verification, password resets — is
 * transactional: it is sent because someone took an action that needs a reply,
 * not because a host opted in. It must send regardless of every flag here.
 *
 * A guest who books a meeting and receives nothing has no Meet link, no
 * calendar file and no way to cancel. That is why the guest senders below do
 * not take a preference at all — there is deliberately no parameter to get
 * wrong — and why only `hostWants()` exists.
 * ────────────────────────────────────────────────────────────────────────── */

type HostPreference =
  | "notify_new_booking"
  | "notify_booking_changed"
  | "notify_booking_cancelled"
  | "notify_daily_agenda"
  | "notify_product_news";

/**
 * Whether the host has this notification switched on.
 *
 * Defaults to sending when the row cannot be read: the preferences exist to let
 * a host opt out deliberately, so an infrastructure failure should not silently
 * mute a booking notification they never turned off.
 */
async function hostWants(
  hostId: string,
  preference: HostPreference,
): Promise<boolean> {
  if (!hasServiceRole()) return true;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(preference)
    .eq("id", hostId)
    .maybeSingle();

  if (error || !data) return true;
  return (data as Record<string, boolean>)[preference] !== false;
}

/* ── Shared field helpers ─────────────────────────────────────────────────── */

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full.trim();
}

/** "meet.google.com/abc-defg-hij" — the label the templates print. */
function meetLabel(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

export type BookingEmailData = {
  id: string;
  reference: string;
  meetingName: string;
  durationMinutes: number;
  guestName: string;
  guestEmail: string;
  guestNote: string;
  guestTimezone: string | null;
  startsAt: Date;
  endsAt: Date;
  meetUrl: string | null;
};

export type HostEmailData = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  timezone: string;
};

/**
 * Idempotency keys are per (booking event, recipient). Resend deduplicates on
 * them for 24 hours, so a retried request sends once — the case that matters is
 * a serverless invocation retried after a timeout, where the booking already
 * exists and the second attempt would otherwise send a duplicate.
 */
const key = (bookingId: string, event: string, who: string) =>
  `booking:${bookingId}:${event}:${who}`;

/* ── Booking confirmed ───────────────────────────────────────────────────── */

/** To the host. Honours "New booking". */
export async function sendBookingNewHost(
  host: HostEmailData,
  booking: BookingEmailData,
): Promise<void> {
  if (!(await hostWants(host.id, "notify_new_booking"))) return;

  const zone = host.timezone;
  const fields = {
    guest_name: booking.guestName,
    guest_first: firstName(booking.guestName),
    guest_email: booking.guestEmail,
    guest_note: booking.guestNote || "No note left.",
    meeting_name: booking.meetingName,
    start_long: `${formatLongDate(booking.startsAt, zone)} · ${formatTimeRange(booking.startsAt, booking.endsAt, zone)}`,
    start_short: `${formatLongDate(booking.startsAt, zone)} at ${formatTime(booking.startsAt, zone)}`,
    timezone: timezoneLabel(zone),
    meet_url: booking.meetUrl ?? siteUrl(`/booking/${booking.reference}`),
    meet_url_label: booking.meetUrl
      ? meetLabel(booking.meetUrl)
      : "No Meet link — calendar not connected",
  };

  await sendAndLog("booking-new-host", {
    to: host.email,
    replyTo: booking.guestEmail,
    subject: renderSubject(
      "New booking: {{guest_name}} — {{meeting_name}}",
      fields,
    ),
    html: renderTemplate("booking-new-host", fields),
    idempotencyKey: key(booking.id, "new", "host"),
  });
}

/** To the guest. Transactional — never gated. */
export async function sendBookingNewGuest(
  host: HostEmailData,
  booking: BookingEmailData,
): Promise<void> {
  const zone = booking.guestTimezone || host.timezone;
  const fields = {
    guest_first: firstName(booking.guestName),
    host_name: host.fullName || host.username,
    meeting_name: booking.meetingName,
    duration: `${booking.durationMinutes} minutes`,
    start_long: `${formatLongDate(booking.startsAt, zone)} · ${formatTimeRange(booking.startsAt, booking.endsAt, zone)}`,
    start_short: `${formatLongDate(booking.startsAt, zone)} at ${formatTime(booking.startsAt, zone)}`,
    guest_timezone: timezoneLabel(zone),
    meet_url: booking.meetUrl ?? siteUrl(`/booking/${booking.reference}`),
    meet_url_label: booking.meetUrl
      ? meetLabel(booking.meetUrl)
      : "Details in your booking page",
  };

  await sendAndLog("booking-new-guest", {
    to: booking.guestEmail,
    replyTo: host.email,
    subject: renderSubject(
      "You're booked with {{host_name}} — {{start_short}}",
      fields,
    ),
    html: renderTemplate("booking-new-guest", fields),
    idempotencyKey: key(booking.id, "new", "guest"),
  });
}

/* ── Booking cancelled ───────────────────────────────────────────────────── */

/**
 * To both sides. The host copy honours "Booking cancelled"; the guest copy is
 * transactional and always sends — their meeting disappeared and they are owed
 * the news.
 */
export async function sendBookingCancelled(
  host: HostEmailData,
  booking: BookingEmailData,
  cancelledBy: "host" | "guest",
): Promise<void> {
  const changedBy =
    cancelledBy === "host" ? host.fullName || host.username : booking.guestName;

  const build = (zone: string, otherParty: string) => ({
    meeting_name: booking.meetingName,
    other_party: otherParty,
    changed_by: changedBy,
    old_start_long: `${formatLongDate(booking.startsAt, zone)} · ${formatTimeRange(booking.startsAt, booking.endsAt, zone)}`,
    old_start_short: `${formatLongDate(booking.startsAt, zone)} at ${formatTime(booking.startsAt, zone)}`,
    cancelled_at: `${formatLongDate(new Date(), zone)} · ${formatTime(new Date(), zone)}`,
    cancel_reason: "No reason given.",
  });

  const hostFields = build(host.timezone, booking.guestName);
  if (await hostWants(host.id, "notify_booking_cancelled")) {
    await sendAndLog("booking-cancelled-host", {
      to: host.email,
      subject: renderSubject(
        "Cancelled: {{meeting_name}} on {{old_start_short}}",
        hostFields,
      ),
      html: renderTemplate("booking-cancelled", hostFields),
      idempotencyKey: key(booking.id, "cancelled", "host"),
    });
  }

  const guestZone = booking.guestTimezone || host.timezone;
  const guestFields = build(guestZone, host.fullName || host.username);
  await sendAndLog("booking-cancelled-guest", {
    to: booking.guestEmail,
    replyTo: host.email,
    subject: renderSubject(
      "Cancelled: {{meeting_name}} on {{old_start_short}}",
      guestFields,
    ),
    html: renderTemplate("booking-cancelled", guestFields),
    idempotencyKey: key(booking.id, "cancelled", "guest"),
  });
}

/* ── Account ─────────────────────────────────────────────────────────────── */

/**
 * To a new host. The design lists this under the host's preferences, but there
 * is no switch that covers it — the five are per-event, and "Product news" is
 * marketing. It is sent once at account creation and treated as transactional.
 */
export async function sendWelcome(host: {
  fullName: string;
  email: string;
  username: string;
}): Promise<void> {
  const fields = {
    first_name: firstName(host.fullName) || host.username,
    booking_url: `${publicEnv.bookingHost}/${host.username}`,
    onboarding_url: siteUrl("/onboarding/1"),
  };

  await sendAndLog("welcome", {
    to: host.email,
    replyTo: supportEmail(),
    subject: "Welcome to Meetrao — your link is ready",
    html: renderTemplate("welcome", fields),
    idempotencyKey: `welcome:${host.email}`,
  });
}

/**
 * Email verification. Transactional — never gated.
 *
 * NOT WIRED TO A TRIGGER. Supabase Auth owns the confirmation token today and
 * sends its own email; issuing our own token, gating the app behind it and
 * adding `verified_at` is START-HERE change 3, which is not built. The sender
 * is complete and correct so change 3 only has to call it with a real URL.
 */
export async function sendVerifyEmail(input: {
  email: string;
  verifyUrl: string;
  expiresIn?: string;
}): Promise<void> {
  const fields = {
    verify_url: input.verifyUrl,
    expires_in: input.expiresIn ?? "24 hours",
  };

  await sendAndLog("verify-email", {
    to: input.email,
    subject: "Confirm your email to activate Meetrao",
    html: renderTemplate("verify-email", fields),
    idempotencyKey: `verify:${input.email}:${input.verifyUrl}`,
  });
}
