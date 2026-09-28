"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { zonedInstant } from "@/lib/booking/slots";
import { cancellationMail, rescheduleMail } from "@/lib/email/booking-mail";
import { sendCancellationToGuest, sendCancellationToHost, sendRescheduled } from "@/lib/email/send";
import { CalendarError, deleteEventForBooking, updateEventForBooking } from "@/lib/google/calendar";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";
import type { Booking } from "@/lib/types";

export type CancelResult = { error?: string; calendarWarning?: string };

export type MoveResult = { error?: string; calendarWarning?: string };

/**
 * Host-side reschedule. Same ordering as cancellation, and for the same
 * reason: the booking moves first, then the calendar event, then the mail.
 *
 * The host's own hours are not consulted — Convex does not check them for a
 * host moving their own meeting, exactly as it does not when the host creates
 * one. A clash with another booking still refuses.
 *
 * The new time arrives as a calendar date and minutes into that day, and is
 * turned into an instant HERE, against the host's own timezone — the same
 * conversion `scheduleMeeting` does, and for the same reason: the host's
 * screen only ever shows their own wall clock, and a browser in another zone
 * would otherwise move the meeting by its offset.
 */
export async function rescheduleBooking(
  bookingId: string,
  date: string,
  time: number,
): Promise<MoveResult> {
  const session = await requireSession();
  const convex = await convexServer();

  const existing = await convex.query(api.bookings.getForHost, { id: bookingId });
  if (!existing) return { error: "That booking is not yours to move." };

  const before = existing as unknown as Booking;
  if (before.status === "cancelled") return { error: "That meeting has been cancelled." };

  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return { error: "Pick a date." };
  if (!Number.isInteger(time) || time < 0 || time > 1439) return { error: "Pick a time." };

  const when = zonedInstant({ year, month, day }, time, session.profile.timezone);
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

  const mail = rescheduleMail(moved.booking, session.profile, "host", moved.old_starts_at);
  const invitees = existing.invitees
    .map((i) => ({ name: i.name, email: i.email }))
    .filter((i) => i.email.toLowerCase() !== before.guest_email.toLowerCase());

  // Everyone who was told about the old time is told about the new one.
  await Promise.allSettled([
    sendRescheduled(mail, "host", session.profile),
    sendRescheduled(mail, "guest", null),
    ...invitees.map((i) =>
      sendRescheduled({ ...mail, guestName: i.name || i.email, guestEmail: i.email }, "guest", null),
    ),
  ]);

  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  return { calendarWarning };
}

/**
 * Host-side cancellation.
 *
 * Order matters: the booking is marked cancelled first, then the calendar event
 * is removed, then both parties are told. A calendar or email failure after the
 * write leaves a cancelled booking and a warning — never a booking that looks
 * cancelled to one side and live to the other.
 */
export async function cancelBooking(bookingId: string): Promise<CancelResult> {
  const session = await requireSession();
  const convex = await convexServer();
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

  const mail = cancellationMail(booking, session.profile, "host");

  // Every invitee, not just the guest of record. A meeting the host scheduled
  // for three people that only tells one of them it is cancelled leaves two
  // sitting in an empty Meet — the failure this feature would otherwise add.
  const others = invitees.filter((i) => i.email.toLowerCase() !== booking.guest_email.toLowerCase());

  await Promise.allSettled([
    sendCancellationToHost(mail, session.profile),
    sendCancellationToGuest(mail),
    ...others.map((i) =>
      sendCancellationToGuest({ ...mail, guestName: i.name || i.email, guestEmail: i.email }),
    ),
  ]);

  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  return { calendarWarning };
}
