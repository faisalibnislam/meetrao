import { TZDate } from "@date-fns/tz";

/* ─────────────────────────────────────────────────────────────────────────────
   The slot engine.

   Given a host's weekly availability, a meeting's duration and rules, the
   host's calendar busy periods, and a guest's timezone: produce the bookable
   slots for one date.

   Pure and side-effect free, so it can be unit-tested and re-run server-side
   immediately before a booking is written. Nothing here reads the clock (the
   caller passes `now`.

   Rules, in the order they cut:
     · availability  ) a slot must fit entirely inside one weekly range
     · minimum notice (cuts the near end
     · booking window) cuts the far end
     · buffer        , applies on BOTH sides of every busy period
   ───────────────────────────────────────────────────────────────────────────── */

export type Interval = { start: Date; end: Date };

/** One weekly range, in the host's own timezone. 0 = Sunday. */
export type AvailabilityRule = {
  weekday: number;
  startMinute: number;
  endMinute: number;
};

/**
 * One calendar day that does not follow the weekly pattern.
 *
 * `date` is a host-local "YYYY-MM-DD" (the same key `dateKey` produces) and
 * an empty `ranges` closes the day. A day with ranges REPLACES the weekly
 * rules for that date: a host who says "14:00-17:00 that Friday" means instead
 * of, not as well as.
 */
export type DateOverride = {
  date: string;
  ranges: readonly { startMinute: number; endMinute: number }[];
};

export type SlotRules = {
  durationMinutes: number;
  bufferMinutes: number;
  minimumNoticeMinutes: number;
  bookingWindowDays: number;
};

/** A calendar date as the guest sees it, not an instant. */
export type PlainDate = { year: number; month: number; day: number };

export type ComputeSlotsInput = {
  date: PlainDate;
  guestTimezone: string;
  hostTimezone: string;
  availability: readonly AvailabilityRule[];
  rules: SlotRules;
  /** Confirmed bookings plus Google Calendar busy periods, as UTC instants. */
  busy: readonly Interval[];
  /** Days off and one-off hours, keyed by the host's own calendar date. */
  overrides?: readonly DateOverride[];
  now: Date;
};

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** The instant at which a wall-clock time occurs in a given zone. */
export function zonedInstant(
  { year, month, day }: PlainDate,
  minutesIntoDay: number,
  timeZone: string,
): Date {
  const hours = Math.floor(minutesIntoDay / 60);
  const minutes = minutesIntoDay % 60;
  // Date normalises overflow, so hour 24 lands on the next day at 00:00,
  // which is what an availability range ending at 1440 means.
  return new Date(new TZDate(year, month - 1, day, hours, minutes, timeZone).getTime());
}

