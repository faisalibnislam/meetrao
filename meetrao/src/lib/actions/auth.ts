"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchAction } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";

/* ─────────────────────────────────────────────────────────────────────────────
   Signing out.

   The only auth server action left. Everything else — sign in, sign up, reset,
   Google — is client-side now, because Convex Auth writes its session cookie in
   the browser and has no server-side `signIn`. See src/components/auth/.

   Sign-out is the exception, and only because it is DESTRUCTION rather than
   issuance: there is nothing to hand back to the browser. It is kept as a
   server action so the eight screens that already pass it down as `onSignOut`
   did not have to become client components to log a person out.
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Ends the session at both ends.
 *
 * Deleting the cookies alone would leave the refresh token live in Convex —
 * the browser would forget it, and anything still holding it would not. So the
 * session is invalidated in Convex FIRST, and the cookies go afterwards.
 *
 * Convex is allowed to fail here. A person who clicked "Log out" must end up
 * logged out of this browser whatever the network did, and an un-cleared
 * cookie is the worse of the two failures.
 */
export async function signOut() {
  try {
    const token = await convexAuthNextjsToken();
    if (token) await fetchAction(api.auth.signOut, {}, { token });
  } catch {
    /* ignored, deliberately — the cookies below are what this screen needs */
  }

  const store = await cookies();
  // Off localhost the package prefixes both names with `__Host-`, so both
  // spellings are cleared rather than guessing which environment this is.
  for (const name of ["__convexAuthJWT", "__convexAuthRefreshToken"]) {
    store.delete(name);
    store.delete(`__Host-${name}`);
  }

  redirect("/login");
}
