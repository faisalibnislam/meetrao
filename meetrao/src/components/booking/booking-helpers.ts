import type { PlainDate } from "@/lib/booking/slots";
import { dateFormat } from "@/lib/intl";

/* ─────────────────────────────────────────────────────────────────────────────
   The booking page's pure decisions, apart from the component.

   Kept out of booking-flow.tsx so they can be tested as functions: which
   heading a slot goes under, which calendar rows a phone hides, and what the
   "Add guests" list sends. Each is a rule a guest can see break, and each is
   easier to pin with an input and an output than by reading JSX.
   ───────────────────────────────────────────────────────────────────────────── */

/** How many extra people one booking may invite. convex/publicBooking.ts holds the real limit. */
export const MAX_GUESTS = 5;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * What is wrong with one guest address, or null. An empty row is not wrong:
 * it is simply not sent, which is kinder than refusing a booking over a
 * field the guest opened and then thought better of.
 */
export function guestProblem(value: string, ownEmail: string): string | null {
  const email = value.trim().toLowerCase();
  if (!email) return null;
  if (!EMAIL.test(email)) return "Check this address.";
  if (email === ownEmail.trim().toLowerCase()) return "That is your own email. Your confirmation goes there already.";
  return null;
}

/** The addresses to send: trimmed, lower-cased, without blanks or repeats. */
export function cleanGuests(guests: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of guests) {
    const email = raw.trim().toLowerCase();
    if (email && !out.includes(email)) out.push(email);
  }
  return out;
}

export type DayPart = "Morning" | "Afternoon" | "Evening";

/**
 * Slots in runs of the day, by the hour each starts IN THE GIVEN ZONE.
 * Before noon is morning, noon to five is afternoon, five on is evening. A
 * 2 AM slot (a host far east of the guest) lands in Morning, the run it
 * would be read in; inventing a fourth "Night" heading for one or two
 * buttons would cost more than it explains.
 */
export function groupByDayPart(times: readonly string[], timeZone: string): { part: DayPart; times: string[] }[] {
  const hourOf = dateFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone });
  const groups: Record<DayPart, string[]> = { Morning: [], Afternoon: [], Evening: [] };
  for (const iso of times) {
    const hour = Number(hourOf.formatToParts(new Date(iso)).find((p) => p.type === "hour")?.value ?? 0) % 24;
    groups[hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"].push(iso);
  }
  return (["Morning", "Afternoon", "Evening"] as const)
    .filter((part) => groups[part].length)
    .map((part) => ({ part, times: groups[part] }));
}

/**
 * Indexes of the calendar rows that are entirely before today, in the month
 * on screen. Only the current month has any: every earlier month is not
 * reachable, and every later one is all ahead. A leading blank counts as
 * past, so the first row hides when its last real day has gone.
 */
export function weeksBefore(cells: readonly (number | null)[], year: number, month: number, today: PlainDate): Set<number> {
  const out = new Set<number>();
  if (year !== today.year || month !== today.month) return out;
  for (let row = 0; row * 7 < cells.length; row++) {
    const week = cells.slice(row * 7, row * 7 + 7);
    if (week.every((d) => d === null || d < today.day)) out.add(row);
  }
  return out;
}
