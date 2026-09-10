import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────────────────────
   Session.

   The verification gate is built on Supabase Auth's own `email_confirmed_at`,
   not a second token we issue, and it is enforced here — server-side, on every
   authenticated screen and action. The proxy redirect is a convenience; this is
   the boundary.

   ── Why this file is shaped for latency ───────────────────────────────────────
   Every authenticated screen goes through here, so its round trips are on the
   critical path of every navigation. Measured against a local build with a
   stand-in Supabase, a tab click cost four *sequential* round trips, and three
   of them were this: getUser(), then the profile read that needed getUser()'s
   id, before the screen's own queries could start. On a database in another
   region that is most of the wait, and the user sees nothing the whole time.

   Two changes, both here:

   1. `current_profile()` filters by auth.uid() inside Postgres (migration
      0015), so the profile read no longer needs an id from a previous hop and
      runs *alongside* getUser() rather than after it. getUser() is still the
      boundary — it is what revalidates the token with the auth server — and the
      two results are reconciled below before either is trusted.

   2. The whole thing is wrapped in React `cache()`. The layout and the page
      both call requireOnboardedSession(), and this is not merely tidiness:
      Next dedupes identical GET fetches within a render, but an RPC is a POST
      and is NOT deduped, so without cache() the profile call would happen twice
      per navigation. cache() is load-bearing.
   ───────────────────────────────────────────────────────────────────────────── */

export type Session = { userId: string; email: string; verified: boolean; profile: Profile };

/**
 * The signed-in user and their profile, or a redirect.
 *
 * Deduped per request by `cache()` — see the note at the top of the file. The
 * layout and every page call this, and only the first one does the work.
 */
export const requireSession = cache(async function requireSession(): Promise<Session> {
  const supabase = await supabaseServer();

  // Both at once. Neither depends on the other: getUser() revalidates the token
  // with the auth server, and current_profile() is filtered by auth.uid() in
  // the database, so the request carries everything each of them needs.
  const [{ data: userData }, { data: profileData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("current_profile"),
  ]);

  const user = userData.user;
  if (!user) redirect("/login");

  const verified = Boolean(user.email_confirmed_at ?? user.confirmed_at);
  if (!verified) redirect("/verify");

  // The profile arrived without waiting for the token to be verified, so it is
  // reconciled rather than assumed: it has to be a row, and it has to be the
  // row belonging to the user the auth server just confirmed. A mismatch means
  // the two halves disagree about who is calling — the profile is discarded and
  // read again the slow, ordered way rather than trusted.
  let row = (profileData ?? null) as Profile | null;
  if (row && row.id !== user.id) row = null;
  if (!row) {
    const { data: refetched } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    row = (refetched ?? null) as Profile | null;
  }

  if (!row) {
    // The auth trigger creates a profile on sign-up; a user without one is a
    // half-created account, and there is nothing to show them.
    redirect("/login?error=no-profile");
  }

  if (row.is_suspended) redirect("/suspended");

  return { userId: user.id, email: user.email ?? row.email, verified, profile: row };
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
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const row = (profile ?? null) as Profile | null;
  if (!row) return null;

  return {
    userId: user.id,
    email: user.email ?? row.email,
    verified: Boolean(user.email_confirmed_at ?? user.confirmed_at),
    profile: row,
  };
});
