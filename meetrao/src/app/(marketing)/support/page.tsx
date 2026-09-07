import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { SupportForm } from "@/components/marketing/support-form";

export const metadata: Metadata = {
  title: "Contact support",
  description:
    "Tell us what you were trying to do and what happened instead. A person reads every message.",
};

const COMMON = [
  { q: "Google Calendar won't connect", href: "/help#getting-started" },
  { q: "Guests are seeing the wrong times", href: "/help#availability" },
  { q: "How do I stop a meeting being booked?", href: "/help#meetings" },
  { q: "Can I reschedule instead of cancelling?", href: "/help#bookings" },
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-[18px] py-[48px] sm:px-[26px]">
      <div className="flex max-w-[720px] flex-col gap-[14px]">
        <span className="font-mono text-[10.5px] tracking-[0.14em] text-accent uppercase">
          Contact support
        </span>
        <h1 className="m-0 font-serif text-[clamp(30px,4.6vw,52px)] leading-[1.04] font-normal tracking-[-0.02em] text-ink text-balance">
          Get in touch
        </h1>
        <p className="m-0 text-[15px] leading-[1.65] text-ink-2 text-pretty">
          Tell us what you were trying to do and what happened instead. A person
          reads every message.
        </p>
      </div>

      <div className="mt-[30px] grid items-start gap-[22px] min-[881px]:grid-cols-[minmax(0,1fr)_300px]">
        <SupportForm />

        <div className="flex flex-col gap-[14px]">
          <div className="flex flex-col gap-[12px] rounded-[14px] border border-line bg-surface p-[20px]">
            <span className="text-[13.5px] font-semibold text-ink">
              Faster than writing
            </span>
            <p className="m-0 text-[12.5px] leading-[1.6] text-ink-3">
              Most questions are already answered. These come up most often:
            </p>
            <div className="flex flex-col gap-[2px]">
              {COMMON.map((item) => (
                <Link
                  key={item.q}
                  href={item.href}
                  className="flex min-h-[44px] items-center gap-[10px] rounded-[7px] px-[8px] text-[13px] text-ink-2 no-underline hover:bg-fill hover:text-ink"
                >
                  <span className="min-w-0 flex-1">{item.q}</span>
                  <Icon name="chevronRight" size={11} className="flex-none text-ink-3" />
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-[14px] rounded-[14px] border border-line bg-surface p-[20px]">
            <span className="text-[13.5px] font-semibold text-ink">
              Other ways to reach us
            </span>
            <div className="flex items-start gap-[11px]">
              <Icon name="link" size={13} className="mt-[3px] w-[17px] flex-none text-center text-accent" />
              <div className="flex min-w-0 flex-col gap-[2px]">
                <a
                  href="mailto:hello@airlystudio.com"
                  className="font-mono text-[12.5px] text-ink no-underline hover:text-accent"
                >
                  hello@airlystudio.com
                </a>
                <span className="text-[12.5px] leading-[1.55] text-ink-3">
                  Or just reply to any Meetrao email.
                </span>
              </div>
            </div>
            <div className="flex items-start gap-[11px]">
              <Icon name="clock" size={13} className="mt-[3px] w-[17px] flex-none text-center text-accent" />
              <div className="flex min-w-0 flex-col gap-[2px]">
                <span className="text-[12.5px] font-semibold text-ink">
                  Within one working day
                </span>
                <span className="text-[12.5px] leading-[1.55] text-ink-3">
                  We are a small team across Bangladesh and the US, so replies
                  land at odd hours.
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-[11px] rounded-[12px] border border-amber-line bg-amber-soft p-[16px]">
            <Icon
              name="triangleExclamation"
              weight={900}
              size={13}
              className="mt-[3px] flex-none text-amber"
            />
            <div className="flex min-w-0 flex-col gap-[3px]">
              <span className="text-[12.5px] font-semibold text-amber-ink">
                Reporting something urgent?
              </span>
              <span className="text-[12.5px] leading-[1.55] text-amber-ink">
                If a booking is going wrong right now, say so in the first line
                and include the guest&apos;s email so we can find it quickly.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
