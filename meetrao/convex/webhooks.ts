import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { fail } from "./lib/errors";
import { requireProfile, assertOwnerOrAdmin } from "./lib/auth";
import { uuid } from "./lib/ids";
import { newWebhookSecret, signPayload } from "./lib/apiAuth";
import { requirePro } from "./lib/plan";

/* ─────────────────────────────────────────────────────────────────────────────
   Outgoing webhooks: booked, moved, cancelled.

   The events are the three things that happen to a booking, and they are
   posted from the same place the notifications are written — convex/lib/
   effects.ts — so a path that forgets to raise one forgets both, which is
   noticeable, rather than silently posting nothing.

   ONE ATTEMPT, RECORDED. A delivery that fails is not retried: by the time a
   retry ran, a "booked" event could arrive after the "cancelled" that
   followed it, and a receiver reconstructing state from an out-of-order
   stream is worse off than one that missed a message and polls the API. The
   status of the last attempt is kept so a broken endpoint is visible on the
   host's own screen instead of being a mystery.

   SIGNED, because a URL is not a secret. See convex/lib/apiAuth.ts for the
   scheme and why the timestamp is inside the signed string.
   ───────────────────────────────────────────────────────────────────────────── */

const MAX_HOOKS = 5;

export type WebhookEvent = "booking.created" | "booking.changed" | "booking.cancelled";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const rows = await ctx.db.query("webhooks").withIndex("by_user", (q) => q.eq("user_id", me.id)).collect();

    return rows
      .sort((a, b) => b.created_at - a.created_at)
      .map((w) => ({
        id: w.id,
        url: w.url,
        secret: w.secret,
        is_active: w.is_active,
        last_status: w.last_status,
        last_error: w.last_error,
        last_attempt_at: w.last_attempt_at ? new Date(w.last_attempt_at).toISOString() : null,
        created_at: new Date(w.created_at).toISOString(),
      }));
  },
});

export const add = mutation({
  args: { url: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    requirePro(me, "Webhooks");

    const url = a.url.trim();
    /* https only. A signature over plaintext still hands the payload to
       anyone on the path, and the payload has a guest's name and address in
       it. localhost is allowed so an integration can be built before it is
       deployed. */
    const ok = /^https:\/\//.test(url) || /^http:\/\/localhost(:\d+)?\//.test(url);
    if (!ok) fail("The URL has to start with https://");
    if (url.length > 400) fail("That URL is too long.");

    const mine = await ctx.db.query("webhooks").withIndex("by_user", (q) => q.eq("user_id", me.id)).collect();
    if (mine.length >= MAX_HOOKS) fail(`You can have ${MAX_HOOKS} endpoints. Remove one first.`);
    if (mine.some((w) => w.url === url)) fail("That endpoint is already registered.");

    const id = uuid();
    await ctx.db.insert("webhooks", {
      id,
      user_id: me.id,
      url,
      secret: newWebhookSecret(),
      is_active: true,
      last_status: null,
      last_error: null,
      last_attempt_at: null,
      created_at: Date.now(),
    });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const row = await ctx.db.query("webhooks").withIndex("by_uuid", (q) => q.eq("id", a.id)).unique();
    if (!row) return false;
    assertOwnerOrAdmin(me, row.user_id);
    await ctx.db.delete(row._id);
    return true;
  },
});

/** The endpoints one host has registered, for the delivery action. */
export const endpointsFor = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, a) => {
    const rows = await ctx.db.query("webhooks").withIndex("by_user", (q) => q.eq("user_id", a.userId)).collect();
    return rows.filter((w) => w.is_active).map((w) => ({ id: w.id, url: w.url, secret: w.secret }));
  },
});

export const recordAttempt = internalMutation({
  args: { id: v.string(), status: v.union(v.number(), v.null()), error: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => {
    const row = await ctx.db.query("webhooks").withIndex("by_uuid", (q) => q.eq("id", a.id)).unique();
    if (!row) return false;
    await ctx.db.patch(row._id, {
      last_status: a.status,
      last_error: a.error ? a.error.slice(0, 200) : null,
      last_attempt_at: Date.now(),
    });
    return true;
  },
});

/**
 * Posts one event to every endpoint a host has.
 *
 * Scheduled from the mutation that caused it, so the booking is already
 * written when this runs: a receiver that calls the API on delivery must not
 * find a booking that does not exist yet.
 */
export const deliver = internalAction({
  args: { userId: v.string(), event: v.string(), payload: v.string() },
  handler: async (ctx, a): Promise<{ sent: number; failed: number }> => {
    const endpoints: { id: string; url: string; secret: string }[] = await ctx.runQuery(
      internal.webhooks.endpointsFor,
      { userId: a.userId },
    );
    if (endpoints.length === 0) return { sent: 0, failed: 0 };

    const body = JSON.stringify({ event: a.event, sent_at: new Date().toISOString(), data: JSON.parse(a.payload) });
    let sent = 0;
    let failed = 0;

    for (const endpoint of endpoints) {
      try {
        const signature = await signPayload(endpoint.secret, body, Date.now());
        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Meetrao-Event": a.event,
            "Meetrao-Signature": signature,
          },
          body,
          // A receiver that hangs must not hold a Convex action open.
          signal: AbortSignal.timeout(8_000),
        });
        await ctx.runMutation(internal.webhooks.recordAttempt, {
          id: endpoint.id,
          status: response.status,
          error: response.ok ? null : `HTTP ${response.status}`,
        });
        if (response.ok) sent++;
        else failed++;
      } catch (cause) {
        await ctx.runMutation(internal.webhooks.recordAttempt, {
          id: endpoint.id,
          status: null,
          error: cause instanceof Error ? cause.message : "delivery failed",
        });
        failed++;
      }
    }

    return { sent, failed };
  },
});

/** Sends a signed test event, so an endpoint can be proven before it matters. */
export const test = action({
  args: { id: v.string() },
  handler: async (ctx, a): Promise<{ sent: number; failed: number }> => {
    const found: { userId: string } | null = await ctx.runQuery(internal.webhooks.ownerOf, { id: a.id });
    if (!found) throw new Error("No such endpoint.");

    return await ctx.runAction(internal.webhooks.deliver, {
      userId: found.userId,
      event: "ping",
      payload: JSON.stringify({ message: "This is a test delivery from Meetrao." }),
    });
  },
});

export const ownerOf = internalQuery({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const row = await ctx.db.query("webhooks").withIndex("by_uuid", (q) => q.eq("id", a.id)).unique();
    if (!row) return null;
    assertOwnerOrAdmin(me, row.user_id);
    return { userId: row.user_id };
  },
});
