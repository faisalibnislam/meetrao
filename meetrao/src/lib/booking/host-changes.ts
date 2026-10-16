import "server-only";

import type { ConvexHttpClient } from "convex/browser";
import { zonedInstant } from "@/lib/booking/slots";
import { cancellationMail, rescheduleMail } from "@/lib/email/booking-mail";
import { sendCancellationToGuest, sendCancellationToHost, sendRescheduled } from "@/lib/email/send";
import { CalendarError, deleteEventForBooking, updateEventForBooking } from "@/lib/google/calendar";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";
import type { Booking, Profile } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────────────────────
   A host cancelling or moving their own booking, wherever they did it from.

   The web's server actions and the iOS app's API routes both call these, so
   the two cannot drift: the same order (the booking, then the calendar, then
   the mail), the same refusals, and everyone who was told about the meeting
   is told what happened to it. Each caller brings its own way of proving who
   the host is; by the time anything here runs, `convex` is authenticated as
   that host and `profile` is theirs.
   ───────────────────────────────────────────────────────────────────────────── */

export type ChangeResult = { error?: string; calendarWarning?: string };

/**
 * Host-side reschedule. The new time arrives as a calendar date and minutes
 * into that day, and becomes an instant HERE, against the host's own zone:
 * the host's screens only ever show their own wall clock, and a device in
 * another zone would otherwise move the meeting by its offset.
 *
 * The host's own hours are not consulted, exactly as when the host creates a
 * meeting. A clash with another booking still refuses.
 */
export async function moveAsHost(
  convex: ConvexHttpClient,
  profile: Profile,
  bookingId: string,
  date: string,
  time: number,
): Promise<ChangeResult> {
  const existing = await convex.query(api.bookings.getForHost, { id: bookingId });
  if (!existing) return { error: "That booking is not yours to move." };

  const before = existing as unknown as Booking;
  if (before.status === "cancelled") return { error: "That meeting has been cancelled." };

  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return { error: "Pick a date." };
  if (!Number.isInteger(time) || time < 0 || time > 1439) return { error: "Pick a time." };

  const when = zonedInstant({ year, month, day }, time, profile.timezone);
  if (when.getTime() < Date.now()) return { error: "That time has already passed." };

  let moved: { booking: Booking; old_starts_at: string };
  try {
    moved = (await convex.mutation(api.bookings.rescheduleAsHost, {
      id: bookingId,
      startsAt: when.getTime(),
    })) as unknown as { booking: Booking; old_starts_at: string };
  } catch (cause) {
    const message = convexMessage(cause, "That meeting could not be moved.");
    // The one refusal worth rewording: "slot taken" is Convex's vocabulary.
    return { error: /slot taken/i.test(message) ? "You already have a meeting then." : message };
  }

  let calendarWarning: string | undefined;
  if (before.google_event_id) {
    const outcome = await updateEventForBooking(before.reference);
    if ("failure" in outcome) {
      calendarWarning = "The meeting has moved, but Google Calendar did not confirm the new time.";
    }
  }

  const mail = rescheduleMail(moved.booking, profile, "host", moved.old_starts_at);
  const invitees = existing.invitees
    .map((i) => ({ name: i.name, email: i.email }))
    .filter((i) => i.email.toLowerCase() !== before.guest_email.toLowerCase());

  // Everyone who was told about the old time is told about the new one.
  await Promise.allSettled([
    sendRescheduled(mail, "host", profile),
    sendRescheduled(mail, "guest", null),
    ...invitees.map((i) =>
      sendRescheduled({ ...mail, guestName: i.name || i.email, guestEmail: i.email }, "guest", null),
    ),
  ]);

  return { calendarWarning };
}

/**
 * Host-side cancellation. The booking is marked cancelled first, then the
 * calendar event goes, then everyone is told. A calendar or email failure
 * after the write leaves a cancelled booking and a warning, never a booking
 * that looks cancelled to one side and live to the other.
 */
export async function cancelAsHost(
  convex: ConvexHttpClient,
  profile: Profile,
  bookingId: string,
): Promise<ChangeResult> {
  const existing = await convex.query(api.bookings.getForHost, { id: bookingId });
  if (!existing) return { error: "That booking is not yours to cancel." };

  const booking = existing as unknown as Booking;
  const invitees = existing.invitees.map((i) => ({ name: i.name, email: i.email }));
  if (booking.status === "cancelled") return {};

  try {
    await convex.mutation(api.bookings.cancelAsHost, { id: bookingId });
  } catch (cause) {
    return { error: convexMessage(cause, "That booking could not be cancelled.") };
  }

  let calendarWarning: string | undefined;
  if (booking.google_event_id) {
    try {
      const outcome = await deleteEventForBooking(booking.reference);
      if (outcome !== "ok" && outcome !== "already-deleted") throw new CalendarError(outcome, "Google refused the removal.");
    } catch (cause) {
      // An event that is already gone is not a problem worth reporting.
      if (cause instanceof CalendarError && cause.kind !== "already-deleted") {
        calendarWarning = "The booking is cancelled, but Google Calendar did not confirm the removal.";
      }
    }
  }

  const mail = cancellationMail(booking, profile, "host");

  // Every invitee, not just the guest of record. A meeting the host scheduled
  // for three people that only tells one of them it is cancelled leaves two
  // sitting in an empty Meet.
  const others = invitees.filter((i) => i.email.toLowerCase() !== booking.guest_email.toLowerCase());

  await Promise.allSettled([
    sendCancellationToHost(mail, profile),
    sendCancellationToGuest(mail),
    ...others.map((i) =>
      sendCancellationToGuest({ ...mail, guestName: i.name || i.email, guestEmail: i.email }),
    ),
  ]);

  return { calendarWarning };
}
