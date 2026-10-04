import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Callout } from "@/components/ui/panels";
import { BUSINESS_PRICES, PRO_PRICES } from "@/lib/pricing";
import { BUSINESS_LIMITS } from "@/lib/pricing";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Asking for money, without becoming the product.

   THE RULES THIS FILE EXISTS TO KEEP, because an upsell that is added panel by
   panel ends up on every screen at three sizes with three different prices:

   1. ONE PRICE, FROM ONE PLACE. Every prompt renders PRO_PRICES or
      BUSINESS_PRICES. A number typed into a prompt still says the old one
      after the price moves, which is exactly what happened to the copy in
      pricing.ts and went unnoticed until a test was widened to look for it.

   2. AT THE POINT OF INTENT, NOT EVERYWHERE. A prompt belongs where somebody
      just tried to do the thing. The one ambient exception is the sidebar
      button, which is small, says the price, and is the single standing entry
      point so no panel needs a banner of its own.

   3. SHOW THE FEATURE, DO NOT HIDE IT. A locked control stays visible and
      disabled with a Pro badge beside it. Hiding it means nobody learns the
      product does the thing, which is the opposite of selling it.

   4. NEVER IN THE WAY OF THE JOB. Nothing here appears on a booking page, in
      an email, or between a host and a booking. Free is the whole booking
      product and the pitch has to survive that being true.

   5. ONCE PER SCREEN. A panel gets one prompt, at the bottom or beside the
      control, never both.
   ───────────────────────────────────────────────────────────────────────────── */

export type UpgradeTo = "pro" | "business";

const PLAN = {
  pro: { label: "Pro", prices: PRO_PRICES },
  business: { label: "Business", prices: BUSINESS_PRICES },
} as const;

/** "$3 a month, or $30 a year". The only place either number is formatted. */
export function priceLine(to: UpgradeTo): string {
  const { prices } = PLAN[to];
  return `$${prices.monthly.amount} a month, or $${prices.yearly.amount} a year`;
}

export function planLabel(to: UpgradeTo): string {
  return PLAN[to].label;
}

/**
 * The standing entry point, in the sidebar, for free accounts only.
 *
 * Deliberately not a banner across the top of every screen. It carries the
 * yearly price because that is the number that makes the decision easy, and it
 * sits above the account footer rather than above the navigation, so it reads
 * as something available rather than something in the way.
 */
export function SidebarUpgrade() {
  return (
    <Link
      href="/settings/billing"
      className="unlink mt-auto mb-[10px] box-border flex w-full flex-col gap-[2px] rounded-[7px] border border-accent-line bg-accent-soft px-[11px] py-[9px] no-underline transition-colors duration-[120ms] hover:border-accent hover:bg-accent-soft max-[820px]:hidden"
    >
      <span className="flex items-center gap-[6px] text-[12.5px] font-semibold text-accent-ink">
        <Icon name="chevron-up" size={11} className="flex-none" />
        Upgrade to Pro
      </span>
      <span className="text-[11px] leading-[1.45] text-ink-3">
        Your domain, your branding, team links. ${PRO_PRICES.yearly.amount} a year.
      </span>
    </Link>
  );
}

/**
 * The prompt a panel shows when the thing somebody wants is on a higher plan.
 *
 * `feature` is the thing, phrased as a noun so the sentence reads: "Your own
 * domain is part of Pro." Keep it short; the panel around it has already
 * explained what the feature does.
 */
export function UpgradeCallout({
  to,
  feature,
  children,
  className,
}: {
  to: UpgradeTo;
  feature: string;
  /** One extra sentence, when the plan name alone does not make the case. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Callout tone="accent" title={`${feature} is part of ${planLabel(to)}`} className={className}>
      <span className="flex flex-col gap-[8px]">
        <span>
          {children ? <>{children} </> : null}
          {priceLine(to)}.
        </span>
        <Link
          href="/settings/billing"
          className="unlink inline-flex h-[32px] w-fit items-center rounded-[7px] bg-accent px-[13px] text-[12.5px] font-semibold text-on-accent no-underline hover:bg-accent-2 hover:text-on-accent"
        >
          See {planLabel(to)}
        </Link>
      </span>
    </Callout>
  );
}

/**
 * A badge beside a control that exists but is not yours yet.
 *
 * The control stays rendered and disabled. Somebody who cannot use a setting
 * should still be able to see that it is there, which is the difference
 * between a product with a paid tier and a product that looks like it is
 * missing features.
 */
export function LockedBadge({ to = "pro", className }: { to?: UpgradeTo; className?: string }) {
  return (
    <span className={cx("inline-flex", className)}>
      <Badge tone="off" dot={false}>
        {planLabel(to)}
      </Badge>
    </span>
  );
}

/** The one-line version, for under a disabled control. */
export function UpgradeHint({ to, feature }: { to: UpgradeTo; feature: string }) {
  return (
    <span className="text-[12px] leading-[1.5] text-ink-3">
      {feature} needs {planLabel(to)}, {priceLine(to)}.{" "}
      <Link href="/settings/billing">Upgrade</Link>
    </span>
  );
}

/** What Business adds over Pro, for the prompt a Pro customer sees. */
export const BUSINESS_PITCH = `Up to ${BUSINESS_LIMITS.companies} companies, each with its own domain, its own branding and up to ${BUSINESS_LIMITS.membersPerCompany} people.`;
