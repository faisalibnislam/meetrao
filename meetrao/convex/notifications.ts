import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireProfile, assertOwnerOrAdmin, AuthError } from "./lib/auth";
import { notificationOut } from "./lib/serialize";

export const listOwn = query({
  args: { unreadOnly: v.optional(v.boolean()), limit: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    let rows = a.unreadOnly
      ? await ctx.db.query("notifications").withIndex("by_user_unread", (q) => q.eq("user_id", me.id).eq("read_at", null)).collect()
      : await ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("user_id", me.id)).collect();
    rows.sort((x, y) => y.created_at - x.created_at);
    if (a.limit) rows = rows.slice(0, a.limit);

    /* Which workspace each one belongs to. Notifications are the person's,
       not a workspace's, so a company booking's news shows in Personal too;
       without this, View sent them to a bookings list that does not have
       that booking in it. One read per distinct booking and company, all in
       parallel, so this stays a single round trip for the page. */
    const bookingIds = [...new Set(rows.map((n) => n.booking_id).filter((id): id is string => Boolean(id)))];
    const bookings = await Promise.all(
      bookingIds.map((id) => ctx.db.query("bookings").withIndex("by_uuid", (q) => q.eq("id", id)).unique()),
    );
    const companyOf = new Map(bookingIds.map((id, i) => [id, bookings[i]?.company_id ?? null]));
    const companyIds = [...new Set([...companyOf.values()].filter((id): id is string => Boolean(id)))];
    const companies = await Promise.all(
      companyIds.map((id) => ctx.db.query("companies").withIndex("by_uuid", (q) => q.eq("id", id)).unique()),
    );
    const nameOf = new Map(companyIds.map((id, i) => [id, companies[i]?.name ?? null]));

    return rows.map((n) => {
      const companyId = n.booking_id ? (companyOf.get(n.booking_id) ?? null) : null;
      return { ...notificationOut(n), company_id: companyId, company_name: companyId ? (nameOf.get(companyId) ?? null) : null };
    });
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("user_id", me.id).eq("read_at", null))
      .collect();
    return rows.length;
  },
});

/** `read` both ways, the screen offers mark-as-unread too. */
export const markRead = mutation({
  args: { id: v.string(), read: v.optional(v.boolean()) },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const n = await ctx.db.query("notifications").withIndex("by_uuid", (q) => q.eq("id", a.id)).unique();
    if (!n) AuthError("No such notification.", "NOT_FOUND");
    assertOwnerOrAdmin(me, n.user_id);
    const read = a.read ?? true;
    await ctx.db.patch(n._id, { read_at: read ? (n.read_at ?? Date.now()) : null });
    return true;
  },
});

/** Clears what has been read, leaving anything unseen alone. */
export const clearRead = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const rows = await ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("user_id", me.id)).collect();
    let removed = 0;
    for (const n of rows) {
      if (n.read_at === null) continue;
      await ctx.db.delete(n._id);
      removed++;
    }
    return removed;
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("user_id", me.id).eq("read_at", null))
      .collect();
    const now = Date.now();
    for (const n of rows) await ctx.db.patch(n._id, { read_at: now });
    return rows.length;
  },
});
