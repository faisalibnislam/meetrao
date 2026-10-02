import "server-only";

import { ConvexHttpClient } from "convex/browser";

/* ─────────────────────────────────────────────────────────────────────────────
   Convex, from the server.

   Convex is both the database and the identity provider now
   (docs/decisions/auth-provider.md), so there is no second system to reconcile
   against: `convexAuthNextjsToken()` reads the session cookie Convex Auth set,
   and Convex verifies that token's signature, issuer, audience and expiry
   before any function sees it.

   The token's `sub` is "<userId>|<sessionId>" rather than a bare id. Nothing
   here needs to care, convex/lib/auth.ts resolves it to profiles.id, and that
   resolution is the only thing authorization ever uses.
   ───────────────────────────────────────────────────────────────────────────── */

function url(): string {
  const value = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!value) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set.");
  return value;
}

/**
 * Authenticated as the signed-in user, or anonymous when signed out.
 *
 * Convex Auth owns the cookie; this reads it and refreshes it when needed.
 * Imported lazily because the module pulls in Next's middleware machinery,
 * which is not resolvable outside a Next build. A static import breaks every
 * unit test that touches a server module.
 */
export async function convexServer(): Promise<ConvexHttpClient> {
  const client = new ConvexHttpClient(url());
  const { convexAuthNextjsToken } = await import("@convex-dev/auth/nextjs/server");
  const token = await convexAuthNextjsToken();
  if (token) client.setAuth(token);
  return client;
}

/** For the guest path, which has no session and must not pretend to. */
export function convexAnonymous(): ConvexHttpClient {
  return new ConvexHttpClient(url());
}
