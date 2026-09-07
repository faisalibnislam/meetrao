"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Eyebrow } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import {
  abandonVerification,
  checkVerification,
  resendVerificationEmail,
} from "@/lib/actions/verification";

/**
 * The gate between sign-up and onboarding.
 *
 * The design's prototype had an "I have confirmed my email" button standing in
 * for clicking the link. Here it does something real: it re-reads the user and
 * lets them through if Supabase has stamped the address, which is what makes it
 * useful when the link was opened in another tab or on a phone.
 */
export function VerifyCard({ email }: { email: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const [checking, startCheck] = useTransition();
  const [resending, startResend] = useTransition();
  const [resent, setResent] = useState(false);

  function confirm() {
    startCheck(async () => {
      const result = await checkVerification();
      if (!result.ok) {
        notify("bad", "Not confirmed yet", result.message ?? "Try again.");
        return;
      }
      notify("ok", "Email confirmed", "Welcome to Meetrao.");
      router.push("/onboarding/1");
    });
  }

  function resend() {
    startResend(async () => {
      const result = await resendVerificationEmail();
      if (!result.ok) {
        notify("bad", "Could not resend", result.message ?? "Try again.");
        return;
      }
      setResent(true);
      notify("ok", "Sent again", `Another link is on its way to ${email}.`);
    });
  }

  return (
    <div className="flex w-full max-w-[470px] flex-col gap-[14px]">
      <div className="flex flex-col gap-[18px] rounded-[12px] border border-line bg-surface p-[32px]">
        <span className="inline-flex size-[38px] items-center justify-center rounded-[9px] bg-accent-soft">
          <Icon name="circleInfo" size={17} className="text-accent" />
        </span>

        <div className="flex flex-col gap-[8px]">
          <h1 className="m-0 font-serif text-[32px] leading-[1.1] font-normal text-ink">
            Confirm your email
          </h1>
          <p className="m-0 text-[13.5px] leading-[1.6] text-ink-2 text-pretty">
            We sent a verification link to{" "}
            <strong className="font-semibold text-ink">{email}</strong>. Open it
            to activate your account — you can&apos;t use Meetrao until you do.
          </p>
        </div>

        <div className="flex flex-col gap-[6px] rounded-[8px] bg-fill px-[15px] py-[13px]">
          <Eyebrow>While you wait</Eyebrow>
          <span className="text-[12.5px] leading-[1.55] text-ink-2">
            The link expires in 24 hours. If it isn&apos;t in your inbox, check
            your spam folder.
          </span>
        </div>

        <div className="flex flex-col gap-[9px]">
          <Button size="xl" full loading={checking} onClick={confirm}>
            I have confirmed my email
          </Button>

          <Button
            variant="secondary"
            size="xl"
            full
            loading={resending}
            onClick={resend}
          >
            {resent ? (
              <>
                <Icon name="check" weight={900} size={11} className="text-accent" />
                Sent again
              </>
            ) : (
              "Resend the email"
            )}
          </Button>

          <form action={abandonVerification}>
            <Button variant="ghost" size="xl" full type="submit">
              Use a different email
            </Button>
          </form>
        </div>
      </div>

      <span className="text-center text-[12.5px] text-ink-3">
        Wrong account?{" "}
        <Link href="/login" className="font-medium text-ink">
          Sign in as someone else.
        </Link>
      </span>
    </div>
  );
}
