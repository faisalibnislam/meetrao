import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { convexServes } from "@/lib/backend";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/**
 * The schedule picker's options, with "Default" first.
 *
 * An empty value means NULL on meeting_types.schedule_id — follow whichever
 * schedule is the default, now and whenever it changes. That is a different
 * promise from pinning to the schedule that happens to be default today, so it
 * gets its own entry rather than being folded into the named list.
 */
export async function scheduleOptions(userId: string): Promise<{ value: string; label: string }[]> {
  const rows = convexServes("schedules") ? await fromConvex(userId) : await fromSupabase(userId);
  const fallback = rows.find((r) => r.is_default);

  return [
    { value: "", label: fallback ? `Default (${fallback.name})` : "Default schedule" },
    ...rows.map((r) => ({ value: r.id, label: r.name })),
  ];
}

type Row = { id: string; name: string; is_default: boolean };

async function fromConvex(userId: string): Promise<Row[]> {
  const convex = await convexServer();
  // Convex returns them default-first, created-order after — the same ordering
  // the two .order() clauses below produce.
  return await convex.query(api.availability.listSchedules, { userId });
}

async function fromSupabase(userId: string): Promise<Row[]> {
  const { data } = await supabaseAdmin()
    .from("availability_schedules")
    .select("id, name, is_default")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at");
  return (data ?? []) as Row[];
}
