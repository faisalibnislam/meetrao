import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { COMPARISON, PRO_YEARLY, type PlanCell } from "@/lib/pricing";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Free and Pro, line by line.

   One component, rendered on /pricing and on the landing page, because a
   comparison that exists twice is a comparison that disagrees with itself the
   first time a feature moves between tiers.
   ───────────────────────────────────────────────────────────────────────────── */

export function PlanComparison({ footnote = true }: { footnote?: boolean }) {
  return (
    <>
      {/* Three columns read across; below 720px the header hides and each
          cell labels itself for a screen reader, because a three-column
          table at phone width is unreadable either way. */}
      <div className="overflow-hidden rounded-[12px] border border-line">
        <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] bg-fill max-[720px]:hidden">
          <span className="px-[16px] py-[13px] text-[12px] tracking-[0.04em] text-ink-3 uppercase">
            What you get
          </span>
          <span className="border-l border-line px-[16px] py-[13px] text-[13px] font-semibold text-ink">
            Free
          </span>
          <span className="border-l border-accent-line bg-accent-soft px-[16px] py-[13px] text-[13px] font-semibold text-accent-ink">
            Pro · {PRO_YEARLY}
          </span>
        </div>

        {COMPARISON.map((row, i) => (
          <div
            key={row.feature}
            className={cx(
              "grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] bg-surface",
              i > 0 && "border-t border-line-soft",
            )}
          >
            <span className="px-[16px] py-[12px] text-[13.5px] leading-[1.5] text-pretty text-ink">
              {row.feature}
            </span>
            <Cell value={row.free} label="Free" />
            <Cell value={row.pro} label="Pro" accent />
          </div>
        ))}
      </div>


      {footnote ? (
        /* The limits, in one line rather than a section of their own. A page
           that says what it cannot do is more believable than one that does
           not, and this is the smallest honest version of it. */
        <p className="mt-[16px] max-w-[760px] text-[13px] leading-[1.6] text-ink-3">
          Neither plan does: Outlook, iCloud or CalDAV; payments at booking; a Zoom or Teams integration that
          makes links for you; collective availability or routing forms; or reminders by anything but email.
          The price is governed by <Link href="/terms#t-price">the Terms</Link>, which also says a free
          account is never billed automatically.
        </p>
      ) : null}
    </>
  );
}

/* A tick, a dash, or words. A dash says "not here" more honestly than an empty
   cell, which reads as an oversight — and each cell names its column for a
   screen reader, since the header row is hidden on a phone. */
function Cell({ value, label, accent = false }: { value: PlanCell; label: string; accent?: boolean }) {
  return (
    <span
      className={cx(
        "flex items-center gap-[7px] px-[16px] py-[12px] text-[13px] leading-[1.45]",
        accent ? "border-l border-accent-line bg-accent-soft/40" : "border-l border-line-soft",
      )}
    >
      {value === true ? (
        <>
          <Icon name="check" weight="solid" size={11} className="flex-none text-accent-ink" aria-hidden="true" />
          <span className="sr-only">{label}: yes</span>
        </>
      ) : value === false ? (
        <>
          <span aria-hidden="true" className="text-ink-3">
            –
          </span>
          <span className="sr-only">{label}: no</span>
        </>
      ) : (
        <span className="text-pretty text-ink-2">
          <span className="sr-only">{label}: </span>
          {value}
        </span>
      )}
    </span>
  );
}
