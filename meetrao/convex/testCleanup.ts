import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Removes bookings made by a verification script, and the rows their effects
 * created. Internal only — not reachable from any client.
 *
 * Kept in the repo because the alternative is a harness that leaves debris,
 * and a harness that leaves debris gets switched off.
 */
export const purgeByReferences = internalMutation({
  args: {
    references: v.array(v.string()),
    emailPrefix: v.string(),
    /** Substrings identifying activity rows the harness caused. */
    summaryContains: v.optional(v.array(v.string())),
  },
  handler: async (ctx, a) => {
    let bookings = 0, invitees = 0, notifications = 0, contacts = 0, activity = 0, limits = 0;

    for (const ref of a.references) {
      const b = await ctx.db.query("bookings").withIndex("by_reference", (q) => q.eq("reference", ref)).unique();
      if (!b) continue;

      for (const i of await ctx.db.query("booking_invitees").withIndex("by_booking", (q) => q.eq("booking_id", b.id)).collect()) {
        await ctx.db.delete(i._id); invitees++;
      }
      for (const n of await ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("user_id", b.host_id)).collect()) {
        if (n.booking_id === b.id) { await ctx.db.delete(n._id); notifications++; }
      }
      await ctx.db.delete(b._id); bookings++;
    }

    // Contacts and activity rows are keyed by the test email prefix rather than
    // the booking, because upsert_contact may have merged several into one.
    for (const c of await ctx.db.query("contacts").collect()) {
      if (c.email.startsWith(a.emailPrefix)) { await ctx.db.delete(c._id); contacts++; }
    }
    for (const act of await ctx.db.query("admin_activity").withIndex("by_created").order("desc").take(500)) {
      const needles = a.summaryContains ?? [];
      if (needles.some((n) => act.summary.includes(n))) { await ctx.db.delete(act._id); activity++; }
    }
    for (const r of await ctx.db.query("rate_limits").collect()) {
      if (r.key.includes(a.emailPrefix)) { await ctx.db.delete(r._id); limits++; }
    }

    return { bookings, invitees, notifications, contacts, activity, limits };
  },
});

/** Removes site_visits a verification script inserted, by visitor_hash. */
export const purgeVisits = internalMutation({
  args: { visitorHash: v.string() },
  handler: async (ctx, a) => {
    const rows = await ctx.db.query("site_visits").withIndex("by_hash", (q) => q.eq("visitor_hash", a.visitorHash)).collect();
    for (const r of rows) await ctx.db.delete(r._id);
    return rows.length;
  },
});
