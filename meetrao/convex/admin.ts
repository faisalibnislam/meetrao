import { query, mutation, internalMutation } from "./_generated/server";
import { fail } from "./lib/errors";
import { v } from "convex/values";
import { requireAdmin, requireProfile } from "./lib/auth";
import { hasComp, hasSubscription, planOf } from "./lib/plan";
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

/** Suspension is not self-service (migration 0006), admin only, never a host. */
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

/* ── complimentary Pro ──────────────────────────────────────────────────────

   Giving Pro away, without pretending it was bought.

   The grant is its own field, read beside the subscription rather than
   instead of it, see convex/lib/plan.ts for why. Three consequences worth
   knowing before editing this:

     · A granted account that later subscribes has both. The subscription is
       what the books should count; the grant just stops mattering.
     · A Polar event cannot erase a grant, and a grant cannot be mistaken for
       revenue by anything reading `plan`.
     · Revoking is immediate and leaves the row. The audit line and the
       reason are the point, and a deleted field answers no questions later.

   Every grant and revocation writes an admin_activity row, because "who gave
   this account Pro, and why" is a question that gets asked months later. */

/** The lengths the screen offers. Anything else is refused. */
const COMP_DAYS: Record<string, number | null> = {
  month: 30,
  quarter: 90,
  year: 365,
  forever: null,
};

/* Keyed rather than compared, so a third grantable tier gets its own entry
   instead of silently reading as whatever is in the else branch. */
const GRANT_KIND = { pro: "pro_granted", business: "business_granted" } as const;
const GRANT_LABEL = { pro: "Pro", business: "Business" } as const;

export const grantPro = mutation({
  args: {
    userId: v.string(),
    length: v.string(),
    reason: v.string(),
    /* Absent is Pro, which keeps every existing caller correct. */
    plan: v.optional(v.union(v.literal("pro"), v.literal("business"))),
  },
  handler: async (ctx, a) => {
    const admin = await requireAdmin(ctx);
    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.userId)).unique();
    if (!p) fail("No such user.");

    if (!(a.length in COMP_DAYS)) fail("Pick one of the offered lengths.");
    const reason = a.reason.trim().slice(0, 140);
    /* A reason is required. An operator who cannot say why in a dozen words
       is making a decision somebody will have to reconstruct later. */
    if (!reason) fail("Say why this account is getting Pro.");

    const days = COMP_DAYS[a.length];
    const now = Date.now();
    // "Forever" is a hundred years, not a null: every reader already knows how
    // to compare two dates, and none of them has to learn a special case.
    const until = days === null ? now + 100 * 365 * 24 * 60 * 60_000 : now + days * 24 * 60 * 60_000;

    const tier = a.plan ?? "pro";

    await ctx.db.patch(p._id, {
      comp_until: until,
      comp_plan: tier,
      comp_reason: reason,
      comp_granted_by: admin.id,
      comp_granted_at: now,
      updated_at: now,
    });

    await logActivity(ctx, {
      actorId: admin.id,
      kind: GRANT_KIND[tier],
      summary: `${p.full_name || p.email} was given ${GRANT_LABEL[tier]} (${a.length}), ${reason}`,
    });

    return { until: new Date(until).toISOString(), plan: tier };
  },
});

export const revokePro = mutation({
  args: { userId: v.string() },
  handler: async (ctx, a) => {
    const admin = await requireAdmin(ctx);
    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.userId)).unique();
    if (!p) fail("No such user.");
    if (!p.comp_until) return { revoked: false };


    await ctx.db.patch(p._id, { comp_until: null, comp_plan: null, updated_at: Date.now() });
    await logActivity(ctx, {
      actorId: admin.id,
      kind: "pro_revoked",
      /* Names what it was for, so the pair of lines reads as a story rather
         than as two unrelated events. */
      summary: `${p.full_name || p.email} lost granted Pro, was: ${p.comp_reason || "no reason given"}`,
    });

    return { revoked: true };
  },
});

