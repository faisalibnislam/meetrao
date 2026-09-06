import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/ui/icon";
import { Eyebrow } from "@/components/ui/controls";

const VALUE_POINTS = [
  "Guests pick from times you are actually free.",
  "Every booking gets a Google Meet link automatically.",
  "One link works across every timezone.",
];

/**
 * The two-column auth card. The right aside is a value prop only, so it is
 * dropped entirely below `md` rather than stacked.
 */
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
    <div className="flex min-h-dvh items-start justify-center bg-ground p-[20px]">
      <div className="m-auto grid w-full max-w-[940px] overflow-hidden rounded-[12px] border border-line bg-surface md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <div className="flex min-w-0 flex-col gap-[26px] p-[40px]">
          <Link
            href="/"
            title="Meetrao home"
            className="block self-start no-underline"
          >
            <Logo height={26} />
          </Link>

          <div className="flex flex-col gap-[8px]">
            <h1 className="m-0 font-serif text-[38px] leading-[1.05] font-normal tracking-[-0.01em] text-ink">
              {title}
            </h1>
            <p className="m-0 max-w-[38ch] text-[14px] leading-[1.55] text-pretty text-ink-2">
              {blurb}
            </p>
          </div>

          {children}

          {footer ? (
            <div className="flex items-center gap-[6px] text-[13px] text-ink-2">
              {footer}
            </div>
          ) : null}
        </div>

        <aside className="hidden min-w-0 flex-col justify-center gap-[16px] border-l border-line bg-fill p-[40px] md:flex">
          <Eyebrow>Scheduling without the back-and-forth</Eyebrow>
          <p className="m-0 font-serif text-[25px] leading-[1.2] font-normal text-pretty text-ink">
            Share one link. Guests pick a time that is genuinely free.
          </p>
          <div className="mt-[2px] flex flex-col gap-[12px]">
            {VALUE_POINTS.map((point) => (
              <div key={point} className="flex items-start gap-[10px]">
                <Icon
                  name="check"
                  weight={900}
                  size={10}
                  className="mt-[4px] text-accent"
                />
                <span className="text-[13px] leading-[1.5] text-ink-2">
                  {point}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
