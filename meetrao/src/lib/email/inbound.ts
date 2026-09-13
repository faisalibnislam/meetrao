import { createHmac, timingSafeEqual } from "node:crypto";

/* ─────────────────────────────────────────────────────────────────────────────
   Inbound mail.

   Receiving on meetrao.com is enabled and the MX record is verified, so mail to
   hello@meetrao.com reaches Resend. Resend inbound is not a mailbox, though —
   there is no IMAP, no webmail, and nothing that puts a message in front of a
   person. A received message exists only in Resend's store until a webhook does
   something with it.

   This module is that something, minus the sending: signature checking, payload
   parsing and body building, all pure so they can be tested without a network
   or a live webhook. The route handler adds the one impure step.
   ───────────────────────────────────────────────────────────────────────────── */

/* ── signature ──────────────────────────────────────────────────────────────
   Resend signs webhooks with Svix. The scheme is small enough to implement
   against node:crypto rather than take a dependency for:

     signed content = `${id}.${timestamp}.${raw body}`
     signature      = base64(HMAC-SHA256(base64-decoded secret, signed content))

   The `svix-signature` header carries a space-separated list of
   `<version>,<signature>` pairs — more than one during a secret rotation — and
   the delivery is authentic if any v1 entry matches. */

/** How far a delivery's timestamp may drift before it is treated as a replay. */
const TOLERANCE_SECONDS = 300;

export type Verification = { ok: true } | { ok: false; reason: string };

export function verifyWebhook(args: {
  secret: string;
  /** The request body exactly as received. Re-serialising JSON breaks the HMAC. */
  body: string;
  headers: Headers;
  /** Seconds since the epoch. Injected so the replay window is testable. */
  now?: number;
}): Verification {
  const { secret, body, headers } = args;
  if (!secret) return { ok: false, reason: "no signing secret configured" };

  // Svix sends `svix-*`; the same payloads are sent as `webhook-*` when a
  // provider white-labels the headers. Accept either.
  const id = headers.get("svix-id") ?? headers.get("webhook-id");
  const timestamp = headers.get("svix-timestamp") ?? headers.get("webhook-timestamp");
  const signature = headers.get("svix-signature") ?? headers.get("webhook-signature");
  if (!id || !timestamp || !signature) return { ok: false, reason: "missing signature headers" };

  const sent = Number(timestamp);
  if (!Number.isFinite(sent)) return { ok: false, reason: "malformed timestamp" };

  const now = args.now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - sent) > TOLERANCE_SECONDS) return { ok: false, reason: "timestamp outside the replay window" };

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();

  for (const part of signature.split(" ")) {
    const comma = part.indexOf(",");
    if (comma < 0) continue;
    if (part.slice(0, comma) !== "v1") continue;

    const given = Buffer.from(part.slice(comma + 1), "base64");
    // timingSafeEqual throws on a length mismatch, so check the length first.
    if (given.length === expected.length && timingSafeEqual(given, expected)) return { ok: true };
  }

  return { ok: false, reason: "signature did not match" };
}

/* ── payload ────────────────────────────────────────────────────────────────
   Read defensively. This is the one shape in the whole app that is defined by
   somebody else's product and can gain or lose fields without a release here,
   and a message that arrives in an unexpected shape must still reach a person —
   a support address that silently drops mail is worse than no support address. */

export type ReceivedAttachment = {
  id: string;
  filename: string;
  contentType: string;
  /** Set when the file is referenced from the body as `cid:…`. */
  contentId: string | null;
  /** An image embedded in the message rather than clipped to it. */
  inline: boolean;
  /** Bytes, or 0 when unknown — the webhook payload does not carry sizes. */
  size: number;
};

export type ReceivedEmail = {
  id: string;
  from: string;
  to: string[];
  subject: string;
  /**
   * The body — and it does NOT come from the webhook.
   *
   * `email.received` carries the envelope only: sender, recipients, subject,
   * message id and attachment metadata. There is no `text` and no `html` in
   * it, which is confirmed three ways — two live payloads captured from this
   * endpoint, and Resend's own `ReceivedEmailEventData` type, which declares
   * neither field.
   *
   * These therefore parse as "" from any real delivery, and the route fills
   * them from `emails.receiving.get()` before forwarding. Reading them here
   * anyway costs nothing and means a future payload that does carry a body is
   * used rather than ignored.
   *
   * This was not a theory. Every support email forwarded before this was
   * written arrived as an envelope with "This message arrived with no readable
   * body" where the message should have been.
   */
  text: string;
  html: string;
  attachments: ReceivedAttachment[];
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** `to` has been seen as a string, an array of strings, and an array of objects. */
function asAddresses(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        return asString(record.address ?? record.email ?? record.value);
      }
      return "";
    })
    .filter(Boolean);
}

/**
 * Attachment metadata, from either shape Resend describes it in.
 *
 * The webhook's `ReceivedEmailAttachment` and the GET endpoint's
 * `InboundAttachment` agree on every field this needs except `size`, which
 * only the second one has. Reading both through one function is what lets the
 * route upgrade the webhook's list to the sized one without a second parser.
 */
export function asAttachments(value: unknown): ReceivedAttachment[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      id: asString(entry.id),
      // A nameless attachment is legal and does happen. Give it something a
      // person can click rather than letting the mail client invent one.
      filename: asString(entry.filename) || "attachment",
      contentType: asString(entry.content_type) || "application/octet-stream",
      contentId: asString(entry.content_id) || null,
      inline: asString(entry.content_disposition).toLowerCase() === "inline",
      size: typeof entry.size === "number" && entry.size > 0 ? entry.size : 0,
    }))
    .filter((a) => a.id);
}

