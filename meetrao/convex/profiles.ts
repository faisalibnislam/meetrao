import { query, mutation, internalMutation } from "./_generated/server";
import { fail } from "./lib/errors";
import { v } from "convex/values";
import { optionalProfile, requireProfile, AuthError } from "./lib/auth";
import { profileOut } from "./lib/serialize";
import { uuid } from "./lib/ids";
import { purgeAccount } from "./admin";
import { supportedZoneOrNull } from "./lib/zones";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/* profiles — and the auth trigger that used to create them.

   `handle_new_user()` was an AFTER INSERT trigger on auth.users. Supabase still
   issues the identity, but nothing downstream of it fires now, so profile
   creation is an explicit mutation called on first sign-in. Every path that can
   produce a new user must reach `ensureProfile`. */

/** public.generate_username(seed) — same normalisation, same collision loop. */
export async function generateUsername(ctx: QueryCtx | MutationCtx, seed: string | null): Promise<string> {
  let base = (seed ?? "").toLowerCase();
  base = base.replace(/@.*$/, "");
  base = base.replace(/[^a-z0-9]+/g, "-");
  base = base.replace(/^-+|-+$/g, "");
  base = base.slice(0, 32);
  if (!base) base = "host";
  if (!/^[a-z0-9]/.test(base)) base = `h${base}`;
  base = base.replace(/^-+|-+$/g, "");

  let candidate = base;
  for (let n = 0; ; n++) {
    if (n > 0) candidate = `${base}${n}`;
    if (await isFree(ctx, candidate, null)) return candidate;
  }
}

/** public.username_available(p_username, p_for_user). */
export async function isFree(
  ctx: QueryCtx | MutationCtx,
  username: string,
  forUser: string | null,
): Promise<boolean> {
  const wanted = username.trim().toLowerCase();
  const taken = await ctx.db
    .query("profiles")
    .withIndex("by_username_lower", (q) => q.eq("username_lower", wanted))
    .first();
  if (taken && (forUser === null || taken.id !== forUser)) return false;

  const reserved = await ctx.db
    .query("reserved_usernames")
    .withIndex("by_username", (q) => q.eq("username", wanted))
    .first();
  return reserved === null;
}

export const usernameAvailable = query({
  args: { username: v.string(), forUser: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => await isFree(ctx, a.username, a.forUser),
});

/** public.current_profile() — filtered by the caller's identity, as the RPC was. */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const p = await optionalProfile(ctx);
    return p ? profileOut(p) : null;
  },
});

export const byUsername = query({
  args: { username: v.string() },
  handler: async (ctx, a) => {
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("username_lower", a.username.trim().toLowerCase()))
      .unique();
    return p ? profileOut(p) : null;
  },
});

/**
 * The replacement for the on_auth_user_created trigger.
 *
 * Idempotent on purpose: it is called on every sign-in, not just the first, so
 * that a user who existed before this code did still gets a profile. The
 * bootstrap_admins lookup and the admin_activity row both come from the
 * original trigger body.
 */
export const ensureProfile = mutation({
  args: { email: v.string(), fullName: v.optional(v.string()), timezone: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) AuthError("Not signed in.", "UNAUTHENTICATED");
    const userId = identity.subject;

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_uuid", (q) => q.eq("id", userId))
      .unique();
    if (existing) return profileOut(existing);

    const email = a.email.trim().toLowerCase();
    const displayName = (a.fullName ?? "").trim();
    const bootstrap = await ctx.db
      .query("bootstrap_admins")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    const username = await generateUsername(ctx, displayName || email);
    const now = Date.now();

    await ctx.db.insert("profiles", {
      id: userId,
      username,
      username_lower: username.toLowerCase(),
      full_name: displayName,
      job_title: "",
      email,
      timezone: a.timezone ?? "UTC",
      timezone_auto: true,
      avatar_url: null,
      is_admin: bootstrap !== null,
      is_suspended: false,
      default_duration_minutes: 30,
      default_notice_minutes: 60,
      notify_new_booking: true,
      notify_booking_changed: true,
      notify_booking_cancelled: true,
      notify_daily_agenda: false,
      notify_product_news: false,
      onboarding_completed_at: null,
      welcomed_at: null,
      created_at: now,
      updated_at: now,
    });

    await ctx.db.insert("admin_activity", {
      id: uuid(),
      actor_id: userId,
      kind: "user_created",
      summary: `${displayName || email || "A user"} created an account`,
      created_at: now,
    });

    const created = await ctx.db
      .query("profiles")
      .withIndex("by_uuid", (q) => q.eq("id", userId))
      .unique();
    return profileOut(created!);
  },
});

