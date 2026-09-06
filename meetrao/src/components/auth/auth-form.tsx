"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { GoogleG } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import {
  resetPasswordAction,
  signInAction,
  signUpAction,
  googleAuthAction,
  type AuthState,
} from "@/app/(auth)/actions";

export type AuthMode = "login" | "signup" | "forgot";

const CTA: Record<AuthMode, string> = {
  login: "Sign in",
  signup: "Create account",
  forgot: "Send reset link",
};

const ACTION = {
  login: signInAction,
  signup: signUpAction,
  forgot: resetPasswordAction,
} as const;

/** Submit button that reads the enclosing form's pending state. */
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="3xl" full loading={pending} className="mt-[2px]">
      {label}
    </Button>
  );
}

function GoogleButton({ next }: { next?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="3xl" full loading={pending}>
      {!pending ? <GoogleG size={16} /> : null}
      <span>Continue with Google</span>
      {next ? <input type="hidden" name="next" value={next} /> : null}
    </Button>
  );
}

export function AuthForm({ mode, next }: { mode: AuthMode; next?: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    ACTION[mode],
    {},
  );

  const showPassword = mode !== "forgot";

  return (
    <div className="flex flex-col gap-[14px]">
      {state.error ? (
        <div
          role="alert"
          className="flex gap-[10px] rounded-[8px] border border-red-line bg-red-soft px-[13px] py-[11px]"
        >
          <Icon
            name="circleExclamation"
            weight={900}
            size={12}
            className="mt-[2px] text-red"
          />
          <span className="text-[12.5px] leading-[1.5] text-red-ink">
            {state.error}
          </span>
        </div>
      ) : null}

      {state.notice ? (
        <div
          role="status"
          className="flex gap-[10px] rounded-[8px] border border-accent-line bg-accent-soft px-[13px] py-[11px]"
        >
          <Icon
            name="circleCheck"
            weight={900}
            size={12}
            className="mt-[2px] text-accent"
          />
          <span className="text-[12.5px] leading-[1.5] text-ink-2">
            {state.notice}
          </span>
        </div>
      ) : null}

      <form action={formAction} className="flex flex-col gap-[14px]">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {mode === "signup" ? (
          <Field label="Full name">
            <Input
              name="full_name"
              type="text"
              autoComplete="name"
              placeholder="Faisal Rahman"
              fieldSize="lg"
              required
            />
          </Field>
        ) : null}

        <Field label="Work email">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            fieldSize="lg"
            required
          />
        </Field>

        {showPassword ? (
          <Field
            label="Password"
            labelHint={
              mode === "login" ? (
                <Link href="/forgot" className="text-[12px] font-medium">
                  Forgot?
                </Link>
              ) : undefined
            }
            helper={mode === "signup" ? "At least 8 characters." : undefined}
          >
            <Input
              name="password"
              type="password"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              placeholder="••••••••"
              fieldSize="lg"
              minLength={mode === "signup" ? 8 : undefined}
              required
            />
          </Field>
        ) : null}

        <SubmitButton label={CTA[mode]} />
      </form>

      {showPassword ? (
        <div className="flex flex-col gap-[14px]">
          <div className="flex items-center gap-[12px]">
            <span className="h-px flex-1 bg-line" />
            <span className="font-mono text-[10.5px] tracking-[0.08em] uppercase text-ink-3">
              or
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <form action={googleAuthAction}>
            <GoogleButton next={mode === "signup" ? "/onboarding/1" : next} />
          </form>
        </div>
      ) : null}
    </div>
  );
}
