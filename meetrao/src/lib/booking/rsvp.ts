import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { hasServiceRole, siteUrl } from "@/lib/env";
import {
  CalendarNotConnectedError,
  fetchGuestRsvp,
  type GuestRsvp,
} from "@/lib/google/calendar";
import { sendAndLog } from "@/lib/email/send";
import { formatLongDate, formatTimeRange } from "./time";

/**
 * The guest's RSVP on the host's Google event.
 *
 * DECIDED (handoff open question 3): a decline NOTIFIES the host and does not
 * cancel the booking. Declining in a calendar client is not the same act as
 * cancelling — the host may still want to hold the slot, and Meetrao's own
 * cancel flow is the only thing that frees it and tells the other party.
 *
 * There is no push subscription, so this is a pull: it runs when the host
 * looks at their bookings. `guest_rsvp_synced_at` throttles it so opening the
 * list repeatedly does not hammer Google.
 */
const SYNC_INTERVAL_MS = 5 * 60_000;

export type RsvpState = GuestRsvp | null;

/** How the booking detail dialog labels each state. */
export const RSVP_LABEL: Record<GuestRsvp, string> = {
  needsAction: "Not responded yet",
  accepted: "Accepted",
  declined: "Declined in Google",
  tentative: "Maybe",
};

type BookingRow = {
  id: string;
  host_id: string;
  google_event_id: string | null;
  guest_email: string;
  guest_name: string;
  meeting_name: string;
  starts_at: string;
  ends_at: string;
  guest_rsvp: string | null;
  guest_rsvp_synced_at: string | null;
  guest_rsvp_notified_at: string | null;
};

const SELECT =
  "id, host_id, google_event_id, guest_email, guest_name, meeting_name, starts_at, ends_at, guest_rsvp, guest_rsvp_synced_at, guest_rsvp_notified_at";

/**
 * Read the RSVP back from Google and store it, notifying the host the first
 * time a decline appears. Returns the current state.
 *
 * Best-effort throughout: this is decoration on a booking that already exists,
 * so every failure path returns what is already stored rather than throwing
 * into a page render.
 */
export async function syncGuestRsvp(bookingId: string): Promise<RsvpState> {
  if (!hasServiceRole()) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select(SELECT)
    .eq("id", bookingId)
    .maybeSingle();

  const booking = data as BookingRow | null;
  if (!booking) return null;

  const stored = (booking.guest_rsvp as RsvpState) ?? null;

  // No event means the calendar was never connected for this booking; there is
  // nothing to read an RSVP from.
  if (!booking.google_event_id) return stored;

  const syncedAt = booking.guest_rsvp_synced_at
    ? new Date(booking.guest_rsvp_synced_at).getTime()
    : 0;
  if (Date.now() - syncedAt < SYNC_INTERVAL_MS) return stored;

  let fresh: RsvpState;
  try {
    fresh = await fetchGuestRsvp(
      booking.host_id,
      booking.google_event_id,
      booking.guest_email,
    );
  } catch (cause) {
    // A disconnected or rejected calendar is expected here and is already
    // recorded by the calendar layer, which flags the connection for
    // re-consent. Keep whatever was last known.
    if (!(cause instanceof CalendarNotConnectedError)) {
      console.error("[rsvp] could not read the guest's response", {
        bookingId,
        error: cause instanceof Error ? cause.message : cause,
      });
    }
    return stored;
  }

  await admin
    .from("bookings")
    .update({
      guest_rsvp: fresh,
      guest_rsvp_synced_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  // Tell the host once, the first time a decline shows up.
  if (fresh === "declined" && !booking.guest_rsvp_notified_at) {
    await notifyHostOfDecline(booking);
    await admin
      .from("bookings")
      .update({ guest_rsvp_notified_at: new Date().toISOString() })
      .eq("id", booking.id);
  }

  return fresh;
}

/**
 * The design ships six templates and none of them covers a decline, so this is
 * a deliberately plain message rather than an invented seventh. It says what
 * happened and, importantly, that the booking still stands.
 */
async function notifyHostOfDecline(booking: BookingRow): Promise<void> {
  const admin = createAdminClient();
  const { data: host } = await admin
    .from("profiles")
    .select("email, timezone, notify_booking_changed")
    .eq("id", booking.host_id)
    .maybeSingle();

  if (!host?.email) return;
  // Closest existing preference: a decline is a change to a booking, not a new
  // one and not a cancellation.
  if (host.notify_booking_changed === false) return;

  const zone = host.timezone || "UTC";
  const when = `${formatLongDate(new Date(booking.starts_at), zone)} · ${formatTimeRange(
    new Date(booking.starts_at),
    new Date(booking.ends_at),
    zone,
  )}`;

  const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  await sendAndLog("guest-declined", {
    to: host.email,
    replyTo: booking.guest_email,
    subject: `Declined in Google: ${booking.meeting_name} — ${esc(booking.guest_name)}`,
    html: [
      '<div style="font:14px/1.6 Arial,sans-serif;color:#1A1917">',
      `<p>${esc(booking.guest_name)} declined the calendar invitation for <strong>${esc(booking.meeting_name)}</strong> on ${esc(when)}.</p>`,
      "<p><strong>The booking is still in Meetrao and the slot is still held.</strong> Declining in Google does not cancel it — if the meeting is off, cancel it here so the time is released and your guest is told:</p>",
      `<p><a href="${siteUrl("/bookings")}" style="color:#14554A">View your bookings</a></p>`,
      "</div>",
    ].join(""),
    idempotencyKey: `booking:${booking.id}:declined:host`,
  });
}
