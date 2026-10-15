import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { requireProfile } from "./lib/auth";

/* ─────────────────────────────────────────────────────────────────────────────
   Push notifications for the iOS app: which phones to tell.

   The sending is in convex/pushNode.ts, because APNs speaks HTTP/2 only and
   that needs Node. What to send, and when, is decided where every host
   notification is already written: notifyHost in convex/lib/effects.ts.
   ───────────────────────────────────────────────────────────────────────────── */

const environment = v.union(v.literal("sandbox"), v.literal("production"));

/** Called by the app whenever iOS hands it a token, which can change. */
export const registerDevice = mutation({
  args: { token: v.string(), environment },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const token = a.token.trim();
    if (!/^[0-9a-f]{64,200}$/i.test(token)) throw new Error("That is not a device token.");

    const now = Date.now();
    const existing = await ctx.db.query("push_devices").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (existing) {
      await ctx.db.patch(existing._id, { user_id: me.id, environment: a.environment, updated_at: now });
      return null;
    }
    await ctx.db.insert("push_devices", {
      user_id: me.id,
      token,
      environment: a.environment,
      created_at: now,
      updated_at: now,
    });
    return null;
  },
});

/** Called on sign-out, so a shared phone stops receiving the last person's bookings. */
export const unregisterDevice = mutation({
  args: { token: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const row = await ctx.db.query("push_devices").withIndex("by_token", (q) => q.eq("token", a.token.trim())).unique();
    if (row && row.user_id === me.id) await ctx.db.delete(row._id);
    return null;
  },
});

export const devicesFor = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, a) =>
    (await ctx.db.query("push_devices").withIndex("by_user", (q) => q.eq("user_id", a.userId)).collect()).map(
      (d) => ({ token: d.token, environment: d.environment }),
    ),
});

/** APNs said the token is dead (the app was deleted, or the phone reset). */
export const forgetToken = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, a) => {
    const row = await ctx.db.query("push_devices").withIndex("by_token", (q) => q.eq("token", a.token)).unique();
    if (row) await ctx.db.delete(row._id);
    return null;
  },
});
