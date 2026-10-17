"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { safePath } from "@/lib/safe-path";
import { useState, useTransition, type ReactNode } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Field, Help, Input } from "@/components/ui/controls";
import { Callout } from "@/components/ui/panels";
import { GoogleG } from "@/components/ui/logo";
import { buttonClass } from "@/components/ui/button-class";
import { useClientValue } from "@/lib/use-client-value";
import { detectTimezone, nearestSupportedTimezone } from "@/lib/timezones";

export type AuthMode = "login" | "signup" | "forgot";

/**
 * ONE message, whatever went wrong.
 *
 * Not laziness, a form that distinguishes "no such account" from "wrong
 * password" is an account-enumeration oracle. Do not be tempted to surface
 * Convex Auth's own error to make debugging easier.
 */
const GENERIC = "That email and password do not match an account.";

const CTA = { login: "Sign in", signup: "Create account", forgot: "Send reset link" } as const;

/**
 * `useAuthActions` may only be called where `ConvexAuthNextjsProvider` is
 * mounted, which is why this is a client component and why the flows below
 * are not server actions: Convex Auth has no server-side `signIn`, and the
 * cookie the proxy reads is written HERE, in the browser.
 */
export function AuthForm({
  mode,
  next,
  switchLink,
}: {
  mode: AuthMode;
  next?: string;
  /** "Already have an account? Sign in", set directly under the main button. */
  switchLink?: ReactNode;
}) {
  const [googlePending, startGoogle] = useTransition();
  const [googleError, setGoogleError] = useState<string | null>(null);

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
        router.push(safePath(next, "/dashboard"));
        router.refresh();
      } catch {
        setConvexError(mode === "signup" ? "That email could not be registered." : GENERIC);
      }
    });
  }

  return (
    <Fields
      mode={mode}
      next={next}
      switchLink={switchLink}
      action={submitViaConvex}
      busy={convexPending}
      error={convexError}
      onProvider={(provider) =>
        startGoogle(async () => {
          setGoogleError(null);
          try {
            // Convex Auth performs the redirect itself.
            await signIn(provider, { redirectTo: "/auth/callback" });
          } catch {
            setGoogleError(provider === "apple" ? "Apple sign-in is unavailable." : "Google sign-in is unavailable.");
          }
        })
      }
      googleBusy={googlePending}
      googleError={googleError}
    />
  );
}

function Fields({
  mode,
  next,
  switchLink,
  action,
  busy,
  error,
  onProvider,
  googleBusy,
  googleError,
}: {
  mode: AuthMode;
  next?: string;
  switchLink?: ReactNode;
  action: (form: FormData) => void;
  busy: boolean;
  error: string | null | undefined;
  onProvider: (provider: "google" | "apple") => void;
  googleBusy: boolean;
  googleError: string | null;
}) {

  const isForgot = mode === "forgot";
  const isSignup = mode === "signup";

  // The device's own zone, mapped to one this app offers. Read through
  // useClientValue so the server renders "UTC" and the client corrects it
  // after hydration, reading Intl during render would mismatch.
  const timezone = useClientValue(() => nearestSupportedTimezone(detectTimezone()), "UTC");

  return (
    <div className="flex flex-col gap-[18px]">
      {error ? <Callout tone="red">{error}</Callout> : null}
      {googleError ? <Callout tone="red">{googleError}</Callout> : null}

      <form action={action} className="flex flex-col gap-[18px]">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {/* Registration sets the host's timezone from their own device, so a
            new account never offers its hours in UTC by accident. Changed
            later in Settings like any other. */}
        {isSignup ? <input type="hidden" name="timezone" value={timezone} /> : null}

        {isSignup ? (
          <Field label="Full name" htmlFor="full_name">
            <Input id="full_name" name="full_name" type="text" height={50} look="filled" placeholder="Adam Voigt" autoComplete="name" required />
          </Field>
        ) : null}

        <Field label="Work email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            height={50} look="filled"
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
              height={50} look="filled"
              placeholder="••••••••"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={isSignup ? 8 : undefined}
            />
            {isSignup ? <Help>At least 8 characters.</Help> : null}
          </Field>
        ) : null}

        <Button type="submit" variant="accent" size={52} full busy={busy} className="mt-[6px]">
          {busy && mode === "login" ? "Signing in…" : CTA[mode]}
        </Button>
      </form>

      {switchLink ? <div className="-mt-[4px] text-center text-[13.5px] text-ink-2">{switchLink}</div> : null}

      {!isForgot ? (
        <div className="flex flex-col gap-[14px]">
          <div className="flex items-center gap-[14px] px-[40px]">
            <span aria-hidden="true" className="h-[1px] flex-1 bg-line" />
            <span className="text-[13px] text-ink-3">Or</span>
            <span aria-hidden="true" className="h-[1px] flex-1 bg-line" />
          </div>

          <button
            type="button"
            disabled={googleBusy}
            onClick={() => onProvider("google")}
            className={buttonClass("secondary", 52, "w-full")}
          >
            <GoogleG size={18} />
            <span>{mode === "signup" ? "Sign up with Google" : "Continue with Google"}</span>
          </button>

          {/* Off until the Apple Developer side exists: see the note on Apple in
              convex/auth.ts. Read at build time, like every NEXT_PUBLIC_ value. */}
          {process.env.NEXT_PUBLIC_APPLE_SIGN_IN === "1" ? (
            <button
              type="button"
              disabled={googleBusy}
              onClick={() => onProvider("apple")}
              className={buttonClass("secondary", 52, "w-full")}
            >
              <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" focusable="false" className="block flex-none">
                <path
                  fill="currentColor"
                  d="M16.37 12.6c-.02-2.25 1.84-3.33 1.92-3.38-1.05-1.53-2.68-1.74-3.26-1.76-1.39-.14-2.71.82-3.42.82-.7 0-1.79-.8-2.94-.78-1.51.02-2.91.88-3.69 2.24-1.57 2.73-.4 6.77 1.13 8.98.75 1.08 1.64 2.3 2.81 2.25 1.13-.04 1.55-.73 2.92-.73 1.36 0 1.75.73 2.94.71 1.21-.02 1.98-1.1 2.72-2.19.86-1.25 1.21-2.47 1.23-2.53-.03-.01-2.35-.9-2.36-3.63ZM14.13 5.99c.62-.75 1.04-1.8.93-2.84-.9.04-1.98.6-2.62 1.35-.58.66-1.08 1.72-.94 2.74 1 .08 2.02-.51 2.63-1.25Z"
                />
              </svg>
              <span>Continue with Apple</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
