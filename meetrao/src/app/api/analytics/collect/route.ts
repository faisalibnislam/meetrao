import { after } from "next/server";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { convexServes } from "@/lib/backend";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import {
  classifyUserAgent,
  clientAddress,
  geoFromHeaders,
  normalizePath,
  referrerHost,
  visitorHash,
} from "@/lib/analytics/visit";

/* ─────────────────────────────────────────────────────────────────────────────
   The analytics beacon's other end.

   Why a route at all, rather than letting the browser write to Supabase: two
   of the four interesting fields can only be known here.

     · the country comes from Vercel's edge headers, which the page never sees
     · the visitor hash needs a server secret, which the page must never see

   A browser that could insert into `site_visits` directly could also invent a
   country and forge a hash, so `site_visits` has no insert policy and no grant
   to anon at all (migration 0016). This route holds the service role and is the
   only writer.

   What the browser sends is exactly two strings — the path and the referrer —
   and both are re-validated here, because a beacon posts whatever the page
   tells it to.

   Always answers 204, including when it rejects the body. A counter that tells
   a caller which of its guesses was accepted is a counter that can be probed.
   ───────────────────────────────────────────────────────────────────────────── */

/** No caching, and no static analysis of a route whose whole job is a side effect. */
export const dynamic = "force-dynamic";

/* Best-effort flood guard, per warm instance.
   Not a real rate limiter: serverless instances come and go, and a distributed
   one needs storage this plan does not have. It caps what a single visitor can
   add through one instance in one window, which is the difference between a
   nuisance and a bill. Stated plainly rather than dressed up. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 60;
const seen = new Map<string, { count: number; resetAt: number }>();

function withinBudget(hash: string, now: number): boolean {
  // Sweep on write. The map lives as long as the instance does, and an
  // unswept one is a memory leak with a friendly name.
  if (seen.size > 5000) {
    for (const [key, entry] of seen) if (entry.resetAt <= now) seen.delete(key);
  }

  const entry = seen.get(hash);
  if (!entry || entry.resetAt <= now) {
    seen.set(hash, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_PER_WINDOW;
}

/** 1 in 500 requests also takes out the rows past the retention period. */
const PRUNE_ODDS = 500;

const NO_CONTENT = new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

export async function POST(request: Request): Promise<Response> {
  const headers = request.headers;

  // Same-origin only. A beacon from another site is not a visit to this one,
  // and `sec-fetch-site` is set by the browser and cannot be spoofed by a page.
  // Absent (a non-browser caller) is allowed through and will almost always be
  // classified as a bot a few lines below.
  if (headers.get("sec-fetch-site") === "cross-site") return NO_CONTENT;

  // Local development does not write to the production table. Checked from the
  // request's own host rather than NODE_ENV, so `next start` against a local
  // Supabase behaves the same way.
  const host = (headers.get("host") ?? "").toLowerCase();
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) return NO_CONTENT;

  let payload: { path?: unknown; referrer?: unknown };
  try {
    // sendBeacon sends text/plain so the request stays CORS-simple; the body is
    // still JSON. Capped before parsing — the beacon sends a few hundred bytes.
    const raw = (await request.text()).slice(0, 2048);
    payload = JSON.parse(raw) as { path?: unknown; referrer?: unknown };
  } catch {
    return NO_CONTENT;
  }

  const path = normalizePath(typeof payload.path === "string" ? payload.path : null);
  if (!path) return NO_CONTENT;

  const userAgent = headers.get("user-agent") ?? "";
  const { device, os, browser, isBot } = classifyUserAgent(userAgent);
  const geo = geoFromHeaders(headers);

  const hash = visitorHash({ salt: analyticsSalt(), ip: clientAddress(headers), userAgent });
  if (!withinBudget(hash, Date.now())) return NO_CONTENT;

  const row = {
    visitor_hash: hash,
    path,
    referrer_host: referrerHost(typeof payload.referrer === "string" ? payload.referrer : null, host),
    country: geo.country,
    region: geo.region,
    city: geo.city,
    device,
    os,
    browser,
    is_bot: isBot,
  };

  // The visitor waits for none of this. `after` runs once the response is on
  // its way, so a slow database is not a slow page.
  after(async () => {
    if (convexServes("analytics")) {
      /* The secret is what keeps this endpoint ours. site_visits had no insert
         grant precisely so a browser could not forge a visit, and a Convex
         mutation has no service role to inherit that from — see the note on
         `record` in convex/analytics.ts. */
      const secret = process.env.ANALYTICS_INGEST_SECRET;
      if (!secret) {
        console.error("analytics: ANALYTICS_INGEST_SECRET is not set; visit not recorded");
        return;
      }
      try {
        await convexAnonymous().mutation(api.analytics.record, { secret, ...row });
      } catch (cause) {
        // Logged, not thrown: a page view that fails to record is not an
        // outage, and there is no one to tell.
        console.error("analytics: convex insert failed", cause);
      }
      // No opportunistic prune here — convex/crons.ts runs it on a schedule,
      // which is what it should always have been.
      return;
    }

    const supabase = supabaseAdmin();
    const { error } = await supabase.from("site_visits").insert(row);
    // Logged, not thrown: a page view that fails to record is not an outage,
    // and there is no one to tell. The log is where it is findable.
    if (error) console.error("analytics: insert failed", error.message);

    if (Math.floor(Math.random() * PRUNE_ODDS) === 0) {
      const { error: pruneError } = await supabase.rpc("analytics_prune", { p_keep_days: 400 });
      if (pruneError) console.error("analytics: prune failed", pruneError.message);
    }
  });

  return NO_CONTENT;
}

/**
 * The hash salt.
 *
 * Falls back to the service-role key when ANALYTICS_SALT is unset: a stable,
 * server-only secret is exactly what is needed, and one that already exists
 * means the analytics work with no configuration at all. The cost of the
 * fallback is that rotating the service-role key resets that day's
 * unique-visitor count — which is why ANALYTICS_SALT exists.
 *
 * The salt is never sent anywhere. It goes into a sha256 and stays here.
 */
function analyticsSalt(): string {
  const e = env();
  return e.ANALYTICS_SALT || e.SUPABASE_SERVICE_ROLE_KEY;
}
