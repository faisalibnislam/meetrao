import {
  addDaysToKey,
  dateKeyInZone,
  overlaps,
  padIntervals,
  weekdayInZone,
  zonedInstant,
  type DateKey,
  type Interval,
} from "./time";

export type AvailabilityRule = {
  weekday: number; // 0 = Sunday … 6 = Saturday
  start_minute: number; // minutes past local midnight
  end_minute: number;
};

export type SlotRules = {
  /** The host's zone. Availability minutes are wall-clock times in it. */
  hostTimezone: string;
  rules: readonly AvailabilityRule[];
  durationMinutes: number;
  /** Dead time enforced either side of an existing booking. */
  bufferMinutes: number;
  /** How close to the start a guest may still book. */
  minimumNoticeMinutes: number;
  /** How far ahead the calendar opens. */
  bookingWindowDays: number;
  /** Existing bookings plus Google busy blocks. */
  busy: readonly Interval[];
  now: Date;
  /**
   * Grid granularity. Defaults to 30 minutes, narrowing to the duration for
   * meetings shorter than that — which reproduces the design's half-hour grid
   * for a 30-minute meeting.
   */
  stepMinutes?: number;
};

function step(rules: SlotRules): number {
  return rules.stepMinutes ?? Math.min(30, rules.durationMinutes);
}

/** The bookable range: from now (plus notice) to the end of the window. */
export function bookingWindow(rules: SlotRules): Interval {
  const start = new Date(
    rules.now.getTime() + rules.minimumNoticeMinutes * 60_000,
  );
  const end = new Date(
    rules.now.getTime() + rules.bookingWindowDays * 24 * 60 * 60_000,
  );
  return { start, end };
}

/**
 * Candidate starts for one calendar day in the host's zone, before any busy or
 * notice filtering. Split out so `slotsForDate` and `isSlotBookable` cannot
 * drift apart.
 */
function candidateStarts(key: DateKey, rules: SlotRules): Date[] {
  const weekday = weekdayInZone(key, rules.hostTimezone);
  const dayRules = rules.rules.filter((r) => r.weekday === weekday);
  if (dayRules.length === 0) return [];

  const out: Date[] = [];
  const stride = step(rules);

  for (const rule of dayRules) {
    const lastStart = rule.end_minute - rules.durationMinutes;
    for (let m = rule.start_minute; m <= lastStart; m += stride) {
      out.push(zonedInstant(key, m, rules.hostTimezone));
    }
  }

  // Two ranges on one day can produce the same instant only if they overlap;
  // dedupe defensively so the UI never renders a duplicate slot.
  const seen = new Set<number>();
  return out
    .filter((d) => {
      const t = d.getTime();
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    })
    .sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Bookable start times for one calendar day, in chronological order.
 *
 * `key` is a `yyyy-MM-dd` day in the HOST's zone — the guest's zone only ever
 * affects presentation, never which instants exist.
 */
export function slotsForDate(key: DateKey, rules: SlotRules): Date[] {
  const window = bookingWindow(rules);
  const busy = padIntervals(rules.busy, rules.bufferMinutes);
  const durationMs = rules.durationMinutes * 60_000;

  return candidateStarts(key, rules).filter((start) => {
    const end = new Date(start.getTime() + durationMs);
    if (start < window.start) return false; // too soon (minimum notice)
    if (start > window.end) return false; // beyond the booking window
    return !busy.some((b) => overlaps({ start, end }, b));
  });
}

/**
 * Authoritative check used server-side before writing a booking. Confirms the
 * requested instant is a real slot under the current rules — the UI's list can
 * always be stale, and a client can post whatever it likes.
 *
 * Note this is a *validity* check, not a *conflict* check: overlapping writes
 * are caught by the `bookings_no_overlap` exclusion constraint, which is the
 * only thing that holds under concurrency.
 */
export function isSlotBookable(startsAt: Date, rules: SlotRules): boolean {
  const key = dateKeyInZone(startsAt, rules.hostTimezone);
  return slotsForDate(key, rules).some(
    (slot) => slot.getTime() === startsAt.getTime(),
  );
}

/**
 * Which days inside the booking window have at least one slot. Drives the
 * calendar's enabled/disabled cells, so the guest never clicks into an empty
 * day.
 */
export function openDatesInWindow(rules: SlotRules): Set<DateKey> {
  const open = new Set<DateKey>();
  const window = bookingWindow(rules);

  let key = dateKeyInZone(rules.now, rules.hostTimezone);
  const lastKey = dateKeyInZone(window.end, rules.hostTimezone);

  // +1 for the boundary day itself; the window is at most 365 days by the
  // meeting_types_window_valid constraint.
  for (let i = 0; i <= rules.bookingWindowDays + 1; i++) {
    if (slotsForDate(key, rules).length > 0) open.add(key);
    if (key === lastKey) break;
    key = addDaysToKey(key, 1);
  }

  return open;
}

/** Convenience: the first day in the window that has a slot. */
export function firstOpenDate(rules: SlotRules): DateKey | null {
  let key = dateKeyInZone(rules.now, rules.hostTimezone);
  for (let i = 0; i <= rules.bookingWindowDays + 1; i++) {
    if (slotsForDate(key, rules).length > 0) return key;
    key = addDaysToKey(key, 1);
  }
  return null;
}

/* ── Availability editing ────────────────────────────────────────────────── */

/** "09:00 AM" ↔ minutes past midnight, for the availability editor's selects. */
export function minutesToLabel(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const meridiem = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${meridiem}`;
}

export function labelToMinutes(label: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim());
  if (!m) return 0;
  let hours = Number.parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === "PM") hours += 12;
  return hours * 60 + Number.parseInt(m[2], 10);
}

/** The time options the availability selects offer, matching the source list. */
export const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let m = 8 * 60; m <= 18 * 60; m += 30) out.push(minutesToLabel(m));
  out.push(minutesToLabel(19 * 60));
  return out;
})();
