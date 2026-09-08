"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { cancellationMail } from "@/lib/email/booking-mail";
import { sendCancellationToGuest, sendCancellationToHost } from "@/lib/email/send";
import { CalendarError, deleteBookingEvent } from "@/lib/google/calendar";
import { supabaseServer } from "@/lib/supabase/server";
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
  const supabase = await supabaseServer();

  const { data: existing } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("host_id", session.userId)
    .maybeSingle();

  if (!existing) return { error: "That booking is not yours to cancel." };

  const booking = existing as Booking;
  if (booking.status === "cancelled") return {};

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: "host",
    })
    .eq("id", bookingId)
    .eq("host_id", session.userId);

  if (error) return { error: error.message };

  let calendarWarning: string | undefined;
  if (booking.google_event_id) {
    try {
      await deleteBookingEvent(session.userId, booking.google_event_id);
    } catch (cause) {
      // An event that is already gone is not a problem worth reporting.
      if (cause instanceof CalendarError && cause.kind !== "already-deleted") {
        calendarWarning = "The booking is cancelled, but Google Calendar did not confirm the removal.";
      }
    }
  }

  const mail = cancellationMail(booking, session.profile, "host");
  await Promise.allSettled([
    sendCancellationToHost(mail, session.profile),
    sendCancellationToGuest(mail),
  ]);

  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  return { calendarWarning };
}
