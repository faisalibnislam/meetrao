import "server-only";

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
  const convex = await convexServer();
  // Returned default-first, then in creation order.
  const rows = await convex.query(api.availability.listSchedules, { userId });
  const fallback = rows.find((r) => r.is_default);

  return [
    { value: "", label: fallback ? `Default (${fallback.name})` : "Default schedule" },
    ...rows.map((r) => ({ value: r.id, label: r.name })),
  ];
}
