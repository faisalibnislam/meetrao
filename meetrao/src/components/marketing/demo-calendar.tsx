"use client";

import { cx } from "@/lib/cx";

/* The month the marketing demos use. September 2026 starts on a Tuesday, so
   the 1st sits in column 2. These are fabricated screens, not live data,
   nothing here talks to the booking engine. */

export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const FIRST_DOW = 2;
const DAYS = 30;
const TODAY = 7;
const LAST_BOOKABLE = 30;

export type DemoCell = { day: number | null; closed: boolean; today: boolean };

export function demoMonth(): DemoCell[] {
  const cells: DemoCell[] = Array.from({ length: FIRST_DOW }, () => ({
    day: null,
    closed: true,
    today: false,
  }));

  for (let d = 1; d <= DAYS; d++) {
    const dow = (FIRST_DOW + d - 1) % 7;
    const closed = dow === 0 || dow === 6 || d < TODAY || d > LAST_BOOKABLE;
    cells.push({ day: d, closed, today: d === TODAY });
  }

  return cells;
}

export function demoDayLabel(day: number): string {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `${names[(FIRST_DOW + day - 1) % 7]}, September ${day}`;
}

export function DemoMonthGrid({
  selected,
  onSelect,
  cellHeight = 30,
}: {
  selected: number;
  onSelect: (day: number) => void;
  cellHeight?: number;
}) {
  return (
    <div className="grid grid-cols-7 gap-[4px]">
      {DOW.map((label) => (
        <span
          key={label}
          className="text-center text-[10px] tracking-[0.04em] text-ink-3 uppercase"
        >
          {label}
        </span>
      ))}

      {demoMonth().map((cell, i) => {
        if (cell.day === null) return <span key={`e${i}`} aria-hidden="true" />;
        const on = !cell.closed && cell.day === selected;
        return (
          <button
            key={cell.day}
            type="button"
            disabled={cell.closed}
            aria-label={cell.closed ? `September ${cell.day}, unavailable` : `September ${cell.day}`}
            onClick={() => onSelect(cell.day as number)}
            style={{ height: cellHeight }}
            className={cx(
              "flex items-center justify-center rounded-[6px] border font-sans text-[12.5px] font-medium",
              "transition-[background-color,border-color] duration-[120ms]",
              cell.closed && "cursor-not-allowed border-transparent bg-transparent text-ink-3 opacity-[0.42]",
              !cell.closed && on && "cursor-pointer border-accent bg-accent font-semibold text-on-accent hover:bg-accent-2",
              !cell.closed && !on && cell.today && "cursor-pointer border-accent bg-surface font-semibold text-accent-ink hover:bg-accent-soft",
              !cell.closed && !on && !cell.today && "cursor-pointer border-line bg-surface text-ink hover:border-line-strong hover:bg-fill",
            )}
          >
            {cell.day}
          </button>
        );
      })}
    </div>
  );
}

export function DemoSlot({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        "flex h-[32px] cursor-pointer items-center justify-center rounded-[6px] border font-sans text-[12.5px] font-medium",
        "transition-[background-color,border-color] duration-[120ms]",
        on
          ? "border-accent bg-accent font-semibold text-on-accent hover:bg-accent-2"
          : "border-line-strong bg-surface text-ink hover:border-accent hover:bg-fill",
      )}
    >
      {label}
    </button>
  );
}

/** The browser chrome the demos sit inside. */
export function BrowserFrame({
  url,
  children,
  className,
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex w-full flex-col overflow-hidden rounded-[16px] border border-line-strong bg-surface",
        "shadow-[0_2px_4px_rgba(26,25,23,0.04),0_34px_64px_-24px_rgba(26,25,23,0.34)]",
        className,
      )}
    >
      <div className="flex flex-none items-center gap-[9px] border-b border-line bg-fill px-[14px] py-[10px]">
        <span aria-hidden="true" className="flex flex-none gap-[5px]">
          <span className="h-[8px] w-[8px] rounded-full bg-line-strong" />
          <span className="h-[8px] w-[8px] rounded-full bg-line-strong" />
          <span className="h-[8px] w-[8px] rounded-full bg-line-strong" />
        </span>
        <span className="min-w-0 flex-1 overflow-hidden text-[11px] text-ellipsis whitespace-nowrap text-ink-3">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}
