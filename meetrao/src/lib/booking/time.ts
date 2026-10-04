import { TZDate } from "@date-fns/tz";
import type { PlainDate } from "./slots";
import { dateFormat } from "@/lib/intl";

/* Formatting. Every function takes an explicit timezone. Nothing here reads
   the ambient one, because "the host's hours in the guest's zone" is the whole
   product and an implicit zone is how that goes wrong. */

function parts(instant: Date, timeZone: string) {
  return new TZDate(instant.getTime(), timeZone);
}

/** "3:00 PM" */
export function formatTime(instant: Date, timeZone: string): string {
  return dateFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(instant);
}

/**
 * "3:00 – 3:30 PM" · "11:00 AM – 12:00 PM"
 * The meridiem is dropped from the start when both ends share it, which is how
 * the design writes every time range.
 */
export function formatTimeRange(start: Date, end: Date, timeZone: string): string {
  const a = formatTime(start, timeZone);
  const b = formatTime(end, timeZone);
  const aMer = a.slice(-2);
  const bMer = b.slice(-2);
  return aMer === bMer ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
}

/** "Monday, September 7", the public booking page and confirmation. */
export function formatLongDate(instant: Date, timeZone: string): string {
  return dateFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(instant);
}

/** "Monday, September 7" from a plain date rather than an instant. */
export function formatPlainLongDate(date: PlainDate, timeZone: string): string {
  return formatLongDate(new Date(new TZDate(date.year, date.month - 1, date.day, 12, 0, timeZone).getTime()), timeZone);
}

/** "September 2026", the calendar's month label. */
export function formatMonth(year: number, month: number): string {
  return dateFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

/** "Sep 7, 2026", admin tables and the joined column. */
export function formatShortDate(instant: Date, timeZone: string): string {
  return dateFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(instant);
}

/**
 * "Today" · "Tomorrow" · "Mon 7 Sep" · "2 Sep"
 * Near dates get their relative name; anything else inside a week keeps its
 * weekday, and beyond that the weekday is noise.
 */
export function formatDayLabel(instant: Date, timeZone: string, now: Date = new Date()): string {
  const days = calendarDaysBetween(now, instant, timeZone);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";

  const withWeekday = days > 1 && days < 7;
  return dateFormat("en-GB", {
    weekday: withWeekday ? "short" : undefined,
    day: "numeric",
    month: "short",
    timeZone,
  }).format(instant);
}

/** Whole calendar days from `from` to `to`, counted in `timeZone`. */
function calendarDaysBetween(from: Date, to: Date, timeZone: string): number {
  const a = parts(from, timeZone);
  const b = parts(to, timeZone);
  const aUtc = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUtc = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bUtc - aUtc) / 86_400_000);
}

export function isSameDay(a: Date, b: Date, timeZone: string): boolean {
  return calendarDaysBetween(a, b, timeZone) === 0;
}

/** "Good morning" / "Good afternoon" / "Good evening", on the host's own clock. */
export function greetingFor(instant: Date, timeZone: string): string {
  const hour = parts(instant, timeZone).getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/* ── availability editor ─────────────────────────────────────────────────────
   Minutes-into-day are what the database stores; "09:00 AM" is what the editor
   shows. The full day is offered, not just office hours. A host who works
   nights is not a special case. */

export function minutesToLabel(minutes: number): string {
  if (minutes >= 1440) return "12:00 AM";
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const meridiem = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${meridiem}`;
}

/** Every half hour of the day. `includeMidnightEnd` adds 24:00 for range ends. */
export function timeOptions(includeMidnightEnd = false): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let m = 0; m < 1440; m += 30) out.push({ value: String(m), label: minutesToLabel(m) });
  if (includeMidnightEnd) out.push({ value: "1440", label: "12:00 AM" });
  return out;
}

/** "30 min" · "1 hr" · "1 hr 30 min", used where space allows a long form. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = `${h} hr`;
  return m ? `${hours} ${m} min` : hours;
}
