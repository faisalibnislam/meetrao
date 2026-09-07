import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Email verification, gated on the `email_confirmed_at` Supabase Auth already
 * sets. There is deliberately no column of our own and no second token system:
 * Supabase issues the token, sends the confirmation link, and stamps the user
 * when it is clicked. Adding a parallel `verified_at` would give two sources of
 * truth that can disagree.
 *
 * Google sign-up arrives verified — Google has already proved the address, and
 * Supabase stamps `email_confirmed_at` at creation — so those hosts never see
 * the gate.
 *
 * THE CLIENT GATE IS A CONVENIENCE, NOT THE BOUNDARY. The proxy redirects, but
 * a redirect is not enforcement: it can be skipped by anything that talks to
 * the server directly. `requireVerified()` below is what actually holds, and it
 * runs in the layout that every authenticated page renders inside.
 */
export type VerificationState = {
  verified: boolean;
  email: string | null;
  /** Google and other OAuth identities arrive already verified. */
  viaOAuth: boolean;
};

export async function getVerificationState(): Promise<VerificationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { verified: false, email: null, viaOAuth: false };

  const viaOAuth = (user.app_metadata?.provider ?? "email") !== "email";

  return {
    verified: Boolean(user.email_confirmed_at),
    email: user.email ?? null,
    viaOAuth,
  };
}

/**
 * Server-side enforcement. Sends an unverified host to the gate rather than
 * letting them into the app.
 */
export async function requireVerified(): Promise<void> {
  const state = await getVerificationState();
  if (!state.verified) redirect("/verify");
}
