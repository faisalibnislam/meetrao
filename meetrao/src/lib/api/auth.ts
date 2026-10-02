import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { convexAnonymous } from "@/lib/convex/server";
import { hashApiKey } from "@/convex/lib/apiAuth";
import { api } from "@/convex/_generated/api";

/* ─────────────────────────────────────────────────────────────────────────────
   Bearer-token auth for the read-only API.

   The key arrives as `Authorization: Bearer mk_live_…` and is hashed here. The
   hash is what travels on to Convex and what the row holds. The plaintext is
   never compared against anything stored, because nothing stored is the
   plaintext.

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

/** The hash of the presented key, or null when none was presented. */
export async function presentedKeyHash(request: NextRequest): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const key = header.slice(7).trim();
  if (!key) return null;
  return await hashApiKey(key);
}

/**
 * Records that the key was used.
 *
 * Not awaited, and failures are swallowed: "last used" is a convenience on a
 * settings screen, and a caller's request should not fail (or wait) because
 * a timestamp could not be written.
 */
export function touch(hash: string): void {
  void convexAnonymous()
    .mutation(api.apiPublic.touchKey, { hash })
    .catch(() => {});
}
