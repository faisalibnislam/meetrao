import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Kicker } from "./site-chrome";
import { Reveal } from "./reveal";
import { DENIALS, HEADLINE, INCLUDED, LIMITS, PRICING_FAQ, WHY } from "@/lib/pricing";

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
              Meetrao has one tier and it costs nothing. Not a free plan sitting under three paid ones — the
              whole product, on every account, with no card and nothing to cancel.
            </p>

            <div className="mt-[6px] flex flex-wrap gap-[10px]">
              {DENIALS.map(([title, body]) => (
                <div
                  key={title}
                  className="flex min-w-[min(260px,100%)] flex-1 flex-col gap-[5px] rounded-[10px] border border-accent-line bg-accent-soft px-[15px] py-[13px]"
                >
                  <span className="flex items-center gap-[7px] text-[13.5px] font-semibold text-ink">
                    <Icon name="check" weight="solid" size={11} className="flex-none text-accent" />
                    {title}
                  </span>
                  <span className="text-[13px] leading-[1.5] text-pretty text-ink-2">{body}</span>
                </div>
              ))}
            </div>

            <div className="mt-[10px] flex flex-wrap items-center gap-[10px]">
              <Link
                href="/signup"
                className="unlink inline-flex h-[44px] items-center rounded-[8px] bg-accent px-[18px] text-[14px] font-semibold whitespace-nowrap text-white no-underline hover:bg-accent-2 hover:text-white"
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

      {/* ── what is included, which is all of it ──────────────────────────── */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <Reveal>
            <h2 className="m-0 font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
              What you get
            </h2>
            <p className="mt-[10px] mb-[22px] max-w-[640px] text-[14px] leading-[1.6] text-ink-2">
              All of it. There is no second column, because there is no second plan.
            </p>

            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-x-[22px] gap-y-[11px] p-0">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-[9px]">
                  <Icon
                    name="check"
                    weight="solid"
                    size={11}
                    className="mt-[5px] flex-none text-accent"
                    aria-hidden="true"
                  />
                  <span className="text-[14px] leading-[1.55] text-pretty text-ink-2">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── what it cannot do, before the ask ─────────────────────────────── */}
      <section className="border-t border-line bg-[#F4F3ED]">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <Reveal>
            <h2 className="m-0 font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
              What it does not do
            </h2>
            <p className="mt-[10px] mb-[22px] max-w-[640px] text-[14px] leading-[1.6] text-ink-2">
              This section is here rather than in small print, and above the sign-up button rather than below it.
              If you need one of these, Meetrao is the wrong tool and you should know that now.
            </p>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-[14px]">
              {LIMITS.map(([title, body]) => (
                <div key={title} className="flex flex-col gap-[7px] rounded-[10px] border border-line bg-fill px-[16px] py-[15px]">
                  <span className="flex items-center gap-[8px] text-[14px] font-semibold text-ink">
                    <Icon name="xmark" weight="solid" size={10} className="flex-none text-ink-3" aria-hidden="true" />
                    {title}
                  </span>
                  <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">{body}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── why ───────────────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <Reveal>
            <h2 className="m-0 mb-[16px] font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
              Why is it free?
            </h2>
            <div className="flex max-w-[760px] flex-col gap-[12px]">
              {WHY.map((paragraph) => (
                <p key={paragraph} className="m-0 text-[15px] leading-[1.65] text-pretty text-ink-2">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="mt-[26px] max-w-[760px] rounded-[10px] border border-line bg-fill px-[18px] py-[16px]">
              <p className="m-0 text-[13.5px] leading-[1.6] text-pretty text-ink-2">
                <span className="font-semibold text-ink">And if that changes.</span> Meetrao is free while it is
                in beta, and paid plans are intended later — that is written into{" "}
                <Link href="/terms#t-price">the Terms</Link>, not buried. If they arrive, you would be emailed
                before anything became chargeable and would have to opt in. A free account is never billed
                automatically, and if you chose not to pay you could export your data and close it.
              </p>
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
                className="unlink inline-flex h-[42px] flex-none items-center rounded-[8px] bg-accent px-[18px] text-[14px] font-semibold whitespace-nowrap text-white no-underline hover:bg-accent-2 hover:text-white"
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
