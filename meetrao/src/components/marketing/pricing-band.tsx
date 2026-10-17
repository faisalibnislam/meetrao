import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";
import { PlanPrice } from "@/components/marketing/plan-price";
import { BUSINESS_LIMITS } from "@/lib/pricing";

/* ─────────────────────────────────────────────────────────────────────────────
   Pricing, on the landing page.

   THE FULL COMPARISON IS NOT HERE ANY MORE. This section used to render the
   same nineteen-row table that /pricing renders, which is the right thing on
   a page somebody opened to compare plans and the wrong thing in the middle of
   a scroll, nineteen rows of ticks is a wall to get past, not an argument.

   What a reader needs here is the shape of the deal: free is the whole booking
   product, Pro is for running a business on it, Business is for running
   several with other people on them. Anyone who wants the row-by-row has a
   button to it, and that is a cheap click from somebody who has already
   decided to care.

   THREE CARDS, because three plans are on sale. This band showed Free and Pro
   only, so the plan that holds a team (and the caps it carries, which come
   from convex/lib/limits.ts via BUSINESS_LIMITS, not from this file) could
   only be found by somebody who had already clicked through to /pricing.

   Dark, because the sections above and below it are light and this is the one
   place on the page asking for a decision.
   ───────────────────────────────────────────────────────────────────────────── */

/** Short enough to read in a glance. The full list lives on /pricing. */
const FREE = [
  "Your booking links, and unlimited bookings on them",
  "Google Calendar checked before any time is offered",
  "A Meet link, reminders, and guests who reschedule themselves",
];

const PRO = [
  "Your logo, your colours, your own domain",
  "A team link, and sessions several guests share",
  "API keys, webhooks, and no Meetrao badge",
];

const BUSINESS = [
  `Up to ${BUSINESS_LIMITS.companies} companies, each with its own domain and branding`,
  `Up to ${BUSINESS_LIMITS.membersPerCompany} people on a company, each with their own link`,
  "Everyone you add keeps their own free account",
];

export function PricingBand() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-[14px]">
      {/* "$0, no card" rather than "$0 forever". The Terms do not promise
          forever and neither does anything else on the site; a price card
          is the last place to start. */}
      <Plan
        name="Free"
        price="$0"
        per="no card"
        note="The whole booking product, not a trial of it."
        points={FREE}
        tone="quiet"
      />
      <Plan
        name="Pro"
        plan="pro"
        note="Everything in Free, plus the parts a business needs."
        points={PRO}
        tone="loud"
      />
      <Plan
        name="Business"
        plan="business"
        note="Everything in Pro, for more than one company and the people on them."
        points={BUSINESS}
        tone="loud"
      />
    </div>
  );
}

function Plan({
  name,
  price,
  per,
  plan = "pro",
  note,
  points,
  tone,
}: {
  name: string;
  /* Absent on the paid plans, which render <PlanPrice> instead: its figure
     depends on a cadence the reader chooses, so it cannot be a string passed
     in. `plan` says whose figure. */
  price?: string;
  per?: string;
  plan?: "pro" | "business";
  note: string;
  points: readonly string[];
  /* `loud` is a paid card. All three sit on the same dark ground, so the
     difference is a filled panel against a bordered one rather than a colour.
     There is no second accent available on a ground that is already the
     accent. */
  tone: "quiet" | "loud";
}) {
  const loud = tone === "loud";

  return (
    <div
      className={
        loud
          ? "flex flex-col gap-[13px] rounded-[14px] bg-surface px-[24px] pt-[22px] pb-[24px]"
          : "flex flex-col gap-[13px] rounded-[14px] border border-white/18 px-[24px] pt-[22px] pb-[24px]"
      }
    >
      <div className="flex flex-col gap-[6px]">
        <span
          className={
            loud
              ? "text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase"
              : "text-[11px] font-semibold tracking-[0.1em] text-white/60 uppercase"
          }
        >
          {name}
        </span>

        {price ? (
          <span className="flex items-baseline gap-[7px]">
            <span className="font-serif text-[40px] leading-none font-normal tracking-[-0.02em] text-white">
              {price}
            </span>
            <span className="text-[13px] text-white/60">{per}</span>
          </span>
        ) : (
          <PlanPrice plan={plan} />
        )}
        <span className={loud ? "text-[13px] leading-[1.5] text-ink-2" : "text-[13px] leading-[1.5] text-white/70"}>
          {note}
        </span>
      </div>

      <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
        {points.map((point) => (
          <li
            key={point}
            className={
              loud
                ? "flex items-start gap-[9px] text-[13px] leading-[1.5] text-pretty text-ink-2"
                : "flex items-start gap-[9px] text-[13px] leading-[1.5] text-pretty text-white/80"
            }
          >
            <Icon
              name="check"
              size={11}
              className={loud ? "mt-[4px] flex-none text-accent-ink" : "mt-[4px] flex-none text-white/50"}
            />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The row under the two cards: start, or go and read the whole table. */
export function PricingBandActions() {
  return (
    <div className="flex flex-wrap items-center gap-[12px]">
      <ButtonLink variant="secondary" size={40} href="/signup">
        Start free
      </ButtonLink>
      <Link
        href="/pricing"
        className="inline-flex min-h-[40px] items-center gap-[7px] text-[13.5px] font-semibold text-white"
      >
        See the full comparison
        <Icon name="arrow-right" size={12} className="flex-none" />
      </Link>
    </div>
  );
}
