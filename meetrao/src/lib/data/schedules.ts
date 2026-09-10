import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * The schedule picker's options, with "Default" first.
 *
 * An empty value means NULL on meeting_types.schedule_id — follow whichever
 * schedule is the default, now and whenever it changes. That is a different
 * promise from pinning to the schedule that happens to be default today, so it
 * gets its own entry rather than being folded into the named list.
 */
export async function scheduleOptions(userId: string): Promise<{ value: string; label: string }[]> {
  const { data } = await supabaseAdmin()
    .from("availability_schedules")
    .select("id, name, is_default")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at");

  const rows = (data ?? []) as { id: string; name: string; is_default: boolean }[];
  const fallback = rows.find((r) => r.is_default);

  return [
    { value: "", label: fallback ? `Default (${fallback.name})` : "Default schedule" },
    ...rows.map((r) => ({ value: r.id, label: r.name })),
  ];
}
