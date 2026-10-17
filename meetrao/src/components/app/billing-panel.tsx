"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Callout, PanelHeading } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { openPortal, startCheckout } from "@/lib/actions/billing";
import { isBusinessPlan, isPaid, type Plan } from "@/convex/lib/plan";
import { BUSINESS_LIMITS, BUSINESS_PRICES, PRO_PRICES } from "@/lib/pricing";
import { BUSINESS_PITCH } from "./upgrade";
import { PlanComparison } from "@/components/marketing/plan-comparison";

/* The plan's real name. A ternary here said "Pro" for anybody who paid, which
   is the bug the no-plan-equality guard exists for. */
const PLAN_NAME: Record<Plan, string> = { free: "Free", pro: "Pro", business: "Business" };

/* What each paid tier costs, from the one place prices live. Keyed by tier
   rather than compared by name, for the same reason as PLAN_NAME. */
const TIER_PRICES = { pro: PRO_PRICES, business: BUSINESS_PRICES } as const;

/* The line under the heading, which used to say "Meetrao is free. Pro adds
   the parts a business needs." to everybody, including a Business customer
   reading it above their own Business card. It now says what is true for the
   plan in force: Free hears what the two paid plans add, Pro hears what
   Business adds, and Business is not sold anything. */
const SUBTITLE: Record<Plan, string> = {
  free: "Meetrao is free. Pro adds your own brand and domain, and Business adds companies with people in them.",
  pro: `You are on Pro. Business adds up to ${BUSINESS_LIMITS.companies} companies, each with up to ${BUSINESS_LIMITS.membersPerCompany} people.`,
  business: "You are on Business, which includes everything Meetrao does.",
};

/* ─────────────────────────────────────────────────────────────────────────────
   Plan: what you are on, what it costs, and what it covers.

   The custom domain used to be on this screen and is now on the Branding one,
   beside the logo and the colour (see the pointer below). The reminder timing
   used to be here as well and is now on Notifications, beside the reminder
   switch it qualifies: two screens disagreeing about when reminders went out
   was worse than either being slightly out of the way.

   The plan shown here is whatever Polar last told us. Nothing on this screen
   can set it: the upgrade button opens a checkout and the page waits to be
   told, which is why coming back from Polar refreshes rather than assuming.
   ───────────────────────────────────────────────────────────────────────────── */

export type PlanView = {
  plan: Plan;
  planUntil: string | null;
  hasSubscription: boolean;
  /** Pro given by an operator rather than bought. */
  complimentary: boolean;
  compUntil: string | null;
  /** How the subscription is billed. Null when Polar has not said yet. */
  cadence: "monthly" | "yearly" | null;
  /** True when `planUntil` is when the plan ends rather than renews. */
  cancelsAtPeriodEnd: boolean;
};
export type DomainView = { domain: string | null; verifiedAt: string | null };
/** What the plan's caps are measured against. */
export type UsageView = { companiesOwned: number; companyLimit: number; membersPerCompany: number };

const DATE = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" });

/* A grant written as "indefinite" is stored as a far-future date. Printing
   "through 2126" would read as a typo, so past fifty years it is no date. */
function meaningfulDate(iso: string | null): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  return at.getFullYear() < new Date().getFullYear() + 50 ? DATE.format(at) : null;
}

