"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Field, Help, Input } from "@/components/ui/controls";
import { Callout } from "@/components/ui/panels";
import { GoogleG } from "@/components/ui/logo";
import { Eyebrow } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button-class";
import { useClientValue } from "@/lib/use-client-value";
import { detectTimezone, nearestSupportedTimezone } from "@/lib/timezones";
import {
  sendPasswordReset,
  signInWithPassword,
  signUpWithPassword,
  startGoogleSignIn,
  type AuthResult,
} from "@/lib/actions/auth";

export type AuthMode = "login" | "signup" | "forgot";

/**
 * ONE message, whatever went wrong.
 *
 * Not laziness — a form that distinguishes "no such account" from "wrong
 * password" is an account-enumeration oracle, and the Supabase path has said
 * exactly this since the beginning (`GENERIC` in src/lib/actions/auth.ts).
 * Do not be tempted to surface the provider's error to make debugging easier.
 */
const GENERIC = "That email and password do not match an account.";

const ACTION = {
  login: signInWithPassword,
  signup: signUpWithPassword,
  forgot: sendPasswordReset,
} as const;

const CTA = { login: "Sign in", signup: "Create account", forgot: "Send reset link" } as const;

export function AuthForm({
  mode,
  next,
  convexAuth = false,
}: {
  mode: AuthMode;
  next?: string;
  /**
   * Decided on the SERVER and passed down, never read from a NEXT_PUBLIC
   * variable — the browser must not be able to disagree with the backend
   * about who issues sessions.
   */
  convexAuth?: boolean;
}) {
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(ACTION[mode], {});
  const [googlePending, startGoogle] = useTransition();
  const [googleError, setGoogleError] = useState<string | null>(null);

  /* Convex Auth has no server-side signIn: the cookie the middleware reads is
     written HERE, by useAuthActions. That is why these flows cannot be server
     actions, and why this component carries both paths until the cutover. */
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [convexPending, startConvex] = useTransition();
  const [convexError, setConvexError] = useState<string | null>(null);

  function submitViaConvex(form: FormData) {
    startConvex(async () => {
      setConvexError(null);
      const email = String(form.get("email") ?? "").trim().toLowerCase();
      const password = String(form.get("password") ?? "");

      try {
        if (mode === "forgot") {
          /* Swallowed on purpose, exactly as the server action does: whether
             an address is registered is not something an unauthenticated form
             may reveal, and an error here would reveal it. */
          try {
            await signIn("password", { email, flow: "reset" });
          } catch {
            /* ignored, deliberately */
          }
          router.push("/login?sent=reset");
          return;
        }

        if (mode === "signup") {
          await signIn("password", {
            email,
            password,
            name: String(form.get("full_name") ?? "").trim(),
            flow: "signUp",
          });
          router.push(`/verify?email=${encodeURIComponent(email)}`);
          return;
        }

        await signIn("password", { email, password, flow: "signIn" });
        router.push(next && next.startsWith("/") ? next : "/dashboard");
        router.refresh();
      } catch {
        setConvexError(mode === "signup" ? "That email could not be registered." : GENERIC);
      }
    });
  }

  const busy = convexAuth ? convexPending : pending;
  const error = convexAuth ? convexError : state.error;

  const isForgot = mode === "forgot";
  const isSignup = mode === "signup";

  // The device's own zone, mapped to one this app offers. Read through
  // useClientValue so the server renders "UTC" and the client corrects it
  // after hydration — reading Intl during render would mismatch.
  const timezone = useClientValue(() => nearestSupportedTimezone(detectTimezone()), "UTC");

  return (
    <div className="flex flex-col gap-[14px]">
      {error ? <Callout tone="red">{error}</Callout> : null}
      {googleError ? <Callout tone="red">{googleError}</Callout> : null}

      <form
        action={convexAuth ? submitViaConvex : formAction}
        className="flex flex-col gap-[14px]"
      >
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {/* Registration sets the host's timezone from their own device, so a
            new account never offers its hours in UTC by accident. Changed
            later in Settings like any other. */}
        {isSignup ? <input type="hidden" name="timezone" value={timezone} /> : null}

        {isSignup ? (
          <Field label="Full name" htmlFor="full_name">
            <Input id="full_name" name="full_name" type="text" height={38} placeholder="Adam Voigt" autoComplete="name" required />
          </Field>
        ) : null}

        <Field label="Work email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            height={38}
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </Field>

        {!isForgot ? (
          <Field
            label="Password"
            htmlFor="password"
            labelRight={
              mode === "login" ? (
                <Link href="/forgot" className="text-[12px] font-medium">
                  Forgot?
                </Link>
              ) : undefined
            }
          >
            <Input
              id="password"
              name="password"
              type="password"
              height={38}
              placeholder="••••••••"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={isSignup ? 8 : undefined}
            />
            {isSignup ? <Help>At least 8 characters.</Help> : null}
          </Field>
        ) : null}

        <Button type="submit" variant="accent" size={40} full busy={busy} className="mt-[2px]">
          {busy && mode === "login" ? "Signing in…" : CTA[mode]}
        </Button>
      </form>

      {!isForgot ? (
        <div className="flex flex-col gap-[14px]">
          <div className="flex items-center gap-[12px]">
            <span aria-hidden="true" className="h-[1px] flex-1 bg-line" />
            <Eyebrow size={10.5}>or</Eyebrow>
            <span aria-hidden="true" className="h-[1px] flex-1 bg-line" />
          </div>

          <button
            type="button"
            disabled={googlePending}
            onClick={() =>
              startGoogle(async () => {
                setGoogleError(null);
                if (convexAuth) {
                  try {
                    // Convex Auth performs the redirect itself.
                    await signIn("google", { redirectTo: `/auth/callback?tz=${encodeURIComponent(timezone)}` });
                  } catch {
                    setGoogleError("Google sign-in is unavailable.");
                  }
                  return;
                }
                const result = await startGoogleSignIn(timezone);
                if (result.url) window.location.href = result.url;
                else setGoogleError(result.error ?? "Google sign-in is unavailable.");
              })
            }
            className={buttonClass("secondary", 40, "w-full")}
          >
            <GoogleG size={16} />
            <span>Continue with Google</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
