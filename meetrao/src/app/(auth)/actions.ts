"use server";

import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { sendWelcome } from "@/lib/email/messages";

export type AuthState = {
  error?: string;
  notice?: string;
};

/** Only ever redirect to a same-origin path. */
function safeNext(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  if (!value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately vague: distinguishing "no such user" from "wrong password"
    // hands an attacker a user-enumeration oracle.
    return { error: "That email and password do not match an account." };
  }

  redirect(next || "/dashboard");
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName) return { error: "Enter your name." };
  if (!email) return { error: "Enter your work email." };
  if (password.length < 8) {
    return { error: "Use a password of at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: siteUrl("/auth/callback?next=/onboarding/1"),
    },
  });

  if (error) return { error: error.message };

  // With "Confirm email" switched off the session is live immediately and the
  // design's signup → onboarding flow works as drawn. With it on, Supabase
  // returns no session and the host has to click the emailed link first.
  if (!data.session) {
    return {
      notice: `Check ${email} for a link to confirm your account, then sign in.`,
    };
  }

  // The account exists and can sign in, so this is the moment the design calls
  // "email confirmed". Best-effort: a mail failure must not block signup.
  await sendWelcome({ fullName, email, username: email.split("@")[0] });

  redirect("/onboarding/1");
}

export async function resetPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your work email." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: siteUrl("/auth/callback?next=/settings/account"),
  });

  // Always the same answer, whether or not the address is registered.
  return {
    notice: "If that email has an account, a reset link is on its way. It expires in one hour.",
  };
}

export async function googleAuthAction(formData: FormData) {
  const next = safeNext(formData.get("next")) || "/dashboard";
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: siteUrl(`/auth/callback?next=${encodeURIComponent(next)}`),
    },
  });

  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}