/** One label and its value, in the current plan's facts. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-[12px] gap-y-[2px] border-t border-line-soft py-[8px] first:border-t-0 first:pt-0 last:pb-0">
      <dt className="w-[132px] flex-none text-[12px] text-ink-3">{label}</dt>
      <dd className="m-0 min-w-0 flex-1 text-[12.5px] font-medium text-ink">{children}</dd>
    </div>
  );
}

export function BillingPanel({
  plan,
  domain,
  usage,
  welcome,
}: {
  plan: PlanView;
  domain: DomainView;
  usage: UsageView;
  /** Set when Polar has just sent them back. */
  welcome?: boolean;
}) {
  const toast = useToast();
  const [busy, startBusy] = useTransition();
  const [comparing, setComparing] = useState(false);

  const pro = isPaid(plan.plan);
  const tier = isBusinessPlan(plan.plan) ? "business" : "pro";
  const prices = TIER_PRICES[tier];

  function go(work: () => Promise<{ error?: string; url?: string }>) {
    startBusy(async () => {
      const result = await work();
      if (result.error || !result.url) {
        toast({ tone: "bad", title: "Could not continue", text: result.error ?? "Try again in a moment." });
        return;
      }
      window.location.href = result.url;
    });
  }

  /* The price of the plan they hold. With the cadence known it is the one
     they pay; without it (a subscription Polar has not sent an event for
     since cadence was recorded) both are printed, plainly as the two
     options, rather than one guessed and stated as fact. */
  const price = plan.complimentary
    ? "Nothing to pay"
    : plan.cadence
      ? `$${prices[plan.cadence].amount} ${prices[plan.cadence].unit}`
      : `$${prices.monthly.amount} a month or $${prices.yearly.amount} a year, as chosen at checkout`;

  /* Renews, ends, or runs until, and only when there is a date to say. */
  const until = plan.complimentary ? meaningfulDate(plan.compUntil) : meaningfulDate(plan.planUntil);
  const untilLabel = plan.complimentary ? "Given until" : plan.cancelsAtPeriodEnd ? "Ends" : "Renews";

  return (
    <div className="flex flex-col gap-[15px]">
      <PanelHeading title="Plan" subtitle={SUBTITLE[plan.plan]} />

      {/* What they are on, said once and said plainly, before any card tries
          to sell them the next one. A paid account reads it on its own card
          below; a free account had it nowhere, because the card below it is
          the Pro card. */}
      {!pro ? (
        <div className="flex flex-wrap items-center gap-[9px] rounded-[8px] border border-line bg-fill px-[14px] py-[11px]">
          <span className="text-[13px] font-semibold text-ink">Your plan</span>
          <Badge tone="off" dot={false}>
            Free
          </Badge>
          <span className="text-[12px] text-ink-3">Nothing to pay, and nothing expires.</span>
        </div>
      ) : null}

      {welcome && !pro ? (
        <Callout tone="amber" title="Payment received: just finishing up">
          Polar confirms subscriptions in the background. Reload in a moment and your new plan will be on.
        </Callout>
      ) : null}

      {/* ── the plan they hold ──────────────────────────────────────────────
          The name once. It used to be the heading, an "Active" badge beside
          it and "Active" again underneath, three ways of saying the one
          thing, while the price and the renewal date, the two facts somebody
          opens this screen to check, were nowhere. A badge appears only when
          it says something the name does not: that the plan was given rather
          than bought, or that it is set to end. */}
      {pro ? (
        <div className="flex flex-col gap-[12px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
          <div className="flex flex-wrap items-center justify-between gap-[10px]">
            <span className="flex items-center gap-[8px] text-[14px] font-semibold text-ink">
              {PLAN_NAME[plan.plan]}
              {plan.complimentary ? (
                <Badge tone="ok" dot={false}>
                  On the house
                </Badge>
              ) : plan.cancelsAtPeriodEnd ? (
                <Badge tone="warn" dot={false}>
                  Cancelled
                </Badge>
              ) : null}
            </span>

            {plan.hasSubscription ? (
              <Button variant="secondary" size={32} busy={busy} onClick={() => go(openPortal)}>
                Manage billing
              </Button>
            ) : plan.complimentary ? (
              // Nothing to manage: there is no subscription behind this.
              <span className="text-[12.5px] text-ink-3">No payment method needed.</span>
            ) : null}
          </div>

          <dl className="m-0 flex flex-col">
            <Fact label="Price">{price}</Fact>
            {until ? <Fact label={untilLabel}>{until}</Fact> : null}
            {/* Measured against the caps the mutations enforce, so this
                cannot promise more than creating a company would allow. */}
            <Fact label="Companies">
              {usage.companiesOwned} of {usage.companyLimit} {usage.companyLimit === 1 ? "company" : "companies"}
            </Fact>
            <Fact label="People per company">
              {usage.membersPerCompany > 1 ? `Up to ${usage.membersPerCompany}, you included` : "Just you"}
            </Fact>
          </dl>
        </div>
      ) : null}

      {/* ── Pro, for a free account ─────────────────────────────────────────
          Named for what it is. The body is the Pro list and the Pro prices,
          so heading it "Free" put the word Free above seven things Free does
          not include. */}
      {!pro ? (
        <div className="flex flex-col gap-[12px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
          <div className="flex min-w-0 flex-col gap-[3px]">
            <span className="text-[14px] font-semibold text-ink">Pro</span>
            <span className="text-[12px] text-ink-3">Everything below, on top of what Free already does.</span>
          </div>

          <ul className="m-0 flex list-none flex-col gap-[6px] p-0">
            {[
              "Your own logo and colour on your booking page",
              "Your own domain, at meeting.yourcompany.com/you/intro",
              "No Meetrao badge on your pages or embed",
              "Team links that rotate between people",
              "Sessions several guests share",
              "API keys and webhooks",
              "Choose when reminders go out",
            ].map((line) => (
              <li key={line} className="flex items-start gap-[8px] text-[12.5px] leading-[1.5] text-ink-2">
                <span aria-hidden="true" className="mt-[6px] h-[4px] w-[4px] flex-none rounded-full bg-accent" />
                {line}
              </li>
            ))}
          </ul>

          {/* After the list, not before it. The price is the last thing to
              read on this card because it is the only thing worth deciding
              once the seven lines above have been read. */}
          {!plan.complimentary ? (
            <div className="flex flex-wrap gap-[8px]">
              <Button variant="secondary" size={32} busy={busy} onClick={() => go(() => startCheckout("monthly"))}>
                ${PRO_PRICES.monthly.amount} / month
              </Button>
              <Button variant="accent" size={32} busy={busy} onClick={() => go(() => startCheckout("yearly"))}>
                ${PRO_PRICES.yearly.amount} / year
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Business, as its own card rather than a line in Pro's.

          Shown to free accounts too: somebody running an agency should not
          have to buy Pro first to discover the plan that actually fits them.
          Hidden only from accounts already on it, where it would be an advert
          for what they have. */}
      {!isBusinessPlan(plan.plan) ? (
        <div className="flex flex-col gap-[12px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
          <div className="flex min-w-0 flex-col gap-[3px]">
            <span className="text-[14px] font-semibold text-ink">Business</span>
            <span className="text-[12px] leading-[1.5] text-ink-3">{BUSINESS_PITCH}</span>
          </div>
          {/* The same bullet as the Pro list above, because this line is the
              same kind of claim and was the only one on the card reading as
              small print. */}
          <span className="flex items-start gap-[8px] text-[12px] leading-[1.5] text-ink-3">
            <span aria-hidden="true" className="mt-[6px] h-[4px] w-[4px] flex-none rounded-full bg-accent" />
            Everything in Pro, across every company. People you add keep their own accounts and pay nothing.
          </span>

          <div className="flex flex-wrap gap-[8px]">
            <Button
              variant="secondary"
              size={32}
              busy={busy}
              onClick={() => go(() => startCheckout("monthly", "business"))}
            >
              ${BUSINESS_PRICES.monthly.amount} / month
            </Button>
            {/* Accent on the year, as on Pro above. The cheaper-per-month
                option is the one we want taken and the one that keeps a
                customer for twelve months rather than one. */}
            <Button
              variant="accent"
              size={32}
              busy={busy}
              onClick={() => go(() => startCheckout("yearly", "business"))}
            >
              ${BUSINESS_PRICES.yearly.amount} / year
            </Button>
          </div>
        </div>
      ) : null}

      {/* The three plans line by line, the same component /pricing renders.

          An upgrade prompt elsewhere in the app sends somebody here, and two
          price cards do not answer the question they arrived with, which is
          what the difference actually is. Pointing them at the marketing page
          instead would mean leaving the app to decide something about their
          own account.

          A button and a chevron rather than a details element. The browser's own
          disclosure triangle was the one control on the screen not drawn in
          the app's style, and it renders differently in every browser. */}
      <div className="rounded-[8px] border border-line bg-surface">
        <button
          type="button"
          aria-expanded={comparing}
          aria-controls="plan-comparison"
          onClick={() => setComparing((v) => !v)}
          className="box-border flex w-full cursor-pointer items-center gap-[8px] rounded-[8px] border-0 bg-transparent px-[15px] py-[12px] text-left text-[12.5px] font-semibold text-ink hover:bg-fill"
        >
          <span className="min-w-0 flex-1">Compare every plan, line by line</span>
          <Icon
            name="chevron-down"
            size={10}
            className="flex-none text-ink-3 transition-transform duration-[140ms]"
            style={{ transform: comparing ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
        {comparing ? (
          <div id="plan-comparison" className="border-t border-line-soft px-[15px] pt-[12px] pb-[14px]">
            <PlanComparison footnote={false} />
          </div>
        ) : null}
      </div>

      {/* ── their own domain, which lives on the Branding screen now ──
          Moved rather than duplicated: the logo, the colour and the domain are
          one decision a host makes once ("make this look like mine") and a
          DNS form on a page about money was the odd one out. This line stays
          so a host who comes looking for it here is not left guessing. */}
      <div className="flex flex-wrap items-center justify-between gap-[10px] rounded-[8px] border border-line bg-surface px-[15px] py-[13px]">
        <div className="flex min-w-0 flex-col gap-[3px]">
          <span className="text-[13px] font-semibold text-ink">Your logo, colour and domain</span>
          <span className="text-[12px] leading-[1.5] text-ink-3">
            {domain.domain
              ? domain.verifiedAt
                ? `Your booking page answers at ${domain.domain}.`
                : `${domain.domain} is claimed and waiting for DNS.`
              : "Make the pages guests see look like yours."}
          </span>
        </div>
        <ButtonLink href="/settings/branding" variant="secondary" size={32}>
          Branding
        </ButtonLink>
      </div>

      {/* Reminder timing moved to Notifications; say so for anybody who
          learned to find it here. */}
      <span className="text-[12px] leading-[1.5] text-ink-3">
        Looking for when reminders go out? That is in{" "}
        <Link href="/settings/notifications" className="font-semibold">
          Notifications
        </Link>
        .
      </span>
    </div>
  );
}
