"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";

/* Actions the verify screen calls from an event handler. Kept apart from
   auth.ts because those redirect, and a redirect thrown inside a transition is
   awkward to reason about at the call site. */

export type AuthResult = { error?: string };

/** Re-reads the session from Supabase. True once the emailed link has been opened. */
export async function checkVerified(): Promise<boolean> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user && (user.email_confirmed_at ?? user.confirmed_at));
}

export async function resendVerification(): Promise<AuthResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return { error: "Sign in again to resend the link." };

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
    options: { emailRedirectTo: `${siteUrl()}/auth/confirm` },
  });

  return error ? { error: error.message } : {};
}
