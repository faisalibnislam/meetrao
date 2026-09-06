"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { CheckboxRow } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { MenuSelect } from "@/components/ui/menu-select";
import { useToast } from "@/components/ui/toast";
import {
  labelToMinutes,
  minutesToLabel,
  TIME_OPTIONS,
} from "@/lib/booking/slots";
import { saveAvailability, type WeeklyAvailability } from "@/lib/actions/availability";

/** Monday first, as the design lists them. */
const DAYS: Array<{ weekday: number; label: string }> = [
  { weekday: 1, label: "Monday" },
  { weekday: 2, label: "Tuesday" },
  { weekday: 3, label: "Wednesday" },
  { weekday: 4, label: "Thursday" },
  { weekday: 5, label: "Friday" },
  { weekday: 6, label: "Saturday" },
  { weekday: 0, label: "Sunday" },
];

/** What a day falls back to when it is switched on with nothing set. */
const DEFAULT_RANGE = { start: 9 * 60, end: 17 * 60 };
const ADDED_RANGE = { start: 14 * 60, end: 17 * 60 };

export type DayState = {
  weekday: number;
  label: string;
  on: boolean;
  ranges: Array<{ start: number; end: number }>;
};

export function buildDayState(
  rules: ReadonlyArray<{ weekday: number; start_minute: number; end_minute: number }>,
): DayState[] {
  return DAYS.map(({ weekday, label }) => {
    const ranges = rules
      .filter((r) => r.weekday === weekday)
      .sort((a, b) => a.start_minute - b.start_minute)
      .map((r) => ({ start: r.start_minute, end: r.end_minute }));

    return {
      weekday,
      label,
      on: ranges.length > 0,
      ranges: ranges.length > 0 ? ranges : [DEFAULT_RANGE],
    };
  });
}

function toWeekly(days: DayState[]): WeeklyAvailability {
  const weekly: WeeklyAvailability = {};
  for (const day of days) {
    if (day.on && day.ranges.length > 0) weekly[day.weekday] = day.ranges;
  }
  return weekly;
}

/**
 * The seven-day editor. Shared by onboarding step 4 and App › Availability;
 * `variant` only controls whether it renders its own save row.
 */
