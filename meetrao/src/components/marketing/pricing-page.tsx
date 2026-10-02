import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Kicker } from "./site-chrome";
import { Reveal } from "./reveal";
import { DENIALS, HEADLINE, PRICING_FAQ, PRO_MONTHLY, PRO_YEARLY } from "@/lib/pricing";
import { PlanComparison } from "./plan-comparison";

/* ─────────────────────────────────────────────────────────────────────────────
   The pricing page.

   Section order is the argument, the same way it is on the comparison pages.
   A page about something free has to earn belief before it asks for a sign-up,
   so "what it cannot do" comes BEFORE the call to action, not in small print
   underneath it. Somebody who needs Outlook should learn that here, in ten
   seconds, rather than after connecting a calendar.

   There is one price and one tier, so there is no plan grid. Three columns of
   ticks where two columns are empty is a layout that exists to make an upsell
   legible, and inventing one here would be pure theatre.
   ───────────────────────────────────────────────────────────────────────────── */

export function PricingPage() {
  return (
    <>
      {/* ── the number ────────────────────────────────────────────────────── */}
      <section className="bg-[#F4F3ED]">
        <div className="mx-auto max-w-[1200px] px-[26px] pt-[72px] pb-[56px] max-[560px]:px-[18px] max-[560px]:pt-[48px]">
          <div className="flex max-w-[760px] flex-col gap-[14px]">
            <Kicker tone="dark">Pricing</Kicker>
            <h1 className="m-0 font-serif text-[clamp(32px,4.6vw,54px)] leading-[1.03] font-normal tracking-[-0.02em] text-balance text-ink">
              {HEADLINE}
            </h1>
            <p className="m-0 text-[16px] leading-[1.6] text-pretty text-ink-2">
              Taking bookings is free, and that is the whole booking product, not a sample of it. Pro is{" "}
              {PRO_YEARLY} and adds the parts a business needs: your own domain, your own branding, a team
              link, and the API.
            </p>

            <div className="mt-[6px] flex flex-wrap gap-[10px]">
              {DENIALS.map(([title, body]) => (
                <div
                  key={title}
                  className="flex min-w-[min(260px,100%)] flex-1 flex-col gap-[5px] rounded-[10px] border border-accent-line bg-accent-soft px-[15px] py-[13px]"
                >
                  <span className="flex items-center gap-[7px] text-[13.5px] font-semibold text-ink">
                    <Icon name="check" weight="solid" size={11} className="flex-none text-accent-ink" />
                    {title}
                  </span>
                  <span className="text-[13px] leading-[1.5] text-pretty text-ink-2">{body}</span>
                </div>
              ))}
            </div>

            <div className="mt-[10px] flex flex-wrap items-center gap-[10px]">
              <Link
                href="/signup"
                className="unlink inline-flex h-[44px] items-center rounded-[8px] bg-accent px-[18px] text-[14px] font-semibold whitespace-nowrap text-on-accent no-underline hover:bg-accent-2 hover:text-on-accent"
              >
                Create a free account
              </Link>
              <Link
                href="/#how"
                className="unlink inline-flex h-[44px] items-center rounded-[8px] border border-line-strong bg-surface px-[18px] text-[14px] font-semibold text-ink no-underline hover:bg-fill"
              >
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── the two plans, side by side ───────────────────────────────────── */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <Reveal>
            <h2 className="m-0 font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
              Free and Pro, side by side
            </h2>
            <p className="mt-[10px] mb-[26px] max-w-[660px] text-[14px] leading-[1.6] text-ink-2">
              Free is the whole booking product, not a trial of it. Pro is for people running a business on
              it, their own domain, their own branding, a team. Nothing your guests touch is behind the paid
              plan.
            </p>

            <PlanComparison />
            <div className="mt-[26px] flex flex-wrap items-center gap-[12px]">
              <Link
                href="/signup"
                className="unlink inline-flex h-[44px] items-center rounded-[8px] bg-accent px-[18px] text-[14px] font-semibold whitespace-nowrap text-on-accent no-underline hover:bg-accent-2 hover:text-on-accent"
              >
                Start free
              </Link>
              <span className="text-[13px] text-ink-3">
                Upgrade to Pro whenever you need it, {PRO_YEARLY}, or {PRO_MONTHLY}.
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── questions ─────────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-[#F4F3ED]">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <Reveal>
            <h2 className="m-0 mb-[20px] font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
              Questions
            </h2>
            <div className="flex max-w-[760px] flex-col gap-[16px]">
              {PRICING_FAQ.map(([id, question, answer]) => (
                <div key={id} className="flex flex-col gap-[5px]">
                  <h3 className="m-0 text-[15px] font-semibold text-ink">{question}</h3>
                  <p className="m-0 text-[14px] leading-[1.6] text-pretty text-ink-2">{answer}</p>
                </div>
              ))}
            </div>

            <div className="mt-[32px] flex flex-wrap items-center gap-[12px] rounded-[10px] border border-accent-line bg-accent-soft px-[18px] py-[16px]">
              <span className="min-w-[220px] flex-1 text-[14.5px] leading-[1.5] text-ink">
                Nothing to choose and nothing to cancel. Three screens and your link works.
              </span>
              <Link
                href="/signup"
                className="unlink inline-flex h-[42px] flex-none items-center rounded-[8px] bg-accent px-[18px] text-[14px] font-semibold whitespace-nowrap text-on-accent no-underline hover:bg-accent-2 hover:text-on-accent"
              >
                Create a free account
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

