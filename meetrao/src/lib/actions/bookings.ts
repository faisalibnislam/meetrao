"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { cancellationMail } from "@/lib/email/booking-mail";
import { sendCancellationToGuest, sendCancellationToHost } from "@/lib/email/send";
import { CalendarError, deleteEventForBooking } from "@/lib/google/calendar";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";
import type { Booking } from "@/lib/types";

export type CancelResult = { error?: string; calendarWarning?: string };

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