export function AvailabilityEditor({
  initialRules,
  timezone,
  showSaveRow = true,
  onDirtyChange,
  saveRef,
}: {
  initialRules: ReadonlyArray<{
    weekday: number;
    start_minute: number;
    end_minute: number;
  }>;
  timezone: string;
  showSaveRow?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  /**
   * Lets a parent (onboarding) drive the save from its own button. The editor
   * writes the current save function into this ref.
   */
  saveRef?: { current: (() => Promise<boolean>) | null };
}) {
  const [days, setDays] = useState<DayState[]>(() => buildDayState(initialRules));
  const [saved, setSaved] = useState(true);
  const [pending, startTransition] = useTransition();
  const { notify } = useToast();

  const timeOptions = useMemo(
    () => TIME_OPTIONS.map((label) => ({ value: label, label })),
    [],
  );

  function update(next: DayState[]) {
    setDays(next);
    setSaved(false);
    onDirtyChange?.(true);
  }

  const save = useCallback(async (): Promise<boolean> => {
    const result = await saveAvailability(toWeekly(days), timezone);
    if (result.ok) {
      setSaved(true);
      onDirtyChange?.(false);
      notify("ok", "Availability saved", "Guests see these hours from now on.");
      return true;
    }
    notify("bad", "Could not save", result.message ?? "Try again.");
    return false;
  }, [days, timezone, notify, onDirtyChange]);

  // Publish the current save closure for a parent-driven submit. Done in an
  // effect so render stays free of side effects.
  useEffect(() => {
    if (!saveRef) return;
    saveRef.current = save;
    return () => {
      saveRef.current = null;
    };
  }, [saveRef, save]);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
        {days.map((day, dayIndex) => (
          <div
            key={day.weekday}
            className={cn(
              "flex flex-wrap items-start gap-[14px] px-[15px] py-[11px]",
              dayIndex > 0 && "border-t border-line-soft",
              !day.on && "bg-fill",
            )}
          >
            <CheckboxRow
              checked={day.on}
              onChange={(on) =>
                update(
                  days.map((d, i) =>
                    i === dayIndex
                      ? {
                          ...d,
                          on,
                          ranges: d.ranges.length > 0 ? d.ranges : [DEFAULT_RANGE],
                        }
                      : d,
                  ),
                )
              }
              className="w-[136px] flex-none"
            >
              {day.label}
            </CheckboxRow>

            <div className="flex min-w-[200px] flex-1 flex-col gap-[7px]">
              {day.on ? (
                <div className="flex flex-col gap-[7px]">
                  {day.ranges.map((range, rangeIndex) => (
                    <div
                      key={`${day.weekday}-${rangeIndex}`}
                      className="flex items-center gap-[7px]"
                    >
                      <div className="w-[110px]">
                        <MenuSelect
                          size="sm"
                          label={`${day.label} start time`}
                          options={timeOptions}
                          value={minutesToLabel(range.start)}
                          onChange={(v) =>
                            update(
                              days.map((d, i) =>
                                i === dayIndex
                                  ? {
                                      ...d,
                                      ranges: d.ranges.map((r, j) =>
                                        j === rangeIndex
                                          ? { ...r, start: labelToMinutes(v) }
                                          : r,
                                      ),
                                    }
                                  : d,
                              ),
                            )
                          }
                        />
                      </div>
                      <span className="text-[12px] text-ink-3">to</span>
                      <div className="w-[110px]">
                        <MenuSelect
                          size="sm"
                          label={`${day.label} end time`}
                          options={timeOptions}
                          value={minutesToLabel(range.end)}
                          onChange={(v) =>
                            update(
                              days.map((d, i) =>
                                i === dayIndex
                                  ? {
                                      ...d,
                                      ranges: d.ranges.map((r, j) =>
                                        j === rangeIndex
                                          ? { ...r, end: labelToMinutes(v) }
                                          : r,
                                      ),
                                    }
                                  : d,
                              ),
                            )
                          }
                        />
                      </div>
                      <button
                        type="button"
                        title="Remove"
                        aria-label={`Remove ${day.label} hours`}
                        onClick={() =>
                          update(
                            days.map((d, i) => {
                              if (i !== dayIndex) return d;
                              const ranges = d.ranges.filter(
                                (_, j) => j !== rangeIndex,
                              );
                              // Removing the last range switches the day off.
                              return ranges.length > 0
                                ? { ...d, ranges }
                                : { ...d, on: false, ranges: [DEFAULT_RANGE] };
                            }),
                          )
                        }
                        className="inline-flex size-[26px] cursor-pointer items-center justify-center rounded-[5px] border border-transparent bg-transparent text-ink-3 hover:bg-fill-2 hover:text-red"
                      >
                        <Icon name="close" size={11} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      update(
                        days.map((d, i) =>
                          i === dayIndex
                            ? { ...d, ranges: [...d.ranges, ADDED_RANGE] }
                            : d,
                        ),
                      )
                    }
                    className="inline-flex h-[24px] cursor-pointer items-center gap-[6px] self-start rounded-[5px] border border-transparent bg-transparent px-[7px] text-[12.5px] font-semibold text-accent hover:bg-accent-soft"
                  >
                    <Icon name="plus" size={10} />
                    Add hours
                  </button>
                </div>
              ) : (
                <span className="text-[13px] text-ink-3">Unavailable</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {showSaveRow ? (
        <div className="flex flex-wrap items-center gap-[12px]">
          <Button
            size="xl"
            loading={pending}
            onClick={() => startTransition(() => void save())}
          >
            {pending ? "Saving…" : "Save availability"}
          </Button>
          <span
            className={cn(
              "inline-flex items-center gap-[7px] text-[12.5px]",
              saved ? "text-accent" : "text-ink-3",
            )}
          >
            {saved ? "All changes saved" : "Unsaved changes"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
