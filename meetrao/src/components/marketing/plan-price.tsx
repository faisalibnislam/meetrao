"use client";

import { useState } from "react";
import { PRO_PRICES, yearlySaving, type Cadence } from "@/lib/pricing";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Pro's price, with the cadence a reader picks.

   ONE COMPONENT FOR BOTH PRICING SURFACES. The landing band and /pricing each
   showed the yearly figure with the monthly one as an aside in prose, so a
   reader who pays monthly had to do the conversion themselves, and the two
   pages could drift apart. They ask the same question twice, so they get the
   same control.

   No light and dark variants: Pro's card is white on the dark band and the
   page is light, so this is read on a light surface either way. A tone prop
   whose two branches were identical is how a component starts lying about
   what it supports.

   Everything a reader could get wrong comes from lib/pricing.ts, including the
   saving, which is computed rather than typed. A hand-written discount is the
   first thing to go stale when a price moves, and this one just did.
   ───────────────────────────────────────────────────────────────────────────── */

export function PlanPrice({ initial = "yearly" }: { initial?: Cadence }) {
  const [cadence, setCadence] = useState<Cadence>(initial);
  const price = PRO_PRICES[cadence];
  const saving = yearlySaving();
  const perMonth = (PRO_PRICES.yearly.amount / 12).toFixed(2);

  return (
    <div className="flex flex-col gap-[10px]">
      <div
        role="group"
        aria-label="Billing period"
        className="inline-flex w-fit items-center gap-[2px] rounded-[8px] border border-line bg-fill p-[3px]"
      >
        {(["yearly", "monthly"] as const).map((key) => {
          const on = key === cadence;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => setCadence(key)}
              className={cx(
                "inline-flex h-[28px] cursor-pointer items-center gap-[6px] rounded-[6px] px-[11px] text-[12.5px] font-semibold",
                "transition-[background-color,color] duration-[140ms]",
                on ? "bg-accent text-on-accent" : "bg-transparent text-ink-2 hover:text-ink",
              )}
            >
              {key === "yearly" ? "Yearly" : "Monthly"}
              {key === "yearly" && saving.percent > 0 ? (
                <span
                  className={cx(
                    "rounded-[4px] px-[5px] py-[1px] text-[10.5px] font-semibold",
                    on ? "bg-white/20 text-on-accent" : "bg-accent-soft text-accent-ink",
                  )}
                >
                  save {saving.percent}%
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <span className="flex items-baseline gap-[7px]">
        <span className="font-serif text-[40px] leading-none font-normal tracking-[-0.02em] text-ink">
          ${price.amount}
        </span>
        <span className="text-[13px] text-ink-3">{price.unit}</span>
      </span>

      {/* The other cadence spelled out, so neither reader has to do the sum. */}
      <span className="text-[12.5px] leading-[1.5] text-pretty text-ink-3">
        {cadence === "yearly"
          ? `That is $${perMonth} a month, billed once a year. Monthly is $${PRO_PRICES.monthly.amount}.`
          : `Billed every month. A year paid once is $${PRO_PRICES.yearly.amount}, which saves $${saving.dollars}.`}
      </span>
    </div>
  );
}
