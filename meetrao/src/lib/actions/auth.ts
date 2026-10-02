"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { fetchAction } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";
import { clearedAuthCookies } from "@/lib/auth/cookies";

/* ─────────────────────────────────────────────────────────────────────────────
   Signing out.

   The only auth server action left. Everything else (sign in, sign up, reset,
   Google) is client-side now, because Convex Auth writes its session cookie in
   the browser and has no server-side `signIn`. See src/components/auth/.

   Sign-out is the exception, and only because it is DESTRUCTION rather than
   issuance: there is nothing to hand back to the browser. It is kept as a
   server action so the eight screens that already pass it down as `onSignOut`
   did not have to become client components to log a person out.
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Ends the session at both ends.
 *
 * Deleting the cookies alone would leave the refresh token live in Convex,
 * the browser would forget it, and anything still holding it would not. So the
 * session is invalidated in Convex FIRST, and the cookies go afterwards.
 *
 * Convex is allowed to fail here. A person who clicked "Log out" must end up
 * logged out of this browser whatever the network did, and an un-cleared
 * cookie is the worse of the two failures.
 */
export async function signOut() {
  /* Convex FIRST. Clearing the cookies only makes this browser forget; the
     refresh token stays valid until the session is ended server-side, and
     anything still holding it would keep working. */
  try {
    const token = await convexAuthNextjsToken();
    if (token) await fetchAction(api.auth.signOut, {}, { token });
  } catch (cause) {
    /* Not fatal, a person who clicked "Log out" must end up logged out of
       this browser whatever the network did, and the cookies below do that.
       But it is logged, because a silent failure here leaves a live session
       behind and nothing on screen would ever say so. */
    console.error("sign-out: convex session was not revoked", {
      error: cause instanceof Error ? cause.message : String(cause),
    });
  }

  /* Then the cookies, re-set with their full attributes, not deleted. See
     src/lib/auth/cookies.ts for why `.delete()` and a missing `secure` both
     fail, silently and only in production. */
  const store = await cookies();
  const host = (await headers()).get("host");
  for (const { name, value, options } of clearedAuthCookies(host)) {
    store.set(name, value, options);
  }

  redirect("/login");
}