/**
 * Pulls a received email out of a webhook envelope.
 *
 * Returns null for any event that is not `email.received` — one endpoint may
 * end up subscribed to delivery events too, and those are not mail to forward.
 */
export function parseReceived(payload: unknown): ReceivedEmail | null {
  if (!payload || typeof payload !== "object") return null;

  const envelope = payload as Record<string, unknown>;
  if (asString(envelope.type) !== "email.received") return null;

  const data = (envelope.data ?? {}) as Record<string, unknown>;

  return {
    id: asString(data.id ?? data.email_id),
    from: asString(data.from),
    to: asAddresses(data.to),
    subject: asString(data.subject),
    text: asString(data.text),
    html: asString(data.html),
    attachments: asAttachments(data.attachments),
  };
}

/* ── attachments ────────────────────────────────────────────────────────────
   Re-sending someone else's files has two limits worth respecting. Resend
   caps a message at 40 MB, and a webhook that tries to move 40 MB is a webhook
   that times out and gets retried — three times, moving it again each time. */

/** Total bytes we will re-send. Well under Resend's 40 MB ceiling, on purpose. */
export const ATTACHMENT_BUDGET = 15 * 1024 * 1024;

/**
 * Which files travel with the forward, and which are only named in it.
 *
 * Inline images are excluded rather than budgeted: the body is fetched with
 * `html_format: "data_uri"`, so they are already embedded in the HTML, and
 * attaching them again would show every logo in a signature twice.
 *
 * Ordering is the message's own. Taking the first files that fit is arbitrary,
 * but every alternative is too — and the ones that do not fit are named in the
 * body, so nothing disappears silently.
 */
export function chooseAttachments(
  list: ReceivedAttachment[],
  budget = ATTACHMENT_BUDGET,
): { send: ReceivedAttachment[]; skipped: ReceivedAttachment[] } {
  const send: ReceivedAttachment[] = [];
  const skipped: ReceivedAttachment[] = [];
  let total = 0;

  for (const attachment of list) {
    if (attachment.inline) continue;

    // size 0 means "unknown", not "empty" — the webhook omits sizes. An
    // unknown file still counts against the budget once it is fetched, so it
    // is admitted only while there is room left for a whole one.
    const cost = attachment.size || 0;
    if (total + cost > budget && send.length > 0) {
      skipped.push(attachment);
      continue;
    }
    if (cost > budget) {
      skipped.push(attachment);
      continue;
    }

    send.push(attachment);
    total += cost;
  }

  return { send, skipped };
}

/** Names the files that were too large to travel, so nothing vanishes quietly. */
export function skippedNote(skipped: ReceivedAttachment[], escape: (value: string) => string): string {
  if (skipped.length === 0) return "";

  const names = skipped.map((a) => escape(a.filename)).join(", ");
  return (
    `<p style="margin:0 0 14px;padding:9px 11px;border:1px solid #E0DDD4;border-radius:6px;` +
    `font-size:12.5px;color:#6B6862">Too large to forward: ${names}. ` +
    `Open the message in Resend under Emails → Receiving to download.</p>`
  );
}

/* ── forwarding ─────────────────────────────────────────────────────────────
   The forward is sent from the app's own verified address, not spoofed as the
   original sender: SPF and DMARC on the sender's domain would reject that, and
   the forward would bounce. The original sender goes in Reply-To instead, so
   hitting reply answers the person who wrote in. */

/**
 * Why a message must not be forwarded, or null when it may be.
 *
 * Receiving is enabled at the root of meetrao.com, so *every* address on that
 * domain routes back into Resend inbound. Forwarding there would re-trigger
 * this webhook with the message it just sent, forever.
 */
export function refuseToForward(destination: string): string | null {
  const to = destination.trim().toLowerCase();
  if (!to.includes("@")) return "SUPPORT_INBOX is not an email address";

  const domain = to.slice(to.lastIndexOf("@") + 1);
  if (domain === "meetrao.com" || domain.endsWith(".meetrao.com")) {
    return "SUPPORT_INBOX is on meetrao.com, which receives into Resend — forwarding there would loop";
  }

  return null;
}

export function forwardSubject(mail: ReceivedEmail): string {
  return mail.subject || "(no subject)";
}

/**
 * The forwarded body: a short envelope block, then the message as it arrived.
 *
 * `escape` is passed in rather than imported so this module stays free of
 * `server-only` and can be exercised directly by the test suite.
 */
export function forwardHtml(
  mail: ReceivedEmail,
  escape: (value: string) => string,
  /** Rendered above the body — currently the "too large to forward" note. */
  notice = "",
): string {
  const envelope = [
    ["From", mail.from || "(unknown sender)"],
    ["To", mail.to.join(", ") || "(unknown recipient)"],
    ["Subject", mail.subject || "(no subject)"],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:1px 10px 1px 0;color:#6B6862;white-space:nowrap">${label}</td>` +
        `<td style="padding:1px 0;color:#1A1917">${escape(value)}</td></tr>`,
    )
    .join("");

  // A message with neither part is not dropped — the envelope alone still tells
  // someone that mail arrived, and the id finds it in the Resend dashboard.
  const body = mail.html
    ? mail.html
    : mail.text
      ? `<pre style="margin:0;font:inherit;white-space:pre-wrap">${escape(mail.text)}</pre>`
      : `<p style="margin:0;color:#6B6862">This message arrived with no readable body. ` +
        `Open it in Resend under Emails → Receiving${mail.id ? ` (id ${escape(mail.id)})` : ""}.</p>`;

  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1A1917">
  <table style="border-collapse:collapse;font-size:12.5px;margin:0 0 14px"><tbody>${envelope}</tbody></table>
  <hr style="border:0;border-top:1px solid #E0DDD4;margin:0 0 16px">
  ${notice}${body}
</div>`;
}
