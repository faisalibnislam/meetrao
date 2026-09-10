/* ─────────────────────────────────────────────────────────────────────────────
   The weekly schedule, as data.

   No "use client" and no "server-only", deliberately: these are called from
   both sides. The onboarding steps and the availability page turn database
   rows into days on the server; the editor turns days back into rows in the
   browser.

   They used to live in availability-editor.tsx, which is a client component.
   Every export of a "use client" module becomes a client reference on the
   server, so a Server Component calling one throws at request time —

     Attempted to call rulesToDays() from the server but rulesToDays is on the
     client.

   — while the build, the type check and any unit test all pass, because none
   of them honour the directive. Onboarding steps 4 and 5 returned 500 in
   production for exactly that reason. Pure helpers shared across the boundary
   belong in a module that declares neither side.
   ───────────────────────────────────────────────────────────────────────────── */

export type Range = { start: number; end: number };
export type Day = { weekday: number; label: string; on: boolean; ranges: Range[] };

export type AvailabilityRow = { weekday: number; start_minute: number; end_minute: number };

/** One named schedule, with the days it holds and what it is used for. */
export type ScheduleView = {
  id: string;
  name: string;
  isDefault: boolean;
  days: Day[];
  /** Names of the meeting types pinned to this schedule, for the "used by" line. */
  usedBy: string[];
};

/** The week a brand-new schedule starts with: Monday to Friday, 09:00-17:00.
    An empty week would be a schedule that silently books nothing. */
export function starterWeek(): Day[] {
  return WEEK_ORDER.map((weekday) => ({
    weekday,
    label: DAY_LABELS[weekday],
    on: weekday >= 1 && weekday <= 5,
    ranges: [{ ...DEFAULT_RANGE }],
  }));
}

export const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Monday first — the working week is what a host is setting. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** The default range a day gets when it is switched on: 09:00 to 17:00. */
const DEFAULT_RANGE: Range = { start: 540, end: 1020 };

export function emptyWeek(): Day[] {
  return WEEK_ORDER.map((weekday) => ({
    weekday,
    label: DAY_LABELS[weekday],
    on: false,
    ranges: [{ ...DEFAULT_RANGE }],
  }));
}

/** Database rows to the seven days the editor shows. */
export function rulesToDays(rules: AvailabilityRow[]): Day[] {
  return WEEK_ORDER.map((weekday) => {
    const ranges = rules
      .filter((r) => r.weekday === weekday)
      .sort((a, b) => a.start_minute - b.start_minute)
      .map((r) => ({ start: r.start_minute, end: r.end_minute }));

    return {
      weekday,
      label: DAY_LABELS[weekday],
      on: ranges.length > 0,
      // A day that is off still remembers a sensible range for when it is
      // switched back on.
      ranges: ranges.length ? ranges : [{ ...DEFAULT_RANGE }],
    };
  });
}

/** Rows as the database stores them: only enabled days, only real ranges. */
export function daysToRules(days: Day[]): AvailabilityRow[] {
  return days
    .filter((d) => d.on)
    .flatMap((d) =>
      d.ranges
        .filter((r) => r.end > r.start)
        .map((r) => ({ weekday: d.weekday, start_minute: r.start, end_minute: r.end })),
    );
}