/** What the admin screen shows about one account's plan. */
export const planFor = query({
  args: { userId: v.string() },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.userId)).unique();
    if (!p) return null;

    let grantedBy: string | null = null;
    if (p.comp_granted_by) {
      const by = await ctx.db
        .query("profiles").withIndex("by_uuid", (q) => q.eq("id", p.comp_granted_by as string)).unique();
      grantedBy = by ? by.full_name || by.email : null;
    }

    return {
      plan: planOf(p),
      subscribed: hasSubscription(p),
      comp: hasComp(p),
      comp_until: p.comp_until ? new Date(p.comp_until).toISOString() : null,
      comp_plan: p.comp_plan ?? "pro",
      comp_reason: p.comp_reason ?? "",
      comp_granted_by: grantedBy,
      plan_until: p.plan_until ? new Date(p.plan_until).toISOString() : null,
    };
  },
});

/**
 * public.admin_set_username, returns BOTH names, as the RPC did.
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
 * has no booking link, retiring one necessarily means replacing it. The old
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

/** Whether a name is free for a given account, the admin form's live check. */
export const bookingLinkAvailable = query({
  args: { username: v.string(), forUser: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    return await isFree(ctx, a.username, a.forUser);
  },
});

/**
 * Booking links that are held back, and whether anything still occupies them.
 *
 * A name lands here when an account is removed or an admin retires a link, so
 * that a dead `meetrao.com/<link>` cannot be claimed by the next person to
 * sign up, someone else's old meeting invitations still point at it.
 *
 * `heldBy` is the honest part. A reservation is only supposed to exist for a
 * name nobody holds, but the two are separate rows and nothing enforces it, so
 * the console reports what is actually there rather than assuming. A name with
 * a holder must not be offered for reclaim: freeing it would let a second
 * account claim a link the first is still serving.
 */
export const listReservedUsernames = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("reserved_usernames").collect();
    rows.sort((a, b) => b.reserved_at - a.reserved_at);

    return await Promise.all(
      rows.map(async (r) => {
        const holder = await ctx.db
          .query("profiles")
          .withIndex("by_username_lower", (q) => q.eq("username_lower", r.username))
          .unique();
        return {
          username: r.username,
          reason: r.reason,
          reserved_at: new Date(r.reserved_at).toISOString(),
          heldBy: holder ? { id: holder.id, name: holder.full_name || holder.email } : null,
        };
      }),
    );
  },
});

/**
 * public.admin_remove_account.
 *
 * The SQL version also deleted the row from auth.users. Supabase still owns
 * identity (see docs/decisions/auth-provider.md), so THAT half remains a
 * service-role call in the application. This removes everything Convex holds
 * and reserves the username. The caller must do both.
 */
/**
 * The whole fan-out for removing one account.
 *
 * Shared so that a host deleting themselves and an admin deleting them cannot
 * drift apart. The second copy is where the forgotten table lives. Postgres
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

    /* THE AUTH IDENTITY GOES TOO, and leaving it behind was a real defect.
       Postgres cascaded from auth.users; Convex has no cascades, and this
       function was written from the profile side only. So a removed account
       kept its `users` row, its password and its sessions:

         · the person could still sign in, land with no profile, and (before
           the proxy stopped bouncing them off /login) spin in a redirect
           loop on every screen;
         · a removed address could be "signed up" again, which quietly set a
           password on the surviving identity rather than creating anything;
         · and the privacy policy promises deletion is immediate and complete,
           while the email address sat in `users` indefinitely.

       `supabase_id` is the link in both directions: imported accounts carry
       the old UUID, and accounts created here have it set to their own Convex
       user id, so one lookup covers both. */
    const user = await ctx.db
      .query("users")
      .withIndex("by_supabase_id", (q) => q.eq("supabase_id", p.id))
      .unique();

    if (user) {
      for (const acc of await ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
        .collect()) {
        // Codes hang off the account, so they go before it does.
        for (const code of await ctx.db
          .query("authVerificationCodes")
          .withIndex("accountId", (q) => q.eq("accountId", acc._id))
          .collect()) {
          await ctx.db.delete(code._id);
        }
        await ctx.db.delete(acc._id);
      }

      for (const session of await ctx.db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", user._id))
        .collect()) {
        // Refresh tokens outlive the access token; without these the session
        // is revoked on paper only.
        for (const token of await ctx.db
          .query("authRefreshTokens")
          .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
          .collect()) {
          await ctx.db.delete(token._id);
        }
        await ctx.db.delete(session._id);
      }

      await ctx.db.delete(user._id);
    }

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

/** public.avg_reply_minutes, how quickly a host confirms after a page view. */
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
   (one row per host, per meeting, per booking) and the alternative
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

    // Admin-only, so the host's email is in scope here, the console lists it.
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
