import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Profile = Tables<"profiles">;
export type MeetingType = Tables<"meeting_types">;
export type Booking = Tables<"bookings">;
export type AvailabilityRule = Tables<"availability_rules">;

/**
 * The signed-in host's profile. `cache` dedupes it across the layout and every
 * page in a single render pass.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
});

/** Profile or bust — for pages behind the middleware's auth gate. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.is_admin) redirect("/dashboard");
  return profile;
}

/**
 * Every query below filters by the signed-in user EXPLICITLY, rather than
 * leaning on row level security to do the scoping.
 *
 * That is not belt-and-braces, it is load-bearing. Admins hold a second,
 * platform-wide SELECT policy on these tables (`meeting_types_select_admin`
 * and friends, migration 0003) so the /admin area can read across accounts.
 * Postgres ORs policies together, so for an admin an unfiltered select returns
 * EVERY host's rows — their own Meetings, Bookings and Availability pages would
 * quietly fill up with other people's data, guest names and addresses included.
 *
 * The rule for this file: it serves the *host* surface, so it always says whose
 * rows it wants. Cross-account reads belong in the admin data layer.
 */
async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export const getMeetingTypes = cache(async (): Promise<MeetingType[]> => {
  const userId = await currentUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("meeting_types")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return data ?? [];
});

export const getAvailability = cache(async (): Promise<AvailabilityRule[]> => {
  const userId = await currentUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("user_id", userId)
    .order("weekday", { ascending: true })
    .order("start_minute", { ascending: true });
  return data ?? [];
});

export const getBookings = cache(async (): Promise<Booking[]> => {
  const userId = await currentUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("host_id", userId)
    .order("starts_at", { ascending: true });
  return data ?? [];
});

/** Split the host's bookings the way the dashboard and Bookings tabs need. */
export function partitionBookings(bookings: Booking[], now: Date) {
  const upcoming = bookings
    .filter((b) => new Date(b.starts_at) >= now && b.status === "confirmed")
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const past = bookings
    .filter((b) => new Date(b.starts_at) < now || b.status === "cancelled")
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));

  return { upcoming, past };
}
