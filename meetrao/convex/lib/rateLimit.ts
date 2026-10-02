import type { MutationCtx } from "../_generated/server";
import { fail } from "./errors";

/* ─────────────────────────────────────────────────────────────────────────────
   Rate limiting for the guest path.

   Convex ships none, and `createBooking` is internet-callable by anyone. The
   same exposure `create_booking` had with its `anon` grant, which nothing
   limited either. This is a fixed-window counter: cheap, one row per key, and
   good enough to stop a script hammering a host's calendar.

   What it is NOT: a defence against a distributed flood, and not per-IP on its
   own. A Convex function cannot see the caller's address, so the IP key is
   passed in by our own route handler, which can. Treat the limits as a brake,
   not a wall.
   ───────────────────────────────────────────────────────────────────────────── */

export type Limit = { key: string; limit: number; windowMs: number; message: string };

/**
 * Consumes one unit against each limit, or refuses.
 *
 * Runs inside the caller's mutation, so the counter increments in the same
 * transaction as the booking. A refused booking never leaves its count behind,
 * and two racing callers cannot both read the same pre-increment value.
 */
export async function consume(ctx: MutationCtx, limits: Limit[]): Promise<void> {
  const now = Date.now();

  for (const l of limits) {
    const row = await ctx.db
      .query("rate_limits")
      .withIndex("by_key", (q) => q.eq("key", l.key))
      .unique();

    if (!row) {
      await ctx.db.insert("rate_limits", { key: l.key, window_start: now, count: 1 });
      continue;
    }

    if (now - row.window_start >= l.windowMs) {
      await ctx.db.patch(row._id, { window_start: now, count: 1 });
      continue;
    }

    if (row.count >= l.limit) fail(l.message, "RATE_LIMITED");
    await ctx.db.patch(row._id, { count: row.count + 1 });
  }
}

/** Old windows are dead weight; convex/crons.ts sweeps them. */
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
