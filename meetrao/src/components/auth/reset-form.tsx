"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Field, Help, Input } from "@/components/ui/controls";
import { Callout } from "@/components/ui/panels";
import { updatePassword, type AuthResult } from "@/lib/actions/auth";

/**
 * Setting a new password after a reset.
 *
 * The two backends hand the person here differently, and it shows in the
 * markup:
 *
 *   · Supabase emails a link that signs them in, so the form only needs a new
 *     password — the session says who they are.
 *   · Convex Auth emails a CODE and no session, so the code and the address
 *     have to travel with the new password. The reset link carries both in
 *     the query string; the fields below are the fallback for someone who
 *     typed the address by hand or lost the link's parameters.
 */
export function ResetForm({
  convexAuth = false,
  email: emailFromLink = "",
  code: codeFromLink = "",
}: {
  convexAuth?: boolean;
  email?: string;
  code?: string;
}) {
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(updatePassword, {});
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
        // Expired, already used, or simply wrong — all the same to the person
        // holding it, and all fixed the same way.
        setConvexError("That reset link has expired. Request a new one.");
      }
    });
  }

  const busy = convexAuth ? convexPending : pending;
  const error = convexAuth ? convexError : state.error;
  const needsLinkFields = convexAuth && (!emailFromLink || !codeFromLink);

  return (
    <form
      action={convexAuth ? submitViaConvex : formAction}
      className="flex flex-col gap-[14px]"
    >
      {error ? <Callout tone="red">{error}</Callout> : null}

      {convexAuth && !needsLinkFields ? (
        <>
          <input type="hidden" name="email" value={emailFromLink} />
          <input type="hidden" name="code" value={codeFromLink} />
        </>
      ) : null}

      {needsLinkFields ? (
        <>
          <Field label="Work email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              height={38}
              placeholder="you@company.com"
              autoComplete="email"
              defaultValue={emailFromLink}
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
