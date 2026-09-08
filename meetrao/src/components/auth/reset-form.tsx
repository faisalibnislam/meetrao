"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Help, Input } from "@/components/ui/controls";
import { Callout } from "@/components/ui/panels";
import { updatePassword, type AuthResult } from "@/lib/actions/auth";

export function ResetForm() {
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(updatePassword, {});

  return (
    <form action={formAction} className="flex flex-col gap-[14px]">
      {state.error ? <Callout tone="red">{state.error}</Callout> : null}

      <Field label="New password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          height={38}
          placeholder="••••••••"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Help>At least 8 characters.</Help>
      </Field>

      <Button type="submit" variant="accent" size={40} full busy={pending} className="mt-[2px]">
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
