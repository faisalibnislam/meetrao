import { internalMutation } from "./_generated/server";
import { STALE_AFTER_MS } from "./lib/rateLimit";

/** Fixed-window counters outlive their usefulness within a day. */
export const sweepRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_AFTER_MS;
    const rows = await ctx.db.query("rate_limits").take(4000);
    let removed = 0;
    for (const r of rows) {
      if (r.window_start >= cutoff) continue;
      await ctx.db.delete(r._id);
      removed++;
    }
    return removed;
  },
});
