"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cancelBooking } from "@/lib/booking/service";

export async function cancelBookingAsHost(
  bookingId: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are signed out." };

  const result = await cancelBooking({
    bookingId,
    by: "host",
    actorId: user.id,
  });

  if (result.ok) refresh();
  return result;
}

/**
 * Guest-side cancellation. The 32-hex reference is the guest's only
 * credential, so it is the whole authorisation check.
 */
export async function cancelBookingAsGuest(
  reference: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!/^[0-9a-f]{32}$/.test(reference)) {
    return { ok: false, message: "That booking could not be found." };
  }

  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = createAdminClient();

  const { data } = await admin
    .from("bookings")
    .select("id")
    .eq("reference", reference)
    .maybeSingle();

  if (!data) return { ok: false, message: "That booking could not be found." };

  const result = await cancelBooking({ bookingId: data.id, by: "guest" });
  if (result.ok) refresh();
  return result;
}
