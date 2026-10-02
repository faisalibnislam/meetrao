"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Field, Help, Input } from "@/components/ui/controls";
import { Callout } from "@/components/ui/panels";

/**
 * Setting a new password after a reset.
 *
 * Convex Auth emails a CODE and no session, so the code and the address have
 * to travel with the new password. There is nothing signed in to say who is
 * asking. The reset link carries both in the query string; the fields below
 * are the fallback for someone who typed the address by hand or lost the
 * link's parameters.
 */
export function ResetForm({
  email: emailFromLink = "",
  code: codeFromLink = "",
}: {
  email?: string;
  code?: string;
}) {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [convexPending, startConvex] = useTransition();
  const [convexError, setConvexError] = useState<string | null>(null);

  function submitViaConvex(form: FormData) {
    startConvex(async () => {
      setConvexError(null);
      const email = String(form.get("email") ?? emailFromLink).trim().toLowerCase();
      const code = String(form.get("code") ?? codeFromLink).trim();
      const newPassword = String(form.get("password") ?? "");

      if (!email || !code) {
        setConvexError("That reset link is incomplete. Request a new one.");
        return;
      }

      try {
        await signIn("password", { email, code, newPassword, flow: "reset-verification" });
        router.push("/dashboard?updated=password");
        router.refresh();
      } catch {
        // Expired, already used, or simply wrong, all the same to the person
        // holding it, and all fixed the same way.
        setConvexError("That reset link has expired. Request a new one.");
      }
    });
  }

  const needsLinkFields = !emailFromLink || !codeFromLink;

  return (
    <Fields
      action={submitViaConvex}
      busy={convexPending}
      error={convexError}
      showLinkFields={needsLinkFields}
      email={emailFromLink}
      code={codeFromLink}
    />
  );
}

function Fields({
  action,
  busy,
  error,
  showLinkFields,
  email = "",
  code = "",
}: {
  action: (form: FormData) => void;
  busy: boolean;
  error: string | null | undefined;
  showLinkFields: boolean;
  email?: string;
  code?: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-[14px]">
      {error ? <Callout tone="red">{error}</Callout> : null}

      {!showLinkFields && (email || code) ? (
        <>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="code" value={code} />
        </>
      ) : null}

      {showLinkFields ? (
        <>
          <Field label="Work email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              height={38}
              placeholder="you@company.com"
              autoComplete="email"
              defaultValue={email}
              required
            />
          </Field>
          <Field label="Reset code" htmlFor="code">
            <Input id="code" name="code" type="text" height={38} placeholder="From the email" required />
            <Help>The code in the email we just sent.</Help>
          </Field>
        </>
      ) : null}

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

      <Button type="submit" variant="accent" size={40} full busy={busy} className="mt-[2px]">
        {busy ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
