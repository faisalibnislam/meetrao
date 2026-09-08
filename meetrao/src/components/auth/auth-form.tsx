"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Help, Input } from "@/components/ui/controls";
import { Callout } from "@/components/ui/panels";
import { GoogleG } from "@/components/ui/logo";
import { Eyebrow } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import {
  sendPasswordReset,
  signInWithPassword,
  signUpWithPassword,
  startGoogleSignIn,
  type AuthResult,
} from "@/lib/actions/auth";

export type AuthMode = "login" | "signup" | "forgot";

const ACTION = {
  login: signInWithPassword,
  signup: signUpWithPassword,
  forgot: sendPasswordReset,
} as const;

const CTA = { login: "Sign in", signup: "Create account", forgot: "Send reset link" } as const;

export function AuthForm({ mode, next }: { mode: AuthMode; next?: string }) {
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(ACTION[mode], {});
  const [googlePending, startGoogle] = useTransition();
  const [googleError, setGoogleError] = useState<string | null>(null);

  const isForgot = mode === "forgot";
  const isSignup = mode === "signup";

  return (
    <div className="flex flex-col gap-[14px]">
      {state.error ? <Callout tone="red">{state.error}</Callout> : null}
      {googleError ? <Callout tone="red">{googleError}</Callout> : null}

      <form action={formAction} className="flex flex-col gap-[14px]">
        {next ? <input type="hidden" name="next" value={next} /> : null}

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

        <Button type="submit" variant="accent" size={40} full busy={pending} className="mt-[2px]">
          {pending && mode === "login" ? "Signing in…" : CTA[mode]}
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
                const result = await startGoogleSignIn();
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
