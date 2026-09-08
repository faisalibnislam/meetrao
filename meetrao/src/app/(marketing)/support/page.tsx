import type { Metadata } from "next";
import Link from "next/link";
import { SupportForm } from "@/components/marketing/support-form";
import { Eyebrow } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { optionalSession } from "@/lib/data/session";

export const metadata: Metadata = {
  title: "Support",
  description: "Tell us what you were trying to do and what happened instead. A person reads every message.",
};

const SHORTCUTS: [string, string][] = [
  ["/help#start", "I signed up but cannot sign in"],
  ["/help#availability", "A time was offered when I was busy"],
  ["/help#bookings", "How do I cancel a booking?"],
  ["/help#emails", "I am not getting booking emails"],
  ["/help#faq", "Can guests reschedule?"],
];

export default async function SupportPage() {
  // Signed in, the form takes the identity from the account rather than asking
  // for a name and address the sender could get wrong.
  const session = await optionalSession();

  return (
    <>
      <div className="border-b border-line bg-ground">
        <div className="mx-auto flex max-w-[1148px] flex-wrap items-center justify-between gap-[12px] px-[26px] py-[14px] max-[560px]:px-[18px]">
          <span className="text-[13.5px] font-semibold text-ink">Support</span>
          <Link
            href="/help"
            className="unlink inline-flex items-center gap-[8px] rounded-[6px] px-[9px] py-[5px] text-[13px] text-ink-2 hover:bg-fill hover:text-ink"
          >
            <Icon name="circle-question" size={12} />
            Help centre
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1148px] flex-wrap items-start gap-[40px] px-[26px] pt-[40px] pb-[64px] max-[560px]:px-[18px]">
        <div className="flex min-w-[300px] flex-1 flex-col gap-[22px]">
          <div className="flex flex-col gap-[10px]">
            <h1 className="m-0 font-serif text-[clamp(30px,3.6vw,42px)] leading-[1.05] font-normal tracking-[-0.02em] text-ink">
              Get in touch
            </h1>
            <p className="m-0 max-w-[52ch] text-[15px] leading-[1.6] text-pretty text-ink-2">
              Tell us what you were trying to do and what happened instead. A person reads every message.
            </p>
          </div>

          <SupportForm
            signedIn={Boolean(session)}
            accountName={session ? session.profile.full_name || session.profile.username : ""}
            accountEmail={session?.profile.email ?? ""}
          />
        </div>

        <aside className="flex w-[320px] flex-none flex-col gap-[16px] max-[880px]:w-full">
          <div className="flex flex-col gap-[12px] rounded-[12px] border border-line bg-surface px-[18px] py-[17px]">
            <Eyebrow>Faster than writing</Eyebrow>
            <p className="m-0 text-[13px] leading-[1.55] text-ink-2">
              Most questions are already answered. These come up most often:
            </p>
            <div className="flex flex-col gap-[2px]">
              {SHORTCUTS.map(([href, label]) => (
                <Link
                  key={label}
                  href={href}
                  className="unlink flex items-center gap-[10px] rounded-[6px] px-[9px] py-[8px] text-[13px] text-ink-2 hover:bg-fill hover:text-ink"
                >
                  <Icon name="chevron-right" size={9} className="flex-none text-ink-3" />
                  <span className="min-w-0 flex-1">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-[14px] rounded-[12px] border border-line bg-surface px-[18px] py-[17px]">
            <Eyebrow>Other ways to reach us</Eyebrow>

            <div className="flex gap-[11px]">
              <Icon name="envelope" size={13} className="mt-[3px] w-[16px] flex-none text-ink-3" />
              <div className="flex min-w-0 flex-col gap-[2px]">
                <a href="mailto:hello@airlystudio.com" className="text-[13.5px]">
                  hello@airlystudio.com
                </a>
                <span className="text-[12.5px] leading-[1.5] text-ink-3">
                  Or just reply to any Meetrao email.
                </span>
              </div>
            </div>

            <div className="flex gap-[11px]">
              <Icon name="clock" size={13} className="mt-[3px] w-[16px] flex-none text-ink-3" />
              <div className="flex min-w-0 flex-col gap-[2px]">
                <span className="text-[13.5px] font-semibold text-ink">Within one working day</span>
                <span className="text-[12.5px] leading-[1.5] text-ink-3">
                  We are a small team across Bangladesh and the US, so replies land at odd hours.
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[5px] rounded-[12px] border border-amber-line bg-amber-soft px-[18px] py-[16px]">
            <span className="text-[13.5px] font-semibold text-amber-ink">Reporting something urgent?</span>
            <span className="text-[12.5px] leading-[1.55] text-pretty text-amber-ink">
              If a booking is going wrong right now, say so in the first line and include the guest&rsquo;s email
              so we can find it quickly.
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}
