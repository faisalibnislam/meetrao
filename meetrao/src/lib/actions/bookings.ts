"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { cancellationMail } from "@/lib/email/booking-mail";
import { sendCancellationToGuest, sendCancellationToHost } from "@/lib/email/send";
import { CalendarError, deleteBookingEvent, deleteEventForBooking } from "@/lib/google/calendar";
import { supabaseServer } from "@/lib/supabase/server";
import { convexServes } from "@/lib/backend";
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
  const onConvex = convexServes("bookings");
  const supabase = onConvex ? null : await supabaseServer();

  let booking: Booking;
  let invitees: { name: string; email: string }[] = [];

  if (onConvex) {
    const convex = await convexServer();
    const existing = await convex.query(api.bookings.getForHost, { id: bookingId });
    if (!existing) return { error: "That booking is not yours to cancel." };

    booking = existing as unknown as Booking;
    invitees = existing.invitees.map((i) => ({ name: i.name, email: i.email }));
    if (booking.status === "cancelled") return {};

    try {
      await convex.mutation(api.bookings.cancelAsHost, { id: bookingId });
    } catch (cause) {
      return { error: convexMessage(cause, "That booking could not be cancelled.") };
    }
  } else {
    const { data: existing } = await supabase!
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("host_id", session.userId)
      .maybeSingle();

    if (!existing) return { error: "That booking is not yours to cancel." };

    booking = existing as Booking;
    if (booking.status === "cancelled") return {};

    const { error } = await supabase!
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: "host",
      })
      .eq("id", bookingId)
      .eq("host_id", session.userId);

    if (error) return { error: error.message };
  }

  let calendarWarning: string | undefined;
  if (booking.google_event_id) {
    try {
      if (convexServes("google")) {
        const outcome = await deleteEventForBooking(booking.reference);
        if (outcome !== "ok" && outcome !== "already-deleted") throw new CalendarError(outcome, "Google refused the removal.");
      } else {
        await deleteBookingEvent(session.userId, booking.google_event_id);
      }
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
  if (!onConvex) {
    const { data: extra } = await supabase!
      .from("booking_invitees")
      .select("name, email")
      .eq("booking_id", bookingId);
    invitees = (extra ?? []) as { name: string; email: string }[];
  }

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
