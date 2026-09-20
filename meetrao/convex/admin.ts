import { query, mutation, internalMutation } from "./_generated/server";
import { fail } from "./lib/errors";
import { v } from "convex/values";
import { requireAdmin, requireProfile } from "./lib/auth";
import type { MutationCtx } from "./_generated/server";
import { profileOut, bookingOut, activityOut, meetingTypeOut } from "./lib/serialize";
import { uuid } from "./lib/ids";
import { logActivity } from "./lib/effects";
import { generateUsername, isFree } from "./profiles";

/* The admin console. Every function here goes through requireAdmin, which is
   the replacement for the `public.is_admin()` policies. */

export const listProfiles = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("profiles").collect();
    rows.sort((a, b) => b.created_at - a.created_at);
    return rows.map(profileOut);
  },
});

export const listActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("admin_activity").withIndex("by_created").order("desc").take(a.limit ?? 50);
    return rows.map(activityOut);
  },
});

export const listAllBookings = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("bookings").collect();
    rows.sort((x, y) => y.starts_at - x.starts_at);
    return rows.slice(0, a.limit ?? 100).map(bookingOut);
  },
});

/** Suspension is not self-service (migration 0006) — admin only, never a host. */
export const setSuspended = mutation({
  args: { userId: v.string(), suspended: v.boolean() },
  handler: async (ctx, a) => {
    const admin = await requireAdmin(ctx);
    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.userId)).unique();
    if (!p) fail("No such user.");
    await ctx.db.patch(p._id, { is_suspended: a.suspended, updated_at: Date.now() });
    await logActivity(ctx, {
      actorId: admin.id, kind: a.suspended ? "user_suspended" : "user_restored",
      summary: `${p.full_name || p.email} was ${a.suspended ? "suspended" : "restored"}`,
    });
    return profileOut((await ctx.db.get(p._id))!);
  },
});

/**
 * public.admin_set_username — returns BOTH names, as the RPC did.
 *
 * The caller writes the activity line from the pair, so it can say what the
 * link changed from as well as to.
 */
export const setBookingLink = mutation({
  args: { userId: v.string(), username: v.string(), retireOld: v.boolean(), force: v.optional(v.boolean()) },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    const wanted = a.username.trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(wanted)) fail("That is not a valid booking link.");

    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.userId)).unique();
    if (!p) return null;

    const taken = await ctx.db.query("profiles").withIndex("by_username_lower", (q) => q.eq("username_lower", wanted)).first();
    if (taken && taken.id !== p.id) fail("That booking link is already taken.");

    const reserved = await ctx.db.query("reserved_usernames").withIndex("by_username", (q) => q.eq("username", wanted)).unique();
    if (reserved && !a.force) fail("That booking link is held back.");
    if (reserved && a.force) await ctx.db.delete(reserved._id);

    const old_username = p.username;
    if (old_username.toLowerCase() === wanted) return { old_username, new_username: old_username };

    await ctx.db.patch(p._id, { username: wanted, username_lower: wanted, updated_at: Date.now() });
    if (a.retireOld) await reserve(ctx, old_username, "changed by admin");

    return { old_username, new_username: wanted };
  },
});

/**
 * public.admin_release_username.
 *
 * `profiles.username` is NOT NULL, so there is no state in which an account
 * has no booking link — retiring one necessarily means replacing it. The old
 * name is ALWAYS held back, or the host could claim it straight back from
 * Settings and the intervention would have achieved nothing.
 */
export const releaseBookingLink = mutation({
  args: { userId: v.string() },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.userId)).unique();
    if (!p) return null;

    const old_username = p.username;
    const placeholder = await generateUsername(ctx, "host");

    await ctx.db.patch(p._id, { username: placeholder, username_lower: placeholder, updated_at: Date.now() });
    await reserve(ctx, old_username, "retired by admin");

    return { old_username, new_username: placeholder };
  },
});

async function reserve(ctx: MutationCtx, username: string, reason: string): Promise<void> {
  const key = username.toLowerCase();
  const already = await ctx.db.query("reserved_usernames").withIndex("by_username", (q) => q.eq("username", key)).unique();
  if (already) return;
  await ctx.db.insert("reserved_usernames", { username: key, reason, reserved_at: Date.now() });
}

/** Frees a name that is currently held back, so it can be claimed again. */
export const unreserveUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, a) => {
    const actor = await requireAdmin(ctx);
    const key = a.username.trim().toLowerCase();
    const row = await ctx.db.query("reserved_usernames").withIndex("by_username", (q) => q.eq("username", key)).unique();
    if (!row) return false;
    await ctx.db.delete(row._id);
    await logActivity(ctx, { actorId: actor.id, kind: "username_released", summary: `${key} was released` });
    return true;
  },
});

