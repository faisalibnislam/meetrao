import "server-only";

import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/* ─────────────────────────────────────────────────────────────────────────────
   The admin analytics read.

   Every figure comes from an aggregate function in the database (migration
   0016), not from pulling rows into Node and counting them. Two reasons:

     · the table is the one thing here that grows without bound, and "select *
       and count it in JavaScript" is a screen that works for a year and then
       times out
     · those functions are `security invoker`, so RLS is what decides who sees
       numbers. A non-admin gets zeroes and empty lists rather than an error.
       There is no second access rule in this file to keep in step with the
       policy.

   Seven RPCs, all in one Promise.all. They are POSTs, so Next does not dedupe
   or batch them; parallel is the difference between one round trip's latency
   and seven.
   ───────────────────────────────────────────────────────────────────────────── */

/** Ranges the screen offers. Anything else is coerced to 30. */
export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

export function parseRange(value: string | string[] | undefined): Range {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (RANGES as readonly number[]).includes(n) ? (n as Range) : 30;
}

export type DailyPoint = { day: string; visits: number; visitors: number };
export type TopRow = { label: string; visits: number; visitors: number };

export type SiteAnalytics = {
  range: Range;
  visits: number;
  visitors: number;
  countries: number;
  bots: number;
  visitsPrev: number;
  visitorsPrev: number;
  daily: DailyPoint[];
  topCountries: TopRow[];
  topPages: TopRow[];
  topReferrers: TopRow[];
  devices: TopRow[];
  browsers: TopRow[];
  systems: TopRow[];
};

type Head = {
  visits: number; visitors: number; countries: number; bots: number;
  visits_prev: number; visitors_prev: number;
};
type Raw = {
  head: Head | null;
  daily: { day: string; visits: number; visitors: number }[];
  countries: unknown; pages: unknown; referrers: unknown;
  devices: unknown; browsers: unknown; systems: unknown;
};

async function raw(range: Range): Promise<Raw> {
  const convex = await convexServer();
  const days = { days: range };
  const [head, daily, countries, pages, referrers, devices, browsers, systems] = await Promise.all([
    convex.query(api.analytics.overview, days),
    convex.query(api.analytics.daily, days),
    convex.query(api.analytics.top, { dimension: "country", ...days, limit: 8 }),
    convex.query(api.analytics.top, { dimension: "path", ...days, limit: 8 }),
    convex.query(api.analytics.top, { dimension: "referrer", ...days, limit: 6 }),
    convex.query(api.analytics.top, { dimension: "device", ...days, limit: 4 }),
    convex.query(api.analytics.top, { dimension: "browser", ...days, limit: 6 }),
    convex.query(api.analytics.top, { dimension: "os", ...days, limit: 6 }),
  ]);
  return { head, daily, countries, pages, referrers, devices, browsers, systems };
}

export async function siteAnalytics(range: Range): Promise<SiteAnalytics> {
  const { head, daily, countries, pages, referrers, devices, browsers, systems } = await raw(range);

  return {
    range,
    visits: num(head?.visits),
    visitors: num(head?.visitors),
    countries: num(head?.countries),
    bots: num(head?.bots),
    visitsPrev: num(head?.visits_prev),
    visitorsPrev: num(head?.visitors_prev),
    daily: daily.map((r) => ({ day: r.day, visits: num(r.visits), visitors: num(r.visitors) })),
    topCountries: rows(countries).map((r) => ({ ...r, label: countryName(r.label) })),
    topPages: rows(pages),
    topReferrers: rows(referrers),
    devices: rows(devices).map((r) => ({ ...r, label: deviceName(r.label) })),
    browsers: rows(browsers),
    systems: rows(systems),
  };
}

/* bigint comes back from PostgREST as a string once it passes 2^53, and as a
   number below that. Both are handled here rather than in six call sites. */
function num(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : 0;
  return Number.isFinite(n) ? n : 0;
}

function rows(data: unknown): TopRow[] {
  return ((data ?? []) as { label: string; visits: unknown; visitors: unknown }[]).map((r) => ({
    label: r.label,
    visits: num(r.visits),
    visitors: num(r.visitors),
  }));
}

/**
 * "BD" → "Bangladesh".
 *
 * Intl carries the whole list, so there is no country table to maintain and go
 * stale. A code Intl does not recognise comes back unchanged, and "Unknown",
 * which the database uses for a null, is left alone for the same reason.
 */
function countryName(code: string): string {
  if (code.length !== 2) return code;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

const DEVICE_LABEL: Record<string, string> = {
  phone: "Phone",
  tablet: "Tablet",
  desktop: "Desktop",
  unknown: "Unknown",
};

function deviceName(value: string): string {
  return DEVICE_LABEL[value] ?? value;
}
