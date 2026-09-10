import { Icon, type IconName } from "@/components/ui/icon";
import { cx } from "@/lib/cx";

/* The dashboard's four tinted cards. Each carries its own colour, and the
   colour is the card's identity — status colours never decorate elsewhere.

   The trend chip is sans rather than DM Mono, and semibold to hold its weight
   at a proportional face's smaller apparent size. It keeps the uppercase and
   the wide tracking: it is a micro-label, and that is what carries the reading
   at 11px, not the family. */

export type MetricTone = "accent" | "slate" | "amber" | "plain";

const TONE: Record<MetricTone, { card: string; ink: string }> = {
  accent: { card: "border-accent-line bg-accent-soft", ink: "text-accent" },
  slate: { card: "border-slate-line bg-slate-soft", ink: "text-slate" },
  amber: { card: "border-amber-line bg-amber-soft", ink: "text-amber" },
  plain: { card: "border-line bg-fill", ink: "text-ink-2" },
};

export function MetricCard({
  icon,
  tone,
  value,
  unit,
  label,
  note,
  trend,
}: {
  icon: IconName;
  tone: MetricTone;
  value: string;
  unit?: string;
  label: string;
  note: string;
  trend?: string;
}) {
  const t = TONE[tone];

  return (
    <div className={cx("flex min-h-[118px] flex-col gap-[14px] rounded-[10px] border px-[15px] py-[14px]", t.card)}>
      <div className="flex items-start justify-between gap-[10px]">
        <span
          className={cx(
            "inline-flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[8px] bg-surface",
            t.ink,
          )}
        >
          <Icon name={icon} size={13} />
        </span>
        {trend ? (
          <span className={cx("pt-[4px] text-[11px] font-semibold tracking-[0.06em] uppercase", t.ink)}>{trend}</span>
        ) : null}
      </div>

      <div className="mt-auto flex flex-col gap-[3px]">
        <div className="flex items-baseline gap-[5px]">
          <span className={cx("text-[26px] leading-[1] font-semibold tracking-[-0.022em]", t.ink)}>{value}</span>
          {unit ? <span className="text-[12.5px] font-medium text-ink-3">{unit}</span> : null}
        </div>
        <span className="text-[12.5px] font-semibold text-ink">{label}</span>
        <span className="text-[11.5px] leading-[1.4] text-ink-3">{note}</span>
      </div>
    </div>
  );
}
