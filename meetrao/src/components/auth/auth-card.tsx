import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Eyebrow } from "@/components/ui/badge";
import { LogoLink } from "@/components/ui/logo";

/* One two-column card for log in, sign up and forgot password.
   The right column is a value proposition, not a control surface, so it is
   hidden entirely on mobile rather than stacked below the form. */

const POINTS = [
  "Guests pick from times you are actually free.",
  "Every booking gets a Google Meet link automatically.",
  "One link works across every timezone.",
];

export function AuthCard({
  title,
  blurb,
  children,
  footer,
}: {
  title: string;
  blurb: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="box-border flex min-h-screen items-start justify-center p-[20px]">
      <div className="m-auto grid w-full max-w-[940px] grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] overflow-hidden rounded-[12px] border border-line bg-surface max-[820px]:grid-cols-[1fr]">
        <div className="flex min-w-0 flex-col gap-[26px] p-[40px] max-[820px]:p-[28px]">
          <LogoLink height={26} />

          <div className="flex flex-col gap-[8px]">
            <h1 className="m-0 font-serif text-[38px] leading-[1.05] font-normal tracking-[-0.01em] text-ink">
              {title}
            </h1>
            <p className="m-0 max-w-[38ch] text-[14px] leading-[1.55] text-pretty text-ink-2">{blurb}</p>
          </div>

          {children}
          {footer}
        </div>

        <aside className="flex min-w-0 flex-col justify-center gap-[16px] border-l border-line bg-fill p-[40px] max-[820px]:hidden">
          <Eyebrow size={10.5}>Scheduling without the back-and-forth</Eyebrow>
          <p className="m-0 font-serif text-[25px] leading-[1.2] font-normal text-pretty text-ink">
            Share one link. Guests pick a time that is genuinely free.
          </p>
          <div className="mt-[2px] flex flex-col gap-[12px]">
            {POINTS.map((text) => (
              <div key={text} className="flex items-start gap-[10px]">
                <Icon name="check" weight="solid" size={10} className="mt-[4px] flex-none text-accent" />
                <span className="text-[13px] leading-[1.5] text-ink-2">{text}</span>
              </div>
            ))}
          </div>

          {/* The plan shape, where somebody is deciding whether to sign up at
              all. A visitor who finds out about a paid tier after investing an
              afternoon feels misled, even when nothing was hidden. */}
          <div className="mt-[6px] rounded-[8px] border border-line bg-surface px-[14px] py-[12px]">
            <span className="text-[12.5px] leading-[1.55] text-ink-2">
              <strong className="font-semibold text-ink">Free to take bookings.</strong> Pro is $10 a year
              when you want your own domain, your own branding or a team link.{" "}
              <Link href="/pricing" className="font-semibold">
                Compare
              </Link>
              .
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