/** Whether a name is free for a given account — the admin form's live check. */
export const bookingLinkAvailable = query({
  args: { username: v.string(), forUser: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    return await isFree(ctx, a.username, a.forUser);
  },
});

export const listReservedUsernames = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("reserved_usernames").collect();
    rows.sort((a, b) => b.reserved_at - a.reserved_at);
    return rows.map((r) => ({ username: r.username, reason: r.reason, reserved_at: new Date(r.reserved_at).toISOString() }));
  },
});

/**
 * public.admin_remove_account.
 *
 * The SQL version also deleted the row from auth.users. Supabase still owns
 * identity (see docs/decisions/auth-provider.md), so THAT half remains a
 * service-role call in the application — this removes everything Convex holds
 * and reserves the username. The caller must do both.
 */
/**
 * The whole fan-out for removing one account.
 *
 * Shared so that a host deleting themselves and an admin deleting them cannot
 * drift apart — the second copy is where the forgotten table lives. Postgres
 * had ON DELETE CASCADE; Convex has this function.
 */
export async function purgeAccount(
  ctx: MutationCtx,
  args: { userId: string; actorId: string | null },
): Promise<boolean> {
  const a = args;
  {
    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.userId)).unique();
    if (!p) return false;

    // No cascades in Convex. Every child table, explicitly, in FK order.
    for (const b of await ctx.db.query("bookings").withIndex("by_host_starts", (q) => q.eq("host_id", p.id)).collect()) {
      for (const i of await ctx.db.query("booking_invitees").withIndex("by_booking", (q) => q.eq("booking_id", b.id)).collect()) {
        await ctx.db.delete(i._id);
      }
      await ctx.db.delete(b._id);
    }
    for (const t of ["meeting_types", "contacts", "notifications", "availability_rules", "availability_schedules"] as const) {
      for (const row of await ctx.db.query(t).withIndex("by_user", (q) => q.eq("user_id", p.id)).collect()) {
        await ctx.db.delete(row._id);
      }
    }
    for (const c of await ctx.db.query("calendar_connections").withIndex("by_user", (q) => q.eq("user_id", p.id)).collect()) {
      await ctx.db.delete(c._id);
    }
    for (const pv of await ctx.db.query("booking_page_views").withIndex("by_host", (q) => q.eq("host_id", p.id)).collect()) {
      await ctx.db.delete(pv._id);
    }

    const username = p.username_lower;
    await ctx.db.delete(p._id);

    const already = await ctx.db.query("reserved_usernames").withIndex("by_username", (q) => q.eq("username", username)).unique();
    if (!already) await ctx.db.insert("reserved_usernames", { username, reason: "account removed", reserved_at: Date.now() });

    await ctx.db.insert("admin_activity", {
      id: uuid(), actor_id: a.actorId, kind: "account_removed",
      summary: `${p.full_name || p.email} was removed`, created_at: Date.now(),
    });
    return true;
  }
}

export const removeAccount = internalMutation({
  args: { userId: v.string(), actorId: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => await purgeAccount(ctx, { userId: a.userId, actorId: a.actorId }),
});

/** public.avg_reply_minutes — how quickly a host confirms after a page view. */
export const avgReplyMinutes = query({
  args: { userId: v.optional(v.string()), days: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const userId = a.userId ?? me.id;
    if (userId !== me.id && !me.is_admin) fail("Not permitted.");

    const from = Date.now() - (a.days ?? 30) * 24 * 60 * 60 * 1000;
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_host_starts", (q) => q.eq("host_id", userId))
      .collect();

    const deltas: number[] = [];
    for (const b of bookings) {
      if (b.created_at < from || !b.page_view_id) continue;
      const pv = await ctx.db.query("booking_page_views").withIndex("by_uuid", (q) => q.eq("id", b.page_view_id!)).unique();
      if (!pv) continue;
      const minutes = (b.created_at - pv.opened_at) / 60000;
      if (minutes >= 0) deltas.push(minutes);
    }
    if (!deltas.length) return null;
    return Math.round(deltas.reduce((s, d) => s + d, 0) / deltas.length);
  },
});

/* ── The admin console's reads ─────────────────────────────────────────────────
   Postgres answered these with count(*) and joins. Convex has neither, so each
   one is a bounded scan reduced in JS. These tables are small by construction
   — one row per host, per meeting, per booking — and the alternative
   (denormalised counters) is four more places that can go stale.
   ────────────────────────────────────────────────────────────────────────────── */

export const metrics = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const [users, bookings, meetings] = await Promise.all([
      ctx.db.query("profiles").collect(),
      ctx.db.query("bookings").collect(),
      ctx.db.query("meeting_types").collect(),
    ]);
    return {
      users: users.length,
      bookings: bookings.length,
      upcoming: bookings.filter((b) => b.status === "confirmed" && b.starts_at >= now).length,
      meetings: meetings.length,
    };
  },
});

