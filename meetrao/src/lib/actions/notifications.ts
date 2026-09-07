"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./profile";

/**
 * The five switches on Settings › Notifications.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THESE GATE HOST EMAIL ONLY.
 *
 * Guest-facing mail — booking confirmations, cancellation notices, email
 * verification and password resets — is transactional. It is sent because
 * someone took an action that requires a reply, not because the host opted in,
 * and it must NEVER be suppressed by any flag here. A guest who books a meeting
 * and receives nothing has no way to find their booking again.
 *
 * So when sending is built, read these only on the host's copy of a message,
 * and never let them reach the guest's. The panel's own footnote makes the same
 * promise to the host in as many words.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Nothing sends email yet — this stores and reads the preferences only.
 */
export type NotificationPreferences = {
  newBooking: boolean;
  bookingChanged: boolean;
  bookingCancelled: boolean;
  dailyAgenda: boolean;
  productNews: boolean;
};

export async function updateNotificationPreferences(
  input: NotificationPreferences,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are signed out." };

  const { error } = await supabase
    .from("profiles")
    .update({
      notify_new_booking: input.newBooking,
      notify_booking_changed: input.bookingChanged,
      notify_booking_cancelled: input.bookingCancelled,
      notify_daily_agenda: input.dailyAgenda,
      notify_product_news: input.productNews,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, message: "Could not save those preferences." };
  }

  refresh();
  return { ok: true };
}
