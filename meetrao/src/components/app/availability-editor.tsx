"use client";

import type { Day } from "@/lib/availability";
import { CheckBox } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { MenuSelect } from "@/components/ui/menu-select";
import { timeOptions } from "@/lib/booking/time";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   The seven-day editor. Shared by onboarding step 4 and the Availability
   screen, so the two can never drift apart.

   One weekly schedule per account, one or more ranges per day. Removing the
   last range on a day switches the day off.
   ───────────────────────────────────────────────────────────────────────────── */

const START_OPTIONS = timeOptions();
const END_OPTIONS = timeOptions(true);

export function AvailabilityEditor({ days, onChange }: { days: Day[]; onChange: (next: Day[]) => void }) {
  const patch = (index: number, next: Partial<Day>) =>
    onChange(days.map((d, i) => (i === index ? { ...d, ...next } : d)));

  return (
    <div className="overflow-hidden rounded-[8px] border border-line">
      {days.map((day, di) => (
        <div
          key={day.weekday}
          className={cx(
            "flex flex-wrap items-start gap-[14px] px-[15px] py-[11px]",
            di > 0 && "border-t border-line-soft",
            !day.on && "bg-fill",
          )}
        >
          <button
            type="button"
            aria-pressed={day.on}
            onClick={() => patch(di, { on: !day.on })}
            className="flex w-[136px] flex-none cursor-pointer items-center gap-[9px] border-0 bg-transparent py-[6px] text-left"
          >
            <CheckBox checked={day.on} />
            <span className="text-[13.5px] font-medium text-ink">{day.label}</span>
          </button>

          <div className="flex min-w-[200px] flex-1 flex-col gap-[7px]">
            {day.on ? (
              <>
                {day.ranges.map((range, ri) => (
                  <div key={ri} className="flex items-center gap-[7px]">
                    <div className="w-[110px]">
                      <MenuSelect
                        size="sm"
                        aria-label={`${day.label} start time`}
                        options={START_OPTIONS}
                        value={String(range.start)}
                        onChange={(v) =>
                          patch(di, {
                            ranges: day.ranges.map((r, i) =>
                              i === ri ? { ...r, start: Number(v), end: Math.max(r.end, Number(v) + 30) } : r,
                            ),
                          })
                        }
                      />
                    </div>
                    <span className="text-[12px] text-ink-3">to</span>
                    <div className="w-[110px]">
                      <MenuSelect
                        size="sm"
                        aria-label={`${day.label} end time`}
                        options={END_OPTIONS.filter((o) => Number(o.value) > range.start)}
                        value={String(range.end)}
                        onChange={(v) =>
                          patch(di, {
                            ranges: day.ranges.map((r, i) => (i === ri ? { ...r, end: Number(v) } : r)),
                          })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      title="Remove"
                      aria-label={`Remove ${day.label} ${ri + 1}`}
                      onClick={() => {
                        const ranges = day.ranges.filter((_, i) => i !== ri);
                        // The last range going means the day is off, not that
                        // the day is on with nothing in it.
                        patch(di, ranges.length ? { ranges } : { on: false, ranges: day.ranges });
                      }}
                      className="inline-flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-[5px] border border-transparent bg-transparent text-ink-3 hover:bg-fill-2 hover:text-red"
                    >
                      <Icon name="xmark" size={11} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const last = day.ranges.at(-1);
                    const start = last ? Math.min(last.end + 60, 1380) : 840;
                    patch(di, { ranges: [...day.ranges, { start, end: Math.min(start + 180, 1440) }] });
                  }}
                  className="inline-flex h-[24px] cursor-pointer items-center gap-[6px] self-start rounded-[5px] border border-transparent bg-transparent px-[7px] font-sans text-[12.5px] font-semibold text-accent hover:bg-accent-soft"
                >
                  <Icon name="plus" size={10} />
                  Add hours
                </button>
              </>
            ) : (
              <span className="text-[13px] text-ink-3">Unavailable</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


