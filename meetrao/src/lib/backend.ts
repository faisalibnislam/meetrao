import "server-only";

/* ─────────────────────────────────────────────────────────────────────────────
   Which backend serves which domain.

   The migration moves one domain at a time, lowest blast radius first, and each
   one has to be reversible without a deploy of anything but an environment
   variable. CONVEX_BACKENDS is a comma-separated list of domain names, or
   "all", or "none".

     CONVEX_BACKENDS=analytics,contacts     # those two on Convex
     CONVEX_BACKENDS=all                    # everything on Convex
     (unset)                                # everything on Supabase

   Unset is Supabase, deliberately: a variable that has not been thought about
   should not silently move production onto a backend nothing has reconciled.

   A DOMAIN IS READS AND WRITES TOGETHER. Turning one on sends both to Convex,
   because splitting them means a host saves a contact to Postgres and then
   reads the list from Convex, which no longer contains it. The corollary is
   that Convex becomes authoritative for that domain the moment it is switched
   on: turning the flag back off does not carry the writes back, so a rollback
   loses whatever was written in between. That is the price of not dual-writing
   these domains, and it is affordable only because they are small and
   reconstructible — it is NOT the plan for the booking core, which dual-writes.
   ───────────────────────────────────────────────────────────────────────────── */

export type Domain =
  | "analytics"
  | "notifications"
  | "contacts"
  | "schedules"
  | "availability"
  | "meetings"
  | "bookings"
  | "publicBooking"
  | "session"
  | "admin"
  /** Google Calendar: tokens and API calls move into Convex actions. */
  | "google"
  /**
   * IDENTITY ITSELF — Convex Auth instead of Supabase Auth.
   *
   * Unlike every other domain, this one is not about where rows live. It
   * decides who issues the session, so turning it on changes how people sign
   * in. Both issuers are accepted by Convex at once (convex/auth.config.ts),
   * which is what makes it reversible — but a password changed while this is
   * on is written to Convex Auth and will NOT be understood by Supabase if it
   * is turned back off.
   */
  | "auth";

/**
 * Domains that "all" does NOT cover.
 *
 * `auth` decides who issues sessions, not where rows live. Sweeping it in with
 * a wildcard would mean a routine "move everything to Convex" also changed how
 * every person signs in — and it is the one domain where turning the flag back
 * off can leave someone unable to get in, because a password changed under
 * Convex Auth is not a password Supabase understands. It has to be typed out.
 */
const NEVER_WILDCARD: readonly Domain[] = ["auth"];

export function convexServes(domain: Domain): boolean {
  const raw = (process.env.CONVEX_BACKENDS ?? "").trim().toLowerCase();
  if (!raw || raw === "none") return false;

  const named = raw.split(",").map((s) => s.trim());
  if (named.includes(domain)) return true;

  /* "all" is a MEMBER of the list, not a value the whole string must equal.
     Comparing the raw string meant `all,auth` matched neither branch, so every
     data domain silently fell back to Supabase while auth had moved — which
     presents as a signed-in user whose screens are all empty, because the
     Supabase session no longer exists. */
  return named.includes("all") && !NEVER_WILDCARD.includes(domain);
}
