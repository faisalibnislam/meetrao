import "server-only";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────────────────────
   Session.

   The verification gate is built on Supabase Auth's own `email_confirmed_at`,
   not a second token we issue, and it is enforced here — server-side, on every
   authenticated screen and action. The proxy redirect is a convenience; this is
   the boundary.
   ───────────────────────────────────────────────────────────────────────────── */

export type Session = { userId: string; email: string; verified: boolean; profile: Profile };

/** The signed-in user and their profile, or a redirect. */
export async function requireSession(): Promise<Session> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const verified = Boolean(user.email_confirmed_at ?? user.confirmed_at);
  if (!verified) redirect("/verify");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (!profile) {
    // The auth trigger creates a profile on sign-up; a user without one is a
    // half-created account, and there is nothing to show them.
    redirect("/login?error=no-profile");
  }

  const row = profile as Profile;
  if (row.is_suspended) redirect("/suspended");

  return { userId: user.id, email: user.email ?? row.email, verified, profile: row };
}

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

/** For screens that render differently when signed in but do not require it. */
export async function optionalSession(): Promise<Session | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? (profile as Profile).email,
    verified: Boolean(user.email_confirmed_at ?? user.confirmed_at),
    profile: profile as Profile,
  };
}