/**
 * Field-level updates the host is allowed to make to their own profile.
 *
 * Postgres revoked UPDATE on `is_suspended` and `welcomed_at` from every client
 * role. The equivalent here is that neither appears in these args — a host
 * cannot un-suspend themselves by sending an extra field, because there is no
 * field to send.
 */
export const updateOwn = mutation({
  args: {
    full_name: v.optional(v.string()),
    job_title: v.optional(v.string()),
    timezone: v.optional(v.string()),
    timezone_auto: v.optional(v.boolean()),
    avatar_url: v.optional(v.union(v.string(), v.null())),
    default_duration_minutes: v.optional(v.number()),
    default_notice_minutes: v.optional(v.number()),
    notify_new_booking: v.optional(v.boolean()),
    notify_booking_changed: v.optional(v.boolean()),
    notify_booking_cancelled: v.optional(v.boolean()),
    notify_daily_agenda: v.optional(v.boolean()),
    notify_product_news: v.optional(v.boolean()),
    onboarding_completed_at: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const patch: Record<string, unknown> = { updated_at: Date.now() };
    for (const [k, val] of Object.entries(a)) {
      if (val === undefined) continue;
      patch[k] = k === "onboarding_completed_at" && typeof val === "string" ? Date.parse(val) : val;
    }
    // CHECK constraints from migration 0001, which no longer have a database.
    const dur = patch.default_duration_minutes as number | undefined;
    if (dur !== undefined && (dur < 5 || dur > 480)) fail("Duration must be 5–480 minutes.");
    const notice = patch.default_notice_minutes as number | undefined;
    if (notice !== undefined && notice < 0) fail("Notice cannot be negative.");

    await ctx.db.patch(me._id, patch);
    const after = await ctx.db.get(me._id);
    return profileOut(after!);
  },
});

/** Renaming is separate because it carries the uniqueness rule. */
export const setUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const wanted = a.username.trim().toLowerCase();

    if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(wanted)) {
      fail("Usernames are letters, numbers and hyphens.");
    }
    // Postgres had a unique index AND a reserved-name trigger. Both are here,
    // and both are inside this mutation, which is serializable — so a second
    // caller racing for the same name re-reads and loses.
    if (!(await isFree(ctx, wanted, me.id))) fail("That link is taken.");

    await ctx.db.patch(me._id, { username: wanted, username_lower: wanted, updated_at: Date.now() });
    const after = await ctx.db.get(me._id);
    return profileOut(after!);
  },
});

/** welcomed_at was revoked from client roles; only server code may set it. */
export const markWelcomed = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, a) => {
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_uuid", (q) => q.eq("id", a.userId))
      .unique();
    if (!p || p.welcomed_at !== null) return false;
    await ctx.db.patch(p._id, { welcomed_at: Date.now(), updated_at: Date.now() });
    return true;
  },
});

/**
 * Records the zone a browser reported, while it is still ours to set.
 *
 * `timezone_auto` is what keeps this honest: it is true only until the host
 * picks a zone in onboarding or Settings, so signing in again a month later
 * cannot quietly move someone who deliberately chose UTC.
 *
 * Postgres protected that with the service role — a browser session could not
 * set `timezone_auto` back to true. Here the invariant is enforced by the
 * function instead: it writes ONLY when the flag is already true, so it does
 * not matter who calls it.
 *
 * Never throws. A wrong timezone is worth fixing; it is not worth failing a
 * sign-in over.
 */
export const applyDetectedTimezone = mutation({
  args: { detected: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => {
    const me = await optionalProfile(ctx);
    if (!me || !a.detected) return false;

    const zone = supportedZoneOrNull(a.detected);
    if (!zone || zone === "UTC") return false; // nothing learned
    if (!me.timezone_auto) return false; // the host has chosen; leave it alone

    await ctx.db.patch(me._id, { timezone: zone, updated_at: Date.now() });
    return true;
  },
});

/** A host removing their own account. Same fan-out as the admin path. */
export const deleteOwnAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    return await purgeAccount(ctx, { userId: me.id, actorId: me.id });
  },
});
