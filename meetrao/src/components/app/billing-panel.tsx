"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { MenuSelect } from "@/components/ui/menu-select";
import { Callout, PanelHeading } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { openPortal, startCheckout } from "@/lib/actions/billing";
import { saveReminderTiming } from "@/lib/actions/settings";
import { isBusinessPlan, isPaid, type Plan } from "@/convex/lib/plan";
import { BUSINESS_PRICES, PRO_PRICES } from "@/lib/pricing";
import { BUSINESS_PITCH, UpgradeHint } from "./upgrade";
import { PlanComparison } from "@/components/marketing/plan-comparison";

/* The plan's real name. A ternary here said "Pro" for anybody who paid, which
   is the bug the no-plan-equality guard exists for. */
const PLAN_NAME: Record<Plan, string> = { free: "Free", pro: "Pro", business: "Business" };

/* ─────────────────────────────────────────────────────────────────────────────
   Plan, and the reminder timing that lives nowhere else.

   The custom domain used to be on this screen and is now on the Branding one,
   beside the logo and the colour (see the pointer below.

   The plan shown here is whatever Polar last told us. Nothing on this screen
   can set it) the upgrade button opens a checkout and the page waits to be
   told, which is why coming back from Polar refreshes rather than assuming.
   ───────────────────────────────────────────────────────────────────────────── */

export type PlanView = {
  plan: Plan;
  planUntil: string | null;
  hasSubscription: boolean;
  /** Pro given by an operator rather than bought. */
  complimentary: boolean;
  compUntil: string | null;
};
export type DomainView = { domain: string | null; verifiedAt: string | null };
export type TimingView = { long: number; short: number };

const LONG = [
  { value: "2880", label: "2 days before" },
  { value: "1440", label: "1 day before" },
  { value: "720", label: "12 hours before" },
  { value: "240", label: "4 hours before" },
];

const SHORT = [
  { value: "120", label: "2 hours before" },
  { value: "60", label: "1 hour before" },
  { value: "30", label: "30 minutes before" },
  { value: "15", label: "15 minutes before" },
];

export function BillingPanel({
  plan,
  domain,
  timing,
  welcome,
}: {
  plan: PlanView;
  domain: DomainView;
  timing: TimingView;
  /** Set when Polar has just sent them back. */
  welcome?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, startBusy] = useTransition();
  const [long, setLong] = useState(String(timing.long));
  const [short, setShort] = useState(String(timing.short));

  const pro = isPaid(plan.plan);

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

  return (
    <div className="flex flex-col gap-[15px]">
      <PanelHeading title="Plan" subtitle="Meetrao is free. Pro adds the parts a business needs." />

      {/* What they are on, said once and said plainly, before any card tries
          to sell them the next one. A paid account reads it on its own card,
          beside the renewal date; a free account had it nowhere, because the
          card below it is the Pro card. */}
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
          Polar confirms subscriptions in the background. Reload in a moment and Pro will be on.
        </Callout>
      ) : null}

      <div className="flex flex-col gap-[12px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <div className="flex min-w-0 flex-col gap-[3px]">
            {/* The card is named for what it is. On a paid account that is
                the plan they hold; on a free one the body below is the Pro
                list and the Pro prices, so heading it "Free" put the word
                Free above seven things Free does not include. What they are
                on now is in the line underneath, where it reads as a fact
                rather than as a label for somebody else's features. */}
            <span className="flex items-center gap-[8px] text-[14px] font-semibold text-ink">
              {pro ? PLAN_NAME[plan.plan] : "Pro"}
              {pro ? (
                <Badge tone="ok" dot={false}>{plan.complimentary ? "On the house" : "Active"}</Badge>
              ) : null}
            </span>
            <span className="text-[12px] text-ink-3">
              {plan.complimentary
                ? plan.compUntil && new Date(plan.compUntil).getFullYear() < new Date().getFullYear() + 50
                  ? `Given to you, through ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(plan.compUntil))}. Nothing to pay.`
                  : "Given to you. Nothing to pay."
                : pro
                  ? plan.planUntil
                    ? `Renews ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(plan.planUntil))}`
                    : "Active"
                  : "Everything below, on top of what Free already does."}
            </span>
          </div>

          {pro && plan.hasSubscription ? (
            <Button variant="secondary" size={32} busy={busy} onClick={() => go(openPortal)}>
              Manage billing
            </Button>
          ) : plan.complimentary ? (
            // Nothing to manage: there is no subscription behind this.
            <span className="text-[12.5px] text-ink-3">No payment method needed.</span>
          ) : null}
        </div>

        {!pro ? (
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
        ) : null}

        {/* After the list, not before it. The price is the last thing to read
            on this card because it is the only thing worth deciding once the
            seven lines above have been read. */}
        {!(pro && plan.hasSubscription) && !plan.complimentary ? (
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

      {/* Business, as its own card rather than a line in Pro's.

          Shown to free accounts too: somebody running an agency should not
          have to buy Pro first to discover the plan that actually fits them.
          Hidden only from accounts already on it, where it would be an advert
          for what they have. */}
      {!isBusinessPlan(plan.plan) ? (
        <div className="flex flex-col gap-[12px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
          <div className="flex flex-wrap items-center justify-between gap-[10px]">
            <div className="flex min-w-0 flex-col gap-[3px]">
              <span className="text-[14px] font-semibold text-ink">Business</span>
              <span className="text-[12px] leading-[1.5] text-ink-3">{BUSINESS_PITCH}</span>
            </div>
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
          own account. */}
      <details className="rounded-[8px] border border-line bg-surface px-[15px] py-[12px]">
        <summary className="cursor-pointer text-[12.5px] font-semibold text-ink">
          Compare every plan, line by line
        </summary>
        <div className="mt-[12px]">
          <PlanComparison footnote={false} />
        </div>
      </details>

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

      {/* ── reminder timing ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-[11px] rounded-[8px] border border-line bg-surface px-[15px] py-[14px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <span className="text-[13px] font-semibold text-ink">When reminders go out</span>
          {!pro ? <Badge tone="off" dot={false}>Pro</Badge> : null}
        </div>
        <span className="text-[12px] leading-[1.5] text-ink-3">
          Free sends one a day before and one an hour before. Pro picks its own two.
        </span>

        <div className="flex flex-wrap gap-[12px]">
          <div className="flex min-w-[170px] flex-1 flex-col gap-[6px]">
            <span className="text-[12.5px] font-semibold text-ink">First reminder</span>
            <MenuSelect aria-label="First reminder" options={LONG} value={long} onChange={setLong} disabled={!pro} />
          </div>
          <div className="flex min-w-[170px] flex-1 flex-col gap-[6px]">
            <span className="text-[12.5px] font-semibold text-ink">Second reminder</span>
            <MenuSelect aria-label="Second reminder" options={SHORT} value={short} onChange={setShort} disabled={!pro} />
          </div>
        </div>

        {!pro ? <UpgradeHint to="pro" feature="Choosing when reminders land" /> : null}
        {pro ? (
          <div>
            <Button
              variant="accent"
              size={34}
              busy={busy}
              onClick={() =>
                startBusy(async () => {
                  const result = await saveReminderTiming({ long: Number(long), short: Number(short) });
                  if (result.error) {
                    toast({ tone: "bad", title: "Could not save", text: result.error });
                    return;
                  }
                  toast({ tone: "ok", title: "Saved", text: "New bookings follow these times." });
                  router.refresh();
                })
              }
            >
              Save timing
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
