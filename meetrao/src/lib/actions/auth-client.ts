"use server";

import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";

/* Actions the verify screen calls from an event handler. Kept apart from
   auth.ts because those redirect, and a redirect thrown inside a transition is
   awkward to reason about at the call site. */

export type AuthResult = { error?: string };

/** True once the emailed link has been opened. */
export async function checkVerified(): Promise<boolean> {
  const convex = await convexServer();
  const who = await convex.query(api.whoami.emailVerified, {});
  return who.authenticated && who.verified;
}

export async function resendVerification(): Promise<AuthResult> {
  const convex = await convexServer();
  const who = await convex.query(api.whoami.emailVerified, {});
  if (!who.authenticated || !who.email) return { error: "Sign in again to resend the link." };

  try {
    // Re-running the sign-up flow for an existing unverified account issues a
    // fresh code and sends it; Convex Auth treats it as another attempt at the
    // same verification rather than a second account.
    await convex.action(api.auth.signIn, {
      provider: "password",
      params: { email: who.email, flow: "email-verification" },
    });
    return {};
  } catch (cause) {
    return { error: convexMessage(cause, "That link could not be resent.") };
  }
}
