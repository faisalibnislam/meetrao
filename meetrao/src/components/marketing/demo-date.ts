import { formatDayLabel } from "@/lib/booking/time";

/* ─────────────────────────────────────────────────────────────────────────────
   The dates the marketing demos show, worked out from today.

   The demos used to be pinned to September 2026: a month grid with the 7th
   marked as today and a bookings table with "Mon 7 Sep" in it. By October
   that read as a screenshot somebody forgot to update, which is the one thing
   a demo of a scheduling product cannot afford to look like.

   A plain `.ts`, not `"use client"`, on purpose. The landing page is a Server
   Component and needs `dayKey()` to work out the day it was rendered on; a
   Server Component importing a value from a client module gets a client
   reference instead of the function (lib/faq.ts exists for the same reason).

   ── why the day travels as a string ──

   The landing page is static, so the server's "today" is the day it was
   BUILT, not the day somebody reads it. The fix has two halves:

   1. The server renders with its own day, passed down as a prop, so the HTML
      and the first client render agree and hydration has nothing to complain
      about.
   2. Straight after hydration the client swaps in the visitor's own day
      (see `useDemoToday` in demo-calendar.tsx, built on useSyncExternalStore).

   A "YYYY-MM-DD" key rather than a Date because it is the same value on both
   sides of the wire, compares with `===` (which useSyncExternalStore needs to
   avoid re-rendering forever), and has no timezone to get wrong. Every
   calculation below runs in UTC on that key, so the weekday of a given date is
   the same in every browser.
   ───────────────────────────────────────────────────────────────────────────── */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "2026-10-17": the calendar day `date` falls on, in the zone it is read in. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parse(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

/** Noon UTC on that day. Noon, so no offset can push it into a neighbour. */
function instant(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function weekday(year: number, month: number, day: number): number {
  return instant(year, month, day).getUTCDay();
}

function daysIn(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const isWeekend = (dow: number) => dow === 0 || dow === 6;

export type DemoMonth = {
  year: number;
  /** 1 to 12. */
  month: number;
  /** "October". */
  name: string;
  /** "October 2026", the heading above the grid. */
  label: string;
  /** The column the 1st sits in, Sunday first. */
  firstDow: number;
  days: number;
  /** The day marked as today, or null when the grid shows next month. */
  today: number | null;
  /** The day selected before anybody clicks: always open, always after today. */
  defaultDay: number;
};

/** Open means a weekday, and not one that has already gone. */
export function isOpen(m: DemoMonth, day: number): boolean {
  if (day < 1 || day > m.days) return false;
  if (isWeekend((m.firstDow + day - 1) % 7)) return false;
  return m.today === null || day >= m.today;
}

/**
 * The month the booking demo shows.
 *
 * This month, with today marked, while at least three working days are still
 * left in it. Late in a month that stops being true (the 30th on a Friday
 * leaves nothing to pick), and a booking page showing a month with no open
 * days is a booking page that looks broken, so the grid moves on to next month
 * with no today marker, the way a real one would once you clicked forward.
 *
 * The default selection skips one open day, the way the September version
 * selected the 9th with the 7th as today: a day you would plausibly book, not
 * one so close it reads as a placeholder.
 */
export function demoMonth(key: string): DemoMonth {
  const t = parse(key);
  let year = t.year;
  let month = t.month;
  let today: number | null = t.day;

  const ahead = (y: number, mo: number, from: number) => {
    const open: number[] = [];
    for (let d = from; d <= daysIn(y, mo); d++) if (!isWeekend(weekday(y, mo, d))) open.push(d);
    return open;
  };

  let open = ahead(year, month, t.day + 1);
  if (open.length < 3) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    today = null;
    open = ahead(year, month, 1);
  }

  const name = MONTHS[month - 1];
  return {
    year,
    month,
    name,
    label: `${name} ${year}`,
    firstDow: weekday(year, month, 1),
    days: daysIn(year, month),
    today,
    defaultDay: open[1] ?? open[0],
  };
}

/** "Wednesday, October 21". */
export function demoDayLabel(m: DemoMonth, day: number): string {
  return `${WEEKDAYS[(m.firstDow + day - 1) % 7]}, ${m.name} ${day}`;
}

/**
 * The date column of the demo bookings table, relative to today.
 *
 * Built with the same formatter the real Bookings screen uses, so the demo
 * says "Today", "Tomorrow", "Thu 22 Oct" and "11 Oct" exactly the way the
 * product does, and cannot drift from it.
 *
 * The third upcoming booking lands on a weekday three to six days out, so it
 * keeps its weekday in the label (the formatter drops it beyond a week) and
 * never sits on a weekend the demo host does not work.
 */
export function demoBookingDates(key: string): {
  today: string;
  tomorrow: string;
  soon: string;
  recent: string;
  earlier: string;
} {
  const t = parse(key);
  const now = instant(t.year, t.month, t.day);
  const shift = (days: number) => new Date(now.getTime() + days * 86_400_000);
  const label = (days: number) => formatDayLabel(shift(days), "UTC", now);

  let soon = 3;
  while (soon < 6 && isWeekend(shift(soon).getUTCDay())) soon++;

  return {
    today: label(0),
    tomorrow: label(1),
    soon: label(soon),
    recent: label(-6),
    earlier: label(-19),
  };
}
