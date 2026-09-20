import "server-only";

import { ConvexHttpClient } from "convex/browser";
import { supabaseServer } from "@/lib/supabase/server";

/* ─────────────────────────────────────────────────────────────────────────────
   Convex, from the server.

   Supabase remains the identity provider (docs/decisions/auth-provider.md), so
   the flow is: the session cookie holds a Supabase access token, we hand that
   token to Convex, and Convex validates it against Supabase's JWKS. The token's
   `sub` is the user's UUID, which is also profiles.id — so nothing is remapped.

   getSession() rather than getUser() here ON PURPOSE, and it is not the usual
   mistake. getUser() revalidates with the auth server but does not return the
   raw JWT, and the raw JWT is the thing Convex needs. The token is not trusted
   on our side: Convex verifies its signature, issuer, audience and expiry
   before any function sees it. src/proxy.ts still calls getUser() on every
   request, so the cookie backing this has been checked.
   ───────────────────────────────────────────────────────────────────────────── */

function url(): string {
  const value = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!value) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set.");
  return value;
}

/** Authenticated as the signed-in user, or anonymous when signed out. */
export async function convexServer(): Promise<ConvexHttpClient> {
  const client = new ConvexHttpClient(url());
  const supabase = await supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) client.setAuth(session.access_token);
  return client;
}

/** For the guest path, which has no session and must not pretend to. */
export function convexAnonymous(): ConvexHttpClient {
  return new ConvexHttpClient(url());
}
