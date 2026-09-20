import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

/* ─────────────────────────────────────────────────────────────────────────────
   Read-only diagnostics for the check scripts in scripts/.

   ALL internalQuery, which is the point: none of this is reachable from a
   browser, from the website, or from any client holding any key we publish.
   The only caller is `npx convex run`, which needs a deploy key.

   The scripts used to get privileged reads by talking to Postgres with the
   service-role key. There is no such key any more — Convex has no ambient
   admin client — so the reads they legitimately need live here instead, named
   and enumerated, rather than as a general back door.
   ───────────────────────────────────────────────────────────────────────────── */

/** Row counts. Was for reconciling against Postgres; now a smoke check. */
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

export const visitKeys = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("site_visits").collect();
    return rows.map((r) => `${r.visited_at}|${r.visitor_hash}|${r.path}`);
  },
});

/**
 * Hosts a check script may act against, oldest first.
 *
 * The scripts DISCOVER their host rather than naming one:
 * src/lib/contact-address.test.ts forbids a real identity appearing in the
 * source, and hardcoding a username tripped it — correctly.
 */
export const hosts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("profiles").collect();
    return rows
      .filter((p) => !p.is_suspended)
      .sort((a, b) => a.created_at - b.created_at)
      .map((p) => ({ id: p.id, username: p.username, email: p.email, timezone: p.timezone }));
  },
});

/**
 * What the booking triggers should have written, for one host.
 *
 * The equivalent of the host reading their own notifications and contacts,
 * without a session — the scripts have no way to mint one now that magic
 * links are gone, and these two counts are all they ever wanted from it.
 */
export const effectsFor = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, a) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", a.userId))
      .collect();
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_user", (q) => q.eq("user_id", a.userId))
      .collect();
    return {
      notifications: notifications.length,
      contacts: contacts.length,
      newestNotificationTitle:
        notifications.sort((x, y) => y.created_at - x.created_at)[0]?.title ?? null,
    };
  },
});
