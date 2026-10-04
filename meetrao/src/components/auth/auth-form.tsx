"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { safePath } from "@/lib/safe-path";
import { useState, useTransition } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Field, Help, Input } from "@/components/ui/controls";
import { Callout } from "@/components/ui/panels";
import { GoogleG } from "@/components/ui/logo";
import { Eyebrow } from "@/components/ui/badge";
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
export function AuthForm({ mode, next }: { mode: AuthMode; next?: string }) {
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
      action={submitViaConvex}
      busy={convexPending}
      error={convexError}
      onGoogle={() =>
        startGoogle(async () => {
          setGoogleError(null);
          try {
            // Convex Auth performs the redirect itself.
            await signIn("google", { redirectTo: "/auth/callback" });
          } catch {
            setGoogleError("Google sign-in is unavailable.");
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
  action,
  busy,
  error,
  onGoogle,
  googleBusy,
  googleError,
}: {
  mode: AuthMode;
  next?: string;
  action: (form: FormData) => void;
  busy: boolean;
  error: string | null | undefined;
  onGoogle: () => void;
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
    <div className="flex flex-col gap-[14px]">
      {error ? <Callout tone="red">{error}</Callout> : null}
      {googleError ? <Callout tone="red">{googleError}</Callout> : null}

      <form action={action} className="flex flex-col gap-[14px]">
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
            disabled={googleBusy}
            onClick={onGoogle}
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
