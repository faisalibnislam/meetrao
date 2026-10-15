"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { cancelAsHost, moveAsHost, type ChangeResult } from "@/lib/booking/host-changes";

/* The web's half of a host cancelling or moving a booking: who the host is
   comes from the session cookie, and the work itself is shared with the iOS
   app's API routes in src/lib/booking/host-changes.ts. */

export type CancelResult = ChangeResult;

export type MoveResult = ChangeResult;

export async function rescheduleBooking(bookingId: string, date: string, time: number): Promise<MoveResult> {
  const session = await requireSession();
  const result = await moveAsHost(await convexServer(), session.profile, bookingId, date, time);
  if (!result.error) {
    revalidatePath("/bookings");
    revalidatePath("/dashboard");
  }
  return result;
}

export async function cancelBooking(bookingId: string): Promise<CancelResult> {
  const session = await requireSession();
  const result = await cancelAsHost(await convexServer(), session.profile, bookingId);
  if (!result.error) {
    revalidatePath("/bookings");
    revalidatePath("/dashboard");
  }
  return result;
}
