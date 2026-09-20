import { internalQuery } from "./_generated/server";

/** Migration-only: row counts for reconciling against Postgres. */
export const counts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "profiles", "meeting_types", "availability_schedules", "availability_rules", "bookings",
      "booking_invitees", "contacts", "notifications", "calendar_connections", "booking_page_views",
      "site_visits", "admin_activity", "platform_settings", "bootstrap_admins", "reserved_usernames",
    ] as const;
    const out: Record<string, number> = {};
    for (const t of tables) out[t] = (await ctx.db.query(t).collect()).length;
    return out;
  },
});
