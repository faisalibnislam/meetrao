"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { supportedTimezone } from "@/lib/timezones";

/* Auth server actions. Each returns a plain `{ error }` so the form can render
   the message inline rather than throwing. */

export type AuthResult = { error?: string };

const GENERIC = "That email and password do not match an account.";

export async function signInWithPassword(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // Never distinguish "no such account" from "wrong password" — that turns the
  // form into an account-enumeration oracle.
  if (error) return { error: GENERIC };

  const verified = Boolean(data.user?.email_confirmed_at ?? data.user?.confirmed_at);
  if (!verified) redirect("/verify?unverified=1");

  redirect(next && next.startsWith("/") ? next : "/dashboard");
}

export async function signUpWithPassword(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // The browser's own zone, carried in a hidden field. Checked against the
  // list this app offers before it goes anywhere near the account: it arrives
  // from a client, and the slot engine reads the result.
  const timezone = supportedTimezone(formData.get("timezone"));

  if (!fullName) return { error: "Enter your full name." };
  if (!email.includes("@")) return { error: "Enter an email we can send the confirmation to." };
  if (password.length < 8) return { error: "Use at least 8 characters." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // handle_new_user reads this and writes it to the profile, so the host
      // lands on their real hours rather than UTC. See migration 0008.
      data: { full_name: fullName, timezone },
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
    },
  });

  if (error) return { error: error.message };

  // Sign-up routes to the verify gate, not to onboarding.
  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

export async function sendPasswordReset(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) return { error: "Enter the email you signed up with." };

  const supabase = await supabaseServer();
  // The result is deliberately not surfaced: whether an address is registered
  // is not something an unauthenticated form should reveal.
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/confirm?next=/reset` });

  redirect("/login?sent=reset");
}

export async function updatePassword(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect("/dashboard?updated=password");
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Returns Google's consent URL; the caller navigates to it.
 *
 * A Google sign-up has no form to carry the detected zone, so it rides on the
 * return URL instead and /auth/callback applies it. Not sensitive, and
 * validated again on the way back — the round trip goes through Google.
 */
export async function startGoogleSignIn(detected?: string): Promise<{ url?: string; error?: string }> {
  const supabase = await supabaseServer();
  const timezone = supportedTimezone(detected);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl()}/auth/callback?tz=${encodeURIComponent(timezone)}`,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) return { error: error?.message ?? "Google sign-in is unavailable." };
  return { url: data.url };
}
