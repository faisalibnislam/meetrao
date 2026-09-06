"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TIMEZONES } from "@/lib/timezones";

export type DayRange = { start: number; end: number };
export type WeeklyAvailability = Record<number, DayRange[]>;

export type SaveResult = { ok: boolean; message?: string };

const VALID_ZONES = new Set<string>(TIMEZONES);

function validate(weekly: WeeklyAvailability): string | null {
  for (const [weekdayKey, ranges] of Object.entries(weekly)) {
    const weekday = Number(weekdayKey);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return "That is not a valid day.";
    }
    for (const range of ranges) {
      if (
        !Number.isInteger(range.start) ||
        !Number.isInteger(range.end) ||
        range.start < 0 ||
        range.end > 1440
      ) {
        return "Those hours are outside a day.";
      }
      if (range.end <= range.start) {
        return "Each range has to end after it starts.";
      }
    }
  }
  return null;
}

/**
 * Replaces the whole weekly schedule. A day absent from `weekly` (or with no
 * ranges) is unavailable — which is exactly how the editor models a day that
 * has been switched off.
 */
export async function saveAvailability(
  weekly: WeeklyAvailability,
  timezone: string,
): Promise<SaveResult> {
  const problem = validate(weekly);
  if (problem) return { ok: false, message: problem };

  if (!VALID_ZONES.has(timezone)) {
    return { ok: false, message: "Pick a timezone from the list." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are signed out." };

  const rows = Object.entries(weekly).flatMap(([weekday, ranges]) =>
    ranges.map((range) => ({
      user_id: user.id,
      weekday: Number(weekday),
      start_minute: range.start,
      end_minute: range.end,
    })),
  );

  // Delete-then-insert under the user's own RLS. Not a transaction, so a
  // failure between the two leaves the host with no hours — recoverable by
  // saving again, and far simpler than diffing rows.
  const { error: deleteError } = await supabase
    .from("availability_rules")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) return { ok: false, message: "Could not save those hours." };

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("availability_rules")
      .insert(rows);
    if (insertError) return { ok: false, message: "Could not save those hours." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ timezone })
    .eq("id", user.id);
  if (profileError) return { ok: false, message: "Could not save your timezone." };

  // Host pages are dynamic (they read the session cookie), so there is no
  // route cache to bust — what needs refreshing is the client router tree.
  refresh();
  return { ok: true };
}