/** The calendar date an instant falls on, in a given zone. */
function plainDateIn(instant: Date, timeZone: string): PlainDate {
  const d = new TZDate(instant.getTime(), timeZone);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function weekdayIn(instant: Date, timeZone: string): number {
  return new TZDate(instant.getTime(), timeZone).getDay();
}

export function addDays(date: PlainDate, days: number): PlainDate {
  // Anchored at UTC noon so the arithmetic cannot be dragged across a day
  // boundary by an offset.
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day, 12));
  d.setUTCDate(d.getUTCDate() + days);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function sameDate(a: PlainDate, b: PlainDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function dateKey({ year, month, day }: PlainDate): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * The host's availability, expanded into real intervals covering the window.
 * Each range is built from the host's wall clock on its own local day, so a
 * range that spans a DST transition keeps its wall-clock start and end rather
 * than shifting by an hour.
 */
export function expandAvailability(
  availability: readonly AvailabilityRule[],
  hostTimezone: string,
  windowStart: Date,
  windowEnd: Date,
  overrides: readonly DateOverride[] = [],
): Interval[] {
  /* An empty week is still worth walking when a date override might open a
     day: a host with no weekly hours who opens one Saturday has exactly one
     bookable day, and returning early here would hide it. */
  if (availability.length === 0 && overrides.length === 0) return [];

  const byDate = new Map(overrides.map((o) => [o.date, o]));
  const out: Interval[] = [];
  // One day either side: the guest's day can straddle up to two host days.
  let cursor = plainDateIn(new Date(windowStart.getTime() - DAY), hostTimezone);
  const last = plainDateIn(new Date(windowEnd.getTime() + DAY), hostTimezone);

  for (let guard = 0; guard < 8; guard++) {
    const midday = zonedInstant(cursor, 12 * 60, hostTimezone);
    const weekday = weekdayIn(midday, hostTimezone);

    /* A date the host has spoken about answers for itself. An override with
       no ranges closes the day outright, which is why this replaces the
       weekly rules rather than filtering them. */
    const override = byDate.get(dateKey(cursor));
    const ranges = override
      ? override.ranges.map((r) => ({ startMinute: r.startMinute, endMinute: r.endMinute }))
      : availability.filter((r) => r.weekday === weekday);

    for (const rule of ranges) {
      const start = zonedInstant(cursor, rule.startMinute, hostTimezone);
      const end = zonedInstant(cursor, rule.endMinute, hostTimezone);
      if (end.getTime() <= start.getTime()) continue;
      if (!overlaps(start.getTime(), end.getTime(), windowStart.getTime(), windowEnd.getTime())) continue;
      out.push({ start, end });
    }

    if (sameDate(cursor, last)) break;
    cursor = addDays(cursor, 1);
  }

  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Bookable start instants for one guest-local date.
 *
 * Slots are anchored to each availability range's own start and step by the
 * meeting duration, so a 30-minute meeting on a 09:00–17:00 day offers 09:00,
 * 09:30, … and never a ragged grid.
 */
export function computeSlots({
  date,
  guestTimezone,
  hostTimezone,
  availability,
  rules,
  busy,
  overrides = [],
  now,
}: ComputeSlotsInput): Date[] {
  const { durationMinutes, bufferMinutes, minimumNoticeMinutes, bookingWindowDays } = rules;
  if (durationMinutes <= 0) return [];

  const dayStart = zonedInstant(date, 0, guestTimezone).getTime();
  const dayEnd = zonedInstant(addDays(date, 1), 0, guestTimezone).getTime();

  const earliest = now.getTime() + minimumNoticeMinutes * MINUTE;
  const latest = now.getTime() + bookingWindowDays * DAY;
  if (dayEnd <= earliest || dayStart > latest) return [];

  const ranges = expandAvailability(availability, hostTimezone, new Date(dayStart), new Date(dayEnd), overrides);

  const durationMs = durationMinutes * MINUTE;
  const bufferMs = bufferMinutes * MINUTE;
  const out: Date[] = [];

  for (const range of ranges) {
    const rangeStart = range.start.getTime();
    const rangeEnd = range.end.getTime();

    for (let start = rangeStart; start + durationMs <= rangeEnd; start += durationMs) {
      const end = start + durationMs;

      // Only slots that belong to the date the guest is looking at.
      if (start < dayStart || start >= dayEnd) continue;

      if (start < earliest) continue;
      if (start > latest) continue;

      // Buffer applies both sides, so a neighbouring booking blocks this slot
      // even when the two intervals do not themselves overlap.
      const blocked = busy.some((b) =>
        overlaps(start - bufferMs, end + bufferMs, b.start.getTime(), b.end.getTime()),
      );
      if (blocked) continue;

      out.push(new Date(start));
    }
  }

  return out.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Whether one specific start instant is still bookable. Used server-side
 * immediately before writing a booking, so the "someone booked it while you
 * were filling this in" state is the truth rather than a guess.
 */
export function isSlotBookable(input: Omit<ComputeSlotsInput, "date"> & { start: Date }): boolean {
  const date = plainDateIn(input.start, input.guestTimezone);
  return computeSlots({ ...input, date }).some((s) => s.getTime() === input.start.getTime());
}

/**
 * Which dates in a month have at least one bookable slot. Drives the calendar's
 * open / disabled cell states, so a guest is never invited to click a dead day.
 */
export function bookableDatesInMonth(
  input: Omit<ComputeSlotsInput, "date"> & { year: number; month: number },
): Set<string> {
  const { year, month } = input;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const open = new Set<string>();

  for (let day = 1; day <= days; day++) {
    const date = { year, month, day };
    if (computeSlots({ ...input, date }).length > 0) open.add(dateKey(date));
  }

  return open;
}
