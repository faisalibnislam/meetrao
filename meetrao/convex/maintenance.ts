import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { STALE_AFTER_MS } from "./lib/rateLimit";

/** Fixed-window counters outlive their usefulness within a day. */
export const sweepRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    /* Only stale rows, through the index, oldest first. This used to take the
       first 4,000 rows in creation order and skip the fresh ones, so once the
       table passed 4,000 rows the stale ones further along were never reached. */
    const cutoff = Date.now() - STALE_AFTER_MS;
    const BATCH = 4000;
    const rows = await ctx.db
      .query("rate_limits")
      .withIndex("by_window_start", (q) => q.lt("window_start", cutoff))
      .take(BATCH);
    for (const r of rows) await ctx.db.delete(r._id);
    // A full batch means there may be more: carry on in a fresh transaction.
    if (rows.length === BATCH) await ctx.scheduler.runAfter(0, internal.maintenance.sweepRateLimits, {});
    return rows.length;
  },
});
