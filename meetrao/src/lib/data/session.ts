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
   verification state in the token, so `src/proxy.ts` cannot see it, and this
   was always the real boundary anyway; the proxy check was a convenience.

   Still wrapped in React `cache()`, and that is load-bearing rather than
   tidiness: the layout and the page both call this, and Next does not dedupe
   a Convex query the way it dedupes a GET.
   ───────────────────────────────────────────────────────────────────────────── */

export type Session = { userId: string; email: string; verified: boolean; profile: Profile };

/**
 * The signed-in user and their profile, or a redirect.
 *
 * Deduped per request by `cache()`, see the note at the top of the file. The
 * layout and every page call this, and only the first one does the work.
 */
export const requireSession = cache(async function requireSession(): Promise<Session> {
  const convex = await convexServer();
  /* ONE round trip for identity and profile. This was whoami.identity and
     then profiles.current, one after the other, on every authenticated page:
     the second fetched a row the first had already read. */
  const who = await convex.query(api.whoami.session, {});

  if (!who.authenticated) redirect("/login");

  /* THE VERIFICATION GATE. Supabase put `email_confirmed_at` in the token, so
     src/proxy.ts could check it before a render; Convex Auth does not, so it
     is checked where the profile is read, which was always the real boundary
     anyway. The cost is one extra redirect, on a path taken once.

     Convex Auth already refuses to issue a session to an unverified account,
     so this is the second line rather than the only one. It matters for the
     case that first line does not cover: an address that was verified when
     the session was issued and is not any more. */
  if (!who.emailVerified) redirect("/verify?unverified=1");

  // Authenticated with no profile is a half-created account. The profile is
  // written by convex/auth.ts's afterUserCreatedOrUpdated callback, so this
  // means that callback did not run. There is nothing to show them.
  const profile = who.profile as Profile | null;
  if (!profile) redirect("/login?error=no-profile");
  if (profile.is_suspended) redirect("/suspended");

  return {
    userId: profile.id,
    email: who.email ?? profile.email,
    verified: who.emailVerified,
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
 * ONE query, deliberately. This runs on the public pages, where almost every
 * caller is signed out and there is no profile to fetch. It does NOT apply the
 * verification gate: these screens only decide which nav to draw, and an
 * unverified visitor should see their own name in it rather than be bounced
 * off the pricing page. Every screen that shows real data goes through
 * requireSession, which does gate.
 *
 * It still gets `cache()`: the site chrome and the page both call this, and one
 * request should mean one check.
 */
export const optionalSession = cache(async function optionalSession(): Promise<Session | null> {
  const convex = await convexServer();
  const profile = (await convex.query(api.profiles.current, {})) as Profile | null;
  if (!profile) return null;
  // `verified` is not read on these screens; requireSession is the caller
  // that answers it truthfully, and this one has not asked.
  return { userId: profile.id, email: profile.email, verified: false, profile };
});
