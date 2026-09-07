"use server";

import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { hasServiceRole, siteUrl } from "@/lib/env";
import { sendVerifyEmail } from "@/lib/email/messages";

export type VerifyResult = { ok: boolean; message?: string };

/**
 * Resend the confirmation email.
 *
 * Supabase remains the token issuer — nothing here mints one. What this does is
 * ask Supabase's admin API for a fresh confirmation link and put it inside the
 * design's own `verify-email` template, so the resend a host triggers looks
 * like Meetrao rather than like Supabase's default.
 *
 * Falls back to `auth.resend`, which sends Supabase's own email, whenever the
 * link cannot be generated — without a service role key, or if the admin call
 * fails. A host who asked for another email gets one either way; only the
 * styling differs.
 */
export async function resendVerificationEmail(): Promise<VerifyResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return { ok: false, message: "You are signed out." };
  if (user.email_confirmed_at) {
    return { ok: false, message: "That address is already confirmed." };
  }

  const email = user.email;

  if (hasServiceRole()) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.generateLink({
        // The user already exists and is unconfirmed, so "signup" is not
        // available. A magic link both signs them in and confirms the address,
        // which is exactly what the confirmation link does.
        type: "magiclink",
        email,
        options: { redirectTo: siteUrl("/auth/callback?next=/onboarding/1") },
      });

      const link = data?.properties?.action_link;
      if (!error && link) {
        await sendVerifyEmail({ email, verifyUrl: link });
        return { ok: true };
      }

      console.error("[verify] generateLink failed, falling back", error?.message);
    } catch (cause) {
      console.error("[verify] generateLink threw, falling back", cause);
    }
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: siteUrl("/auth/callback?next=/onboarding/1") },
  });

  if (error) return { ok: false, message: "Could not send that. Try again." };
  return { ok: true };
}

/**
 * "I have confirmed my email" — re-reads the user and lets them through if
 * Supabase has stamped the address since the page loaded.
 */
export async function checkVerification(): Promise<VerifyResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "You are signed out." };
  if (!user.email_confirmed_at) {
    return {
      ok: false,
      message: "Not confirmed yet. Open the link in your inbox, then try again.",
    };
  }

  return { ok: true };
}

/** "Use a different email" — signs out and returns to sign-up. */
export async function abandonVerification(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/signup");
}
