import { internalQuery, internalMutation, query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { connectionOut } from "./lib/serialize";
import { uuid } from "./lib/ids";
import { logActivity } from "./lib/effects";
import { requireProfile } from "./lib/auth";

/* ─────────────────────────────────────────────────────────────────────────────
   Google OAuth tokens.

   In Postgres this table had RLS ON and NO POLICY — meaning no browser session
   could read it at all, by design, and only the service role could reach it.

   The Convex equivalent is that EVERY function in this file is internal. An
   internalQuery/internalMutation is not addressable from a client: there is no
   public function here to call, which is a stronger guarantee than a policy,
   because there is nothing to misconfigure.

   DO NOT add an exported `query` or `mutation` to this file.
   ───────────────────────────────────────────────────────────────────────────── */

export const getForUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, a) => {
    const c = await ctx.db.query("calendar_connections").withIndex("by_user", (q) => q.eq("user_id", a.userId)).unique();
    return c ? connectionOut(c) : null;
  },
});

export const upsert = internalMutation({
  args: {
    userId: v.string(),
    googleAccountEmail: v.union(v.string(), v.null()),
    calendarId: v.optional(v.string()),
    accessToken: v.union(v.string(), v.null()),
    refreshToken: v.union(v.string(), v.null()),
    tokenExpiresAt: v.union(v.number(), v.null()),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, a) => {
    const now = Date.now();
    const existing = await ctx.db.query("calendar_connections").withIndex("by_user", (q) => q.eq("user_id", a.userId)).unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        google_account_email: a.googleAccountEmail,
        calendar_id: a.calendarId ?? existing.calendar_id,
        access_token: a.accessToken,
        // Google omits the refresh token on re-consent; keeping the old one is
        // the difference between a working connection and a silent reconnect loop.
        refresh_token: a.refreshToken ?? existing.refresh_token,
        token_expires_at: a.tokenExpiresAt,
        scopes: a.scopes,
        needs_reconnect: false,
        last_error: null,
        last_error_at: null,
        updated_at: now,
      });
      return connectionOut((await ctx.db.get(existing._id))!);
    }

    const id = uuid();
    await ctx.db.insert("calendar_connections", {
      id, user_id: a.userId, provider: "google",
      google_account_email: a.googleAccountEmail, calendar_id: a.calendarId ?? "primary",
      access_token: a.accessToken, refresh_token: a.refreshToken, token_expires_at: a.tokenExpiresAt,
      scopes: a.scopes, needs_reconnect: false, last_error: null, last_error_at: null,
      created_at: now, updated_at: now,
    });
    // calendar_connections_log_created
    await logActivity(ctx, { actorId: a.userId, kind: "calendar_connected", summary: `Connected ${a.googleAccountEmail ?? "a Google calendar"}` });
    return connectionOut((await ctx.db.query("calendar_connections").withIndex("by_uuid", (q) => q.eq("id", id)).unique())!);
  },
});

export const markError = internalMutation({
  args: { userId: v.string(), error: v.string(), needsReconnect: v.boolean() },
  handler: async (ctx, a) => {
    const c = await ctx.db.query("calendar_connections").withIndex("by_user", (q) => q.eq("user_id", a.userId)).unique();
    if (!c) return false;
    await ctx.db.patch(c._id, { last_error: a.error, last_error_at: Date.now(), needs_reconnect: a.needsReconnect, updated_at: Date.now() });
    return true;
  },
});

export const disconnect = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, a) => {
    const c = await ctx.db.query("calendar_connections").withIndex("by_user", (q) => q.eq("user_id", a.userId)).unique();
    if (!c) return false;
    await ctx.db.delete(c._id);
    return true;
  },
});

/* ── The two session-scoped exceptions ─────────────────────────────────────────
   The rule at the top of this file is that nothing here is client-reachable,
   and it holds for the token fields. These two are deliberate exceptions and
   neither returns a token:

   · `statusOwn` answers "is my calendar connected, and does it need
     reconnecting" — the Settings screen's question, and nothing more.
   · `disconnectOwn` deletes the caller's own row. Deleting a secret you own is
     not a disclosure.
   ────────────────────────────────────────────────────────────────────────────── */

export const statusOwn = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const c = await ctx.db.query("calendar_connections").withIndex("by_user", (q) => q.eq("user_id", me.id)).unique();
    if (!c) return null;
    return {
      connected: true as const,
      google_account_email: c.google_account_email,
      calendar_id: c.calendar_id,
      needs_reconnect: c.needs_reconnect,
      last_error: c.last_error,
    };
  },
});

export const disconnectOwn = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const c = await ctx.db.query("calendar_connections").withIndex("by_user", (q) => q.eq("user_id", me.id)).unique();
    if (!c) return false;
    await ctx.db.delete(c._id);
    return true;
  },
});
