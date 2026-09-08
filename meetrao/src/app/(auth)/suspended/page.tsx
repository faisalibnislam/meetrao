import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Account suspended" };

/* Suspension blocks sign-in and stops new bookings, but leaves existing
   bookings on the calendar. It is reversible, and this page says so. */
export default function SuspendedPage() {
  return (
    <div className="box-border flex min-h-screen items-start justify-center p-[20px]">
      <div className="m-auto flex w-full max-w-[470px] flex-col gap-[14px]">
        <Logo height={21} className="self-start" />

        <div className="flex flex-col gap-[18px] rounded-[12px] border border-line bg-surface p-[32px]">
          <span className="inline-flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-red-soft text-red">
            <Icon name="lock" size={16} />
          </span>

          <div className="flex flex-col gap-[9px]">
            <h1 className="m-0 font-serif text-[32px] leading-[1.08] font-normal tracking-[-0.012em] text-ink">
              This account is suspended
            </h1>
            <p className="m-0 text-[14px] leading-[1.6] text-pretty text-ink-2">
              You can&rsquo;t sign in and your booking page is not taking new bookings. Meetings already on your
              calendar are unaffected.
            </p>
          </div>

          <div className="flex flex-wrap gap-[9px]">
            <ButtonLink variant="accent" size={38} href="/support">
              Contact support
            </ButtonLink>
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
