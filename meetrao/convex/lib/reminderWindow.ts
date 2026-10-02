/* ─────────────────────────────────────────────────────────────────────────────
   When a reminder is due, and when it is merely late.

   Pure and separate from convex/reminders.ts so it can be tested: a Convex
   handler takes a ctx and no test in this repo can call one, and this is the
   part with all the edges in it, a booking made inside its own reminder
   window, a sweep catching up after an outage, a meeting that has already
   started.
   ───────────────────────────────────────────────────────────────────────────── */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How late a reminder may be and still be worth sending. */
export const GRACE = 20 * MINUTE;

export type Lead = "24h" | "1h";

/**
 * `send` (claim the row and mail it.
 * `mark`) claim the row and mail nothing: the moment has passed, and leaving
 *          it unclaimed means considering it again on every sweep forever.
 * `wait`, not yet.
 */
export type Verdict = "send" | "mark" | "wait";

/** The free defaults, and what Pro starts from. */
export const DEFAULT_LEADS = { long: 24 * 60, short: 60 } as const;

/** What a host may choose, in minutes. Anything else is refused. */
export const LONG_CHOICES = [2880, 1440, 720, 240] as const;
export const SHORT_CHOICES = [120, 60, 30, 15] as const;

export function verdictFor(
  lead: Lead,
  startsAt: number,
  now: number,
  /* The host's own lead times. Defaulted here rather than at every call site:
     a sweep that forgets them reminds everybody on the free schedule, which
     looks like the feature silently not working. */
  leads: { long: number; short: number } = { ...DEFAULT_LEADS },
): Verdict {
  const until = startsAt - now;
  const longMs = leads.long * MINUTE;
  const shortMs = leads.short * MINUTE;
  const window = lead === "24h" ? longMs : shortMs;

  if (until > window) return "wait";

  if (lead === "1h") {
    // A meeting that started more than the grace period ago is not something
    // to be reminded about; one starting in ten minutes still is.
    return until < -GRACE ? "mark" : "send";
  }

  /* The long reminder inside the short one's window would arrive beside it and
     describe a meeting that is about to start as if it were far off. That is
     the case a booking made this morning for this afternoon hits. */
  return until < shortMs ? "mark" : "send";
}

/**
 * How the long reminder refers to the day, in the RECIPIENT's zone.
 *
 * "Tomorrow" is a claim about the calendar, not about a number of hours, and
 * the two disagree constantly: a meeting 20 hours away can be today, and one
 * 4 hours away is never tomorrow. The first version of this said "tomorrow"
 * to anything inside a day, and a real reminder went out calling a meeting
 * two hours away tomorrow's.
 *
 * Booking windows are short enough that the far end is a weekday name rather
 * than a date, "on Friday" reads as a reminder, "on 2 October" reads as an
 * invoice.
 */
export function dayPhrase(startsAt: number, now: number, timeZone: string): string {
  const day = (ms: number) =>
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
      new Date(ms),
    );

  const today = day(now);
  const target = day(startsAt);
  if (target === today) return "later today";
  if (target === day(now + DAY)) return "tomorrow";

  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long" }).format(new Date(startsAt));
  return `on ${weekday}`;
}

/** The same phrase as a subject line opener: "Later today", "Tomorrow". */
export function dayPhraseTitle(phrase: string): string {
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}
