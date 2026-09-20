import { query, mutation, internalMutation } from "./_generated/server";
import { fail } from "./lib/errors";
import { v } from "convex/values";
import { requireProfile } from "./lib/auth";

/* Site analytics. Postgres did the aggregation with GROUP BY; Convex has no
   such thing, so the reduction happens in JS over an indexed range read.
   Bots are kept in the table and excluded from every aggregate, exactly as
   migration 0016 specified. */

const DAY = 24 * 60 * 60 * 1000;
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Insert-only, and reachable without a session — the collect route is public. */
export const record = mutation({
  args: {
    visitor_hash: v.string(), path: v.string(),
    referrer_host: v.union(v.string(), v.null()),
    country: v.union(v.string(), v.null()), region: v.union(v.string(), v.null()), city: v.union(v.string(), v.null()),
    device: v.string(), os: v.union(v.string(), v.null()), browser: v.union(v.string(), v.null()),
    is_bot: v.boolean(),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("site_visits", { ...a, visited_at: Date.now() });
    return true;
  },
});

const clampDays = (d: number) => Math.min(Math.max(Math.trunc(d || 30), 1), 365);

/** Everything since `prev_from`, so one read serves both windows. */
async function twoWindows(ctx: Parameters<typeof requireProfile>[0], days: number) {
  const n = clampDays(days);
  const now = Date.now();
  const thisFrom = now - n * DAY;
  const prevFrom = now - 2 * n * DAY;
  const rows = await ctx.db.query("site_visits").withIndex("by_visited", (q) => q.gte("visited_at", prevFrom)).collect();
  return { rows, n, thisFrom, prevFrom, prevTo: thisFrom };
}

/** analytics_overview — the same six figures, bots counted but excluded. */
export const overview = query({
  args: { days: v.number() },
  handler: async (ctx, a) => {
    await requireProfile(ctx);
    const { rows, thisFrom, prevFrom, prevTo } = await twoWindows(ctx, a.days);

    const cur = rows.filter((r) => !r.is_bot && r.visited_at > thisFrom);
    const prev = rows.filter((r) => !r.is_bot && r.visited_at > prevFrom && r.visited_at <= prevTo);

    return {
      visits: cur.length,
      visitors: new Set(cur.map((r) => r.visitor_hash)).size,
      // count(distinct country) in Postgres ignores NULL; Set does not, so nulls
      // are dropped first rather than counting as a country called "nothing".
      countries: new Set(cur.map((r) => r.country).filter((c): c is string => c !== null)).size,
      bots: rows.filter((r) => r.is_bot && r.visited_at > thisFrom).length,
      visits_prev: prev.length,
      visitors_prev: new Set(prev.map((r) => r.visitor_hash)).size,
    };
  },
});

/** analytics_daily — per UTC day, zero-filled. */
export const daily = query({
  args: { days: v.number() },
  handler: async (ctx, a) => {
    await requireProfile(ctx);
    const { rows, n, thisFrom } = await twoWindows(ctx, a.days);
    const cur = rows.filter((r) => !r.is_bot && r.visited_at > thisFrom);

    const buckets = new Map<string, { visits: number; visitors: Set<string> }>();
    for (let i = n - 1; i >= 0; i--) buckets.set(dayKey(Date.now() - i * DAY), { visits: 0, visitors: new Set() });
    for (const r of cur) {
      const b = buckets.get(dayKey(r.visited_at));
      if (!b) continue;
      b.visits++;
      b.visitors.add(r.visitor_hash);
    }
    return Array.from(buckets, ([day, b]) => ({ day, visits: b.visits, visitors: b.visitors.size }));
  },
});

const DIMENSIONS = ["country", "region", "path", "referrer", "device", "os", "browser"] as const;

/** analytics_top — label/visits/visitors, ties broken by label, as SQL did. */
export const top = query({
  args: { dimension: v.string(), days: v.number(), limit: v.optional(v.number()) },
  handler: async (ctx, a) => {
    await requireProfile(ctx);
    if (!DIMENSIONS.includes(a.dimension as (typeof DIMENSIONS)[number])) {
      fail(`unknown analytics dimension: ${a.dimension}`);
    }
    const { rows, thisFrom } = await twoWindows(ctx, a.days);
    const cur = rows.filter((r) => !r.is_bot && r.visited_at > thisFrom);

    const field = a.dimension === "referrer" ? "referrer_host" : a.dimension;
    const groups = new Map<string, { visits: number; visitors: Set<string> }>();
    for (const r of cur) {
      const raw = (r as unknown as Record<string, string | null>)[field];
      // coalesce(nullif(x, ''), 'Unknown')
      const label = raw === null || raw === undefined || raw === "" ? "Unknown" : raw;
      const g = groups.get(label) ?? { visits: 0, visitors: new Set<string>() };
      g.visits++;
      g.visitors.add(r.visitor_hash);
      groups.set(label, g);
    }

    return Array.from(groups, ([label, g]) => ({ label, visits: g.visits, visitors: g.visitors.size }))
      .sort((x, y) => y.visits - x.visits || x.label.localeCompare(y.label))
      .slice(0, Math.min(Math.max(a.limit ?? 8, 1), 50));
  },
});

/**
 * analytics_prune.
 *
 * In Postgres this was called opportunistically from the collect route on
 * ordinary visitor traffic — "called from the collect route, not a cron" — so
 * pruning stopped whenever traffic did. It is a real schedule now; see
 * convex/crons.ts.
 */
export const prune = internalMutation({
  args: { keepDays: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const keep = Math.max(a.keepDays ?? 400, 30);
    const cutoff = Date.now() - keep * DAY;
    const stale = await ctx.db.query("site_visits").withIndex("by_visited", (q) => q.lt("visited_at", cutoff)).take(4000);
    for (const row of stale) await ctx.db.delete(row._id);
    return stale.length;
  },
});