export const usersWithCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [profiles, meetings, bookings] = await Promise.all([
      ctx.db.query("profiles").collect(),
      ctx.db.query("meeting_types").collect(),
      ctx.db.query("bookings").collect(),
    ]);

    const meetingCount = new Map<string, number>();
    for (const m of meetings) meetingCount.set(m.user_id, (meetingCount.get(m.user_id) ?? 0) + 1);
    const bookingCount = new Map<string, number>();
    for (const b of bookings) bookingCount.set(b.host_id, (bookingCount.get(b.host_id) ?? 0) + 1);

    return profiles
      .sort((a, b) => b.created_at - a.created_at)
      .map((p) => ({
        ...profileOut(p),
        meetings: meetingCount.get(p.id) ?? 0,
        bookings: bookingCount.get(p.id) ?? 0,
      }));
  },
});

export const userDetail = query({
  args: { userId: v.string() },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.userId)).unique();
    if (!p) return null;

    const meetings = await ctx.db.query("meeting_types").withIndex("by_user", (q) => q.eq("user_id", p.id)).collect();
    const bookings = await ctx.db.query("bookings").withIndex("by_host_starts", (q) => q.eq("host_id", p.id)).collect();

    return {
      profile: profileOut(p),
      meetings: meetings.sort((x, y) => x.created_at - y.created_at).map(meetingTypeOut),
      recentBookings: bookings.sort((x, y) => y.starts_at - x.starts_at).slice(0, 5).map(bookingOut),
    };
  },
});

/** Bookings across every host, with the host attached. */
export const bookingsWithHosts = query({
  args: { filter: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    const now = Date.now();
    let rows = await ctx.db.query("bookings").collect();
    if (a.filter === "upcoming") rows = rows.filter((b) => b.starts_at >= now);
    if (a.filter === "past") rows = rows.filter((b) => b.starts_at < now);
    rows.sort((x, y) => y.starts_at - x.starts_at);
    rows = rows.slice(0, a.limit ?? 200);

    // Admin-only, so the host's email is in scope here — the console lists it.
    const hosts = new Map<string, { id: string; username: string; full_name: string; email: string; timezone: string }>();
    for (const p of await ctx.db.query("profiles").collect()) {
      hosts.set(p.id, { id: p.id, username: p.username, full_name: p.full_name, email: p.email, timezone: p.timezone });
    }
    return rows.map((b) => ({ ...bookingOut(b), host: hosts.get(b.host_id) ?? null }));
  },
});

export const bookingWithHost = query({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    const b = await ctx.db.query("bookings").withIndex("by_uuid", (q) => q.eq("id", a.id)).unique();
    if (!b) return null;
    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", b.host_id)).unique();
    return {
      ...bookingOut(b),
      host: p ? { id: p.id, username: p.username, full_name: p.full_name, email: p.email, timezone: p.timezone } : null,
    };
  },
});

/** An activity line the console writes itself, rather than one a trigger caused. */
export const recordActivity = mutation({
  args: { kind: v.string(), summary: v.string() },
  handler: async (ctx, a) => {
    const actor = await requireAdmin(ctx);
    await logActivity(ctx, { actorId: actor.id, kind: a.kind, summary: a.summary });
    return true;
  },
});

/** An admin removing someone else's account. Self-service lives in profiles.ts. */
export const removeAccountAsAdmin = mutation({
  args: { userId: v.string() },
  handler: async (ctx, a) => {
    const actor = await requireAdmin(ctx);
    if (actor.id === a.userId) fail("Use Settings to remove your own account.", "SELF");
    return await purgeAccount(ctx, { userId: a.userId, actorId: actor.id });
  },
});

/** Everything the admin's booking-link field needs, in one round trip. */
export const bookingLinkState = query({
  args: { userId: v.string(), username: v.string() },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    const key = a.username.trim().toLowerCase();

    const holder = await ctx.db.query("profiles").withIndex("by_username_lower", (q) => q.eq("username_lower", key)).unique();
    const retired = await ctx.db.query("reserved_usernames").withIndex("by_username", (q) => q.eq("username", key)).unique();
    const target = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.userId)).unique();

    return {
      heldByTarget: holder?.id === a.userId,
      retired: retired !== null,
      free: holder === null,
      targetName: target?.full_name ?? "",
    };
  },
});
