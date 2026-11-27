import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/* ─────────────────────────────────────────────────────────────────────────────
   Bearer-token auth for the read-only API.

   The key arrives as `Authorization: Bearer mk_live_…` and travels on to
   Convex, which hashes it and looks the hash up. It used to be hashed here and
   the hash sent instead, which made the stored hash itself a credential: see
   convex/apiPublic.ts. The plaintext is still never stored or compared
   against anything stored.

   ONE REFUSAL FOR EVERY FAILURE. No key, a malformed key, a revoked key and a
   key on a suspended account all answer 401 with the same body. Telling them
   apart would be a way to learn which keys exist.
   ───────────────────────────────────────────────────────────────────────────── */

export function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: "unauthorized", message: "Send a valid API key as `Authorization: Bearer <key>`." },
    { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
  );
}

/** The presented key, or null when none was presented. */
export function presentedKey(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const key = header.slice(7).trim();
  return key || null;
}

/**
 * Records that the key was used.
 *
 * Not awaited, and failures are swallowed: "last used" is a convenience on a
 * settings screen, and a caller's request should not fail (or wait) because
 * a timestamp could not be written.
 */
export function touch(key: string): void {
  void convexAnonymous()
    .mutation(api.apiPublic.touchKey, { key })
    .catch(() => {});
}
