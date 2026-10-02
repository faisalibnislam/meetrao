import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";
import { PRO_MONTHLY, PRO_YEARLY } from "@/lib/pricing";

/* ─────────────────────────────────────────────────────────────────────────────
   Pricing, on the landing page.

   THE FULL COMPARISON IS NOT HERE ANY MORE. This section used to render the
   same nineteen-row table that /pricing renders, which is the right thing on
   a page somebody opened to compare plans and the wrong thing in the middle of
   a scroll — nineteen rows of ticks is a wall to get past, not an argument.

   What a reader needs here is the shape of the deal: free is the whole booking
   product, Pro is for running a business on it, and it costs a tenner. Anyone
   who wants the row-by-row has a button to it, and that is a cheap click from
   somebody who has already decided to care.

   Dark, because the sections above and below it are light and this is the one
   place on the page asking for a decision.
   ───────────────────────────────────────────────────────────────────────────── */

/** Short enough to read in a glance. The full list lives on /pricing. */
const FREE = [
  "Your booking link, and unlimited bookings on it",
  "Google Calendar checked before any time is offered",
  "A Meet link, reminders, and guests who reschedule themselves",
];

const PRO = [
  "Your logo, your colours, your own domain",
  "A team link, and sessions several guests share",
  "API keys, webhooks, and no Meetrao badge",
];

export function PricingBand() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-[14px]">
      <Plan
        name="Free"
        price="$0"
        per="forever"
        note="The whole booking product, not a trial of it."
        points={FREE}
        tone="quiet"
      />
      <Plan
        name="Pro"
        price={PRO_YEARLY.replace(" a year", "")}
        per="a year"
        note={`Everything in Free, plus the parts a business needs. Or ${PRO_MONTHLY}.`}
        points={PRO}
        tone="loud"
      />
    </div>
  );
}

function Plan({
  name,
  price,
  per,
  note,
  points,
  tone,
}: {
  name: string;
  price: string;
  per: string;
  note: string;
  points: readonly string[];
  /* `loud` is the paid card. Both sit on the same dark ground, so the
     difference is a filled panel against a bordered one rather than a colour —
     there is no second accent available on a ground that is already the
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
        <span className="flex items-baseline gap-[7px]">
          <span
            className={
              loud
                ? "font-serif text-[40px] leading-none font-normal tracking-[-0.02em] text-ink"
                : "font-serif text-[40px] leading-none font-normal tracking-[-0.02em] text-white"
            }
          >
            {price}
          </span>
          <span className={loud ? "text-[13px] text-ink-3" : "text-[13px] text-white/60"}>{per}</span>
        </span>
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
