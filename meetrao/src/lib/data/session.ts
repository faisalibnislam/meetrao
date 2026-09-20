import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import type { Profile } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────────────────────
   Session.

   Convex Auth issues the session and Convex holds the profile, so one
   authenticated call answers both "who is this" and "what may they see".
   There is no second auth server to reconcile against, which is what the
   previous version spent most of its length doing.

   THE VERIFICATION GATE LIVES HERE, and only here. Convex Auth does not put
   verification state in the token, so `src/proxy.ts` cannot see it — and this
   was always the real boundary anyway; the proxy check was a convenience.

   Still wrapped in React `cache()`, and that is load-bearing rather than
   tidiness: the layout and the page both call this, and Next does not dedupe
   a Convex query the way it dedupes a GET.
   ───────────────────────────────────────────────────────────────────────────── */

export type Session = { userId: string; email: string; verified: boolean; profile: Profile };

/**
 * The signed-in user and their profile, or a redirect.
 *
 * Deduped per request by `cache()` — see the note at the top of the file. The
 * layout and every page call this, and only the first one does the work.
 */
export const requireSession = cache(async function requireSession(): Promise<Session> {
  const convex = await convexServer();
  const who = await convex.query(api.whoami.identity, {});

  if (!who.authenticated) redirect("/login");
  if (!who.hasConvexProfile) {
    // Authenticated with no profile is a half-created account. The profile is
    // written by convex/auth.ts's afterUserCreatedOrUpdated callback, so this
    // means that callback did not run — there is nothing to show them.
    redirect("/login?error=no-profile");
  }

  const profile = (await convex.query(api.profiles.current, {})) as Profile | null;
  if (!profile) redirect("/login?error=no-profile");
  if (profile.is_suspended) redirect("/suspended");

  return {
    userId: profile.id,
    email: who.email ?? profile.email,
    verified: true,
    profile,
  };
});

/** As above, and sends anyone who has not finished onboarding back to it. */
export async function requireOnboardedSession(): Promise<Session> {
  const session = await requireSession();
  if (!session.profile.onboarding_completed_at) redirect("/onboarding/1");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (!session.profile.is_admin) redirect("/dashboard");
  return session;
}

/**
 * For screens that render differently when signed in but do not require it.
 *
 * Deliberately NOT the two-at-once shape requireSession uses. This one runs on
 * the public pages, where the overwhelmingly common caller is signed out — and
 * for them there is no profile to fetch, so firing current_profile() alongside
 * getUser() would not save a hop, it would just add a call that anon has no
 * grant to make, on every landing page view, to throw the 403 away.
 *
 * It still gets `cache()`: the site chrome and the page both call this, and one
 * request should mean one check.
 */
export const optionalSession = cache(async function optionalSession(): Promise<Session | null> {
  const convex = await convexServer();
  const profile = (await convex.query(api.profiles.current, {})) as Profile | null;
  if (!profile) return null;
  return { userId: profile.id, email: profile.email, verified: true, profile };
});
