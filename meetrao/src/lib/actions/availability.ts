"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { supabaseServer } from "@/lib/supabase/server";
import { TIMEZONES } from "@/lib/timezones";

export type SaveResult = { error?: string };

type Rule = { weekday: number; start_minute: number; end_minute: number };

function valid(rules: Rule[]): string | null {
  for (const r of rules) {
    if (r.weekday < 0 || r.weekday > 6) return "That day is not a day of the week.";
    if (r.start_minute < 0 || r.end_minute > 1440) return "Hours have to sit inside a single day.";
    if (r.end_minute <= r.start_minute) return "Each range has to end after it starts.";
  }

  // Overlapping ranges on one day would offer the same slot twice.
  for (let d = 0; d <= 6; d++) {
    const day = rules.filter((r) => r.weekday === d).sort((a, b) => a.start_minute - b.start_minute);
    for (let i = 1; i < day.length; i++) {
      if (day[i].start_minute < day[i - 1].end_minute) return "Two ranges on the same day overlap.";
    }
  }
  return null;
}

/** The whole week is replaced in one transaction — a partial save is not a state. */
export async function saveAvailability(input: {
  timezone: string;
  rules: Rule[];
}): Promise<SaveResult> {
  const session = await requireSession();

  if (!TIMEZONES.includes(input.timezone as (typeof TIMEZONES)[number])) {
    return { error: "Pick a timezone from the list." };
  }

  const problem = valid(input.rules);
  if (problem) return { error: problem };

  const supabase = await supabaseServer();

  const { error: tzError } = await supabase
    .from("profiles")
    .update({ timezone: input.timezone })
    .eq("id", session.userId);
  if (tzError) return { error: tzError.message };

  const { error: clearError } = await supabase
    .from("availability_rules")
    .delete()
    .eq("user_id", session.userId);
  if (clearError) return { error: clearError.message };

  if (input.rules.length) {
    const { error } = await supabase
      .from("availability_rules")
      .insert(input.rules.map((r) => ({ ...r, user_id: session.userId })));
    if (error) return { error: error.message };
  }

  revalidatePath("/availability");
  revalidatePath("/dashboard");
  return {};
}
