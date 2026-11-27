"use server";

import { redirect } from "next/navigation";
import { cancellationMail } from "@/lib/email/booking-mail";
import { sendCancellationToGuest, sendCancellationToHost } from "@/lib/email/send";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import type { Booking } from "@/lib/types";

/**
 * Guest cancellation, from the confirmation screen or an emailed link.
 *
 * A POST, never a GET: mail clients and link previewers fetch every URL in an
 * email, and a GET here would cancel meetings nobody meant to cancel.
 */
export async function cancelAsGuest(formData: FormData): Promise<void> {
  const reference = String(formData.get("reference") ?? "");
  if (!reference) redirect("/");

  let wasOpen = false;
  let booking: Booking | null = null;
  try {
    const r = await convexAnonymous().mutation(api.publicBooking.cancelByReference, { reference });
    wasOpen = r.was_open;
    booking = r.booking as unknown as Booking;
  } catch {
    redirect("/");
  }

  /* Already cancelled: show the same screen rather than an error. Cancelling
     twice is not a failure from the guest's side, only the first time should
     send mail (which carries the calendar cancellation). */
  if (wasOpen && booking) {
    const host = await convexAnonymous().query(api.publicBooking.hostForCancellationMail, {
      reference,
    });
    if (host) {
      const mail = cancellationMail(booking, host, "guest");
      await Promise.allSettled([sendCancellationToHost(mail, host), sendCancellationToGuest(mail)]);
    }
  }

  redirect(`/booking/${reference}/cancelled`);
}
