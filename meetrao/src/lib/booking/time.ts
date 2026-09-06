import { TZDate } from "@date-fns/tz";

/** A calendar day in a specific zone, as `yyyy-MM-dd`. */
export type DateKey = string;

export type Interval = { start: Date; end: Date };

const KEY_FORMAT = new Map<string, Intl.DateTimeFormat>();

function keyFormatter(zone: string) {
  let f = KEY_FORMAT.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    KEY_FORMAT.set(zone, f);
  }
  return f;
}

/** The calendar day `at` falls on, as seen from `zone`. */
export function dateKeyInZone(at: Date, zone: string): DateKey {
  // en-CA renders as yyyy-MM-dd.
  return keyFormatter(zone).format(at);
}

export function parseDateKey(key: DateKey): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = key.split("-").map((n) => Number.parseInt(n, 10));
  return { year, month, day };
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const { year, month, day } = parseDateKey(key);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/**
 * The absolute instant at which the wall clock in `zone` reads
 * `key` at `minutes` past midnight. DST-correct: on a spring-forward day the
 * skipped hour maps onto the following instant, and on fall-back the first
 * occurrence is used.
 */
export function zonedInstant(
  key: DateKey,
  minutes: number,
  zone: string,
): Date {
  const { year, month, day } = parseDateKey(key);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return new Date(
    new TZDate(year, month - 1, day, hours, mins, 0, 0, zone).getTime(),
  );
}

/** 0 = Sunday … 6 = Saturday, as seen from `zone`. */
export function weekdayInZone(key: DateKey, zone: string): number {
  const noon = zonedInstant(key, 12 * 60, zone);
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "short",
  }).format(noon);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

/** Advance a date key by `days` calendar days. */
export function addDaysToKey(key: DateKey, days: number): DateKey {
  const { year, month, day } = parseDateKey(key);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function overlaps(a: Interval, b: Interval): boolean {
  // Half-open intervals: back-to-back meetings do not overlap.
  return a.start < b.end && b.start < a.end;
}

/** Widen every interval by `minutes` on both sides. */
export function padIntervals(
  intervals: readonly Interval[],
  minutes: number,
): Interval[] {
  if (minutes <= 0) return [...intervals];
  const ms = minutes * 60_000;
  return intervals.map((i) => ({
    start: new Date(i.start.getTime() - ms),
    end: new Date(i.end.getTime() + ms),
  }));
}

/* ── Display helpers ─────────────────────────────────────────────────────── */

/** "9:00 AM" in the given zone. */
export function formatTime(at: Date, zone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  }).format(at);
}

/** "9:00 – 9:30 AM", dropping the first meridiem when both agree. */
export function formatTimeRange(
  start: Date,
  end: Date,
  zone: string,
): string {
  const a = formatTime(start, zone);
  const b = formatTime(end, zone);
  const aMer = a.slice(-2);
  const bMer = b.slice(-2);
  const left = aMer === bMer ? a.slice(0, -3) : a;
  return `${left} – ${b}`;
}

/** "Monday, September 7" */
export function formatLongDate(at: Date, zone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(at);
}

/** "Sep 7, 2026" */
export function formatMediumDate(at: Date, zone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(at);
}

/** "Mon 7 Sep" — the compact form the dashboard rows use. */
export function formatDayLabel(at: Date, zone: string, now: Date): string {
  const key = dateKeyInZone(at, zone);
  const todayKey = dateKeyInZone(now, zone);
  if (key === todayKey) return "Today";
  if (key === addDaysToKey(todayKey, 1)) return "Tomorrow";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(at);
}

/** "September 2026" */
export function formatMonthLabel(key: DateKey, zone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    month: "long",
    year: "numeric",
  }).format(zonedInstant(key, 12 * 60, zone));
}

/** The hour of the day (0–23) as read in `zone`. */
export function hourInZone(at: Date, zone: string): number {
  return (
    Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        hour: "numeric",
        hour12: false,
      }).format(at),
    ) % 24
  );
}

/** "Good morning" / "Good afternoon" / "Good evening", in the host's zone. */
export function greetingInZone(at: Date, zone: string): string {
  const hour = hourInZone(at, zone);
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Relative time for the admin activity feed: "5 min ago", "2 hr ago". */
export function formatRelative(at: Date, now: Date): string {
  const seconds = Math.max(0, Math.round((now.getTime() - at.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  const months = Math.round(days / 30);
  return `${months} ${months === 1 ? "month" : "months"} ago`;
}
