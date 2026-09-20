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
  | "admin";

export function convexServes(domain: Domain): boolean {
  const raw = (process.env.CONVEX_BACKENDS ?? "").trim().toLowerCase();
  if (!raw || raw === "none") return false;
  if (raw === "all") return true;
  return raw.split(",").map((s) => s.trim()).includes(domain);
}
