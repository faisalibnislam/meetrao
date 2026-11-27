import { fail } from "./errors";

/* ─────────────────────────────────────────────────────────────────────────────
   Calls only our own server may make.

   Some public functions exist only because the caller is a Next route or page
   rather than a signed-in session: the busy-time lookups behind the booking
   page and the page-view counter. This deployment's URL ships to every
   browser, so "public" meant anyone could call them directly, with any host id,
   and read a host's exact busy blocks or pile up page-view rows.

   The equivalent of a service role is a shared secret that only the server
   holds: CONVEX_SERVER_SECRET, set on every Convex deployment and on Vercel
   (never NEXT_PUBLIC_). analytics.record uses ANALYTICS_INGEST_SECRET the same
   way; this one is separate so neither can be rotated by accident.

   LEGACY_CALLERS_ALLOWED is the deploy switch. Convex deploys before the site,
   so for the minutes between the two a caller without the secret is still the
   old site. It is true only for that one deploy and committed as false.
   ───────────────────────────────────────────────────────────────────────────── */

export const LEGACY_CALLERS_ALLOWED = false;

export function assertServerCall(secret: string | undefined): void {
  if (secret === undefined && LEGACY_CALLERS_ALLOWED) return;
  const expected = process.env.CONVEX_SERVER_SECRET;
  if (!expected) fail("Server calls are not configured.", "MISCONFIGURED");
  if (secret === undefined) fail("Not permitted.", "FORBIDDEN");

  // Full-length comparison, so the time taken says nothing about the prefix.
  let same = secret.length === expected.length;
  for (let i = 0; i < expected.length; i++) {
    if (secret.charCodeAt(i) !== expected.charCodeAt(i)) same = false;
  }
  if (!same) fail("Not permitted.", "FORBIDDEN");
}
