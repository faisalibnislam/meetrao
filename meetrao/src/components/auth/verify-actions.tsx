"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Callout } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { checkVerified, resendVerification } from "@/lib/actions/auth-client";

/* In the prototype the confirm button stands in for clicking the emailed link.
   In production the link itself verifies, so this re-reads the session, and
   says so plainly when it is still unconfirmed rather than letting the user
   through. */
export function VerifyActions({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [checking, startCheck] = useTransition();
  const [resending, startResend] = useTransition();
  const [sentCount, setSentCount] = useState(0);
  const [stillWaiting, setStillWaiting] = useState(false);

  return (
    <div className="flex flex-col gap-[9px]">
      {stillWaiting ? (
        <Callout tone="amber" title="Not confirmed yet">
          Open the link in the email we sent. This page will let you through once you have.
        </Callout>
      ) : null}

      <Button
        variant="accent"
        size={42}
        full
        busy={checking}
        onClick={() =>
          startCheck(async () => {
            setStillWaiting(false);
            const ok = await checkVerified();
            if (ok) {
              toast({ tone: "ok", title: "Email verified", text: "Welcome to Meetrao." });
              router.replace("/onboarding/1");
              router.refresh();
            } else {
              setStillWaiting(true);
            }
          })
        }
      >
        {checking ? "Verifying…" : "I have confirmed my email"}
      </Button>

      <div className="flex flex-wrap gap-[8px]">
        <Button
          variant="secondary"
          size={38}
          busy={resending}
          disabled={!signedIn}
          className="min-w-[150px] flex-1"
          onClick={() =>
            startResend(async () => {
              const result = await resendVerification();
              if (result.error) {
                toast({ tone: "bad", title: "Could not resend", text: result.error });
                return;
              }
              setSentCount((n) => n + 1);
              toast({ tone: "ok", title: "Email sent", text: "A new verification link is on its way." });
            })
          }
        >
          <span className="inline-flex items-center gap-[8px]">
            {sentCount > 0 && !resending ? (
              <Icon name="check" weight="solid" size={10} className="text-accent-ink" />
            ) : null}
            {resending ? "Sending…" : sentCount > 0 ? "Sent again" : "Resend the email"}
          </span>
        </Button>

        <Button variant="ghost" size={38} onClick={() => router.push("/signup")}>
          Use a different email
        </Button>
      </div>
    </div>
  );
}
