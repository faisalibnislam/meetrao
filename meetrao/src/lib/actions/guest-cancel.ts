"use server";

import { redirect } from "next/navigation";
import { cancellationMail } from "@/lib/email/booking-mail";
import { sendCancellationToGuest, sendCancellationToHost } from "@/lib/email/send";
import { CalendarError, deleteBookingEvent } from "@/lib/google/calendar";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Booking, Profile } from "@/lib/types";

/**
 * Guest cancellation, from the confirmation screen or an emailed link.
 *
 * A POST, never a GET: mail clients and link previewers fetch every URL in an
 * email, and a GET here would cancel meetings nobody meant to cancel.
 */
export async function cancelAsGuest(formData: FormData): Promise<void> {
  const reference = String(formData.get("reference") ?? "");
  if (!reference) redirect("/");

  const admin = supabaseAdmin();

  const { data, error } = await admin.rpc("cancel_booking_by_reference", { p_reference: reference });
  if (error) redirect("/");

  const result = (Array.isArray(data) ? data[0] : data) as { id: string; was_open: boolean } | undefined;
  if (!result) redirect("/");

  // Already cancelled: show the same screen rather than an error. Cancelling
  // twice is not a failure from the guest's side.
  if (result.was_open) {
    const { data: row } = await admin.from("bookings").select("*").eq("id", result.id).maybeSingle();
    const booking = row as Booking | null;

    if (booking) {
      const { data: hostRow } = await admin
        .from("profiles")
        .select("full_name, username, email, timezone, notify_booking_cancelled")
        .eq("id", booking.host_id)
        .maybeSingle();

      const host = hostRow as Pick<
        Profile,
        "full_name" | "username" | "email" | "timezone" | "notify_booking_cancelled"
      > | null;

      if (booking.google_event_id) {
        try {
          await deleteBookingEvent(booking.host_id, booking.google_event_id);
        } catch (cause) {
          // Already gone is fine; anything else is logged and the cancellation
          // still stands — the guest is not made to try again.
          if (!(cause instanceof CalendarError) || cause.kind !== "already-deleted") {
            console.error("calendar delete failed", cause);
          }
        }
      }

      if (host) {
        const mail = cancellationMail(booking, host, "guest");
        await Promise.allSettled([sendCancellationToHost(mail, host), sendCancellationToGuest(mail)]);
      }
    }
  }

  redirect(`/booking/${reference}/cancelled`);
}
