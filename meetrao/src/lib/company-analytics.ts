/* ─────────────────────────────────────────────────────────────────────────────
   What a company's bookings add up to.

   PURE, AND DELIBERATELY SO. Convex returns rows; every number on the screen
   is worked out here, from arguments. That makes the whole of this testable
   without a database, which matters more than usual: an analytics screen is
   the one place where a wrong number is invisible. A booking list that drops
   a row looks like a booking list. A utilisation figure that drops a row
   looks like a utilisation figure.

   DAYS AND HOURS ARE IN THE VIEWER'S TIMEZONE, not UTC. "How many meetings
   today" is a question about the day somebody is living in, and a London
   company reading a UTC bucket would see Monday's late meetings counted on
   Tuesday for half the year. Every bucket key goes through Intl with an
   explicit timezone, which is why this is in the Next.js layer and not in a
   Convex query.

   CANCELLED ROWS ARE KEPT, not filtered on the way in. A cancellation is the
   most interesting thing in the table: it is the only signal here that says
   something is going wrong rather than something is going well. Each measure
   decides for itself whether to count them, and the ones that do not say so.
   ───────────────────────────────────────────────────────────────────────────── */

import { dateFormat } from "./intl";

export type AnalyticsBooking = {
  hostId: string;
  startsAt: number;
  endsAt: number;
  durationMinutes: number;
  status: "confirmed" | "cancelled";
  cancelledBy: "host" | "guest" | null;
  meetingName: string;
  guestName: string;
  guestEmail: string;
  /** When it was booked, which is what makes notice measurable. */
  createdAt: number;
};

export type AnalyticsMember = {
  userId: string;
  name: string;
  handle: string;
  role: "owner" | "admin" | "member";
  /** Meetings switched on for this company. Zero means a handle serving 404s. */
  activeLinks: number;
};

export type NextUp = {
  startsAt: number;
  durationMinutes: number;
  memberId: string;
  memberName: string;
  meetingName: string;
  guestName: string;
};

export type MemberLoad = {
  userId: string;
  name: string;
  handle: string;
  role: AnalyticsMember["role"];
  activeLinks: number;
  /** Confirmed, in the window that has already happened. */
  held: number;
  /** Confirmed and still to come, however far out. */
  upcoming: number;
  cancelled: number;
  /** Minutes held in the window. Hours are a presentation choice. */
  minutes: number;
  next: NextUp | null;
};

export type DayBucket = {
  key: string;
  label: string;
  weekday: number;
  count: number;
  minutes: number;
  /** A day that has not happened yet. Drawn lighter: those are bookings held,
      not work done, and one bar for both would be two different facts. */
  future: boolean;
};

export type CompanyAnalytics = {
  /** The window these numbers describe, in days. */
  days: number;
  timezone: string;
  today: { total: number; remaining: number; minutes: number };
  /** Confirmed meetings starting in the next seven days. */
  next7: number;
  window: {
    held: number;
    cancelled: number;
    /** Cancelled as a share of everything booked for the window, 0 to 1. */
    cancelRate: number;
    minutes: number;
    /** Distinct guest addresses. Repeat guests are the point of knowing. */
    people: number;
    /** Median hours between booking and meeting. Null with nothing to measure. */
    medianNoticeHours: number | null;
  };
  upNext: NextUp[];
  perDay: DayBucket[];
  byMeeting: { name: string; count: number; minutes: number }[];
  /** Confirmed starts per weekday, Sunday first, and per hour of the day. */
  byWeekday: number[];
  byHour: number[];
  members: MemberLoad[];
  /** The things worth doing something about, most urgent first. */
  flags: { kind: "no-links" | "idle" | "cancellations" | "overloaded"; who: string; detail: string }[];
};

const DAY_MS = 86_400_000;

/** The day a moment falls on, where the viewer lives. "2026-10-04". */
export function dayKey(ts: number, timezone: string): string {
  return dateFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

/** The hour of the day, 0 to 23, where the viewer lives. */
function hourIn(ts: number, timezone: string): number {
  const text = dateFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).format(new Date(ts));
  /* "24" is midnight in some en-GB/ICU combinations, and a 24th bucket would
     be a column nobody can explain. */
  return Number(text) % 24;
}

/** Weekday index where the viewer lives, Sunday 0, to match Date.getDay(). */
function weekdayIn(ts: number, timezone: string): number {
  const name = dateFormat("en-US", { timeZone: timezone, weekday: "short" }).format(new Date(ts));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

/** "4 Oct", for a column nobody should have to decode. */
function dayLabel(ts: number, timezone: string): string {
  return dateFormat("en-GB", { timeZone: timezone, day: "numeric", month: "short" }).format(
    new Date(ts),
  );
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Every number on the company dashboard, from the rows and the people.
 *
 * `now` is passed rather than read so that this is a function of its
 * arguments and nothing else, which is what makes a test about "today"
 * possible at all.
 */
export function summarise(
  bookings: readonly AnalyticsBooking[],
  members: readonly AnalyticsMember[],
  opts: { now: number; timezone: string; days: number },
): CompanyAnalytics {
  const { now, timezone, days } = opts;
  const from = now - days * DAY_MS;
  const todayKey = dayKey(now, timezone);

  const confirmed = bookings.filter((b) => b.status === "confirmed");

  /* ── today ────────────────────────────────────────────────────────────── */
  const todayRows = confirmed.filter((b) => dayKey(b.startsAt, timezone) === todayKey);
  const today = {
    total: todayRows.length,
    remaining: todayRows.filter((b) => b.endsAt > now).length,
    minutes: todayRows.reduce((sum, b) => sum + b.durationMinutes, 0),
  };

  const next7 = confirmed.filter((b) => b.startsAt >= now && b.startsAt < now + 7 * DAY_MS).length;

  /* ── the window ───────────────────────────────────────────────────────────
     Held means confirmed and already started: counting meetings that have not
     happened yet as work done would make every Monday look like a good week. */
  const inWindow = bookings.filter((b) => b.startsAt >= from && b.startsAt <= now);
  const heldRows = inWindow.filter((b) => b.status === "confirmed");
  const cancelledRows = inWindow.filter((b) => b.status === "cancelled");

  /* Notice is measured from the booking that was actually kept. A cancelled
     one tells you when somebody changed their mind, not how far ahead this
     company gets booked. */
  const notice = heldRows
    .map((b) => (b.startsAt - b.createdAt) / 3_600_000)
    .filter((hours) => hours >= 0);

  const window = {
    held: heldRows.length,
    cancelled: cancelledRows.length,
    cancelRate: inWindow.length === 0 ? 0 : cancelledRows.length / inWindow.length,
    minutes: heldRows.reduce((sum, b) => sum + b.durationMinutes, 0),
    people: new Set(heldRows.map((b) => b.guestEmail.trim().toLowerCase()).filter(Boolean)).size,
    medianNoticeHours: median(notice),
  };

  /* ── who is up next ───────────────────────────────────────────────────── */
  const nameOf = new Map(members.map((m) => [m.userId, m.name]));
  const toNextUp = (b: AnalyticsBooking): NextUp => ({
    startsAt: b.startsAt,
    durationMinutes: b.durationMinutes,
    memberId: b.hostId,
    memberName: nameOf.get(b.hostId) ?? "Somebody",
    meetingName: b.meetingName,
    guestName: b.guestName,
  });

  const upcoming = confirmed
    .filter((b) => b.startsAt >= now)
    .sort((a, b) => a.startsAt - b.startsAt);
  const upNext = upcoming.slice(0, 6).map(toNextUp);

  /* ── per day, across the whole window and up to a fortnight ahead ─────────
     Built from a calendar walk rather than from the rows, so a day with
     nothing on it is a gap in the chart instead of a missing column. */
  const counts = new Map<string, { count: number; minutes: number }>();
  for (const b of confirmed) {
    const key = dayKey(b.startsAt, timezone);
    const at = counts.get(key) ?? { count: 0, minutes: 0 };
    at.count += 1;
    at.minutes += b.durationMinutes;
    counts.set(key, at);
  }

  const perDay: DayBucket[] = [];
  for (let i = days; i >= -13; i--) {
    const at = now - i * DAY_MS;
    const key = dayKey(at, timezone);
    const found = counts.get(key) ?? { count: 0, minutes: 0 };
    perDay.push({
      key,
      label: dayLabel(at, timezone),
      weekday: weekdayIn(at, timezone),
      future: i < 0,
      ...found,
    });
  }

  /* ── what gets booked, and when ───────────────────────────────────────── */
  const byName = new Map<string, { count: number; minutes: number }>();
  for (const b of heldRows) {
    const at = byName.get(b.meetingName) ?? { count: 0, minutes: 0 };
    at.count += 1;
    at.minutes += b.durationMinutes;
    byName.set(b.meetingName, at);
  }
  const byMeeting = [...byName.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const byWeekday = Array(7).fill(0) as number[];
  const byHour = Array(24).fill(0) as number[];
  for (const b of heldRows) {
    byWeekday[weekdayIn(b.startsAt, timezone)] += 1;
    byHour[hourIn(b.startsAt, timezone)] += 1;
  }

  /* ── per person ───────────────────────────────────────────────────────── */
  const load: MemberLoad[] = members.map((m) => {
    const theirs = bookings.filter((b) => b.hostId === m.userId);
    const theirWindow = theirs.filter((b) => b.startsAt >= from && b.startsAt <= now);
    const theirHeld = theirWindow.filter((b) => b.status === "confirmed");
    const theirNext = theirs
      .filter((b) => b.status === "confirmed" && b.startsAt >= now)
      .sort((a, b) => a.startsAt - b.startsAt)[0];

    return {
      userId: m.userId,
      name: m.name,
      handle: m.handle,
      role: m.role,
      activeLinks: m.activeLinks,
      held: theirHeld.length,
      upcoming: theirs.filter((b) => b.status === "confirmed" && b.startsAt >= now).length,
      cancelled: theirWindow.filter((b) => b.status === "cancelled").length,
      minutes: theirHeld.reduce((sum, b) => sum + b.durationMinutes, 0),
      next: theirNext ? toNextUp(theirNext) : null,
    };
  });

  load.sort(
    (a, b) =>
      (a.next ? a.next.startsAt : Number.POSITIVE_INFINITY) -
        (b.next ? b.next.startsAt : Number.POSITIVE_INFINITY) ||
      b.held - a.held ||
      a.name.localeCompare(b.name),
  );

  /* ── what to do about it ──────────────────────────────────────────────────
     A dashboard that only describes is a dashboard nobody opens twice. These
     are the four states worth a sentence, and each one names a person,
     because "utilisation is uneven" is not something anybody can act on. */
  const flags: CompanyAnalytics["flags"] = [];
  for (const m of load) {
    if (m.activeLinks === 0) {
      flags.push({
        kind: "no-links",
        who: m.name,
        detail: `No meeting is switched on, so /${m.handle} answers nothing.`,
      });
    } else if (m.upcoming === 0 && m.held === 0) {
      flags.push({ kind: "idle", who: m.name, detail: `Nothing booked, and nothing in the last ${days} days.` });
    } else if (m.upcoming === 0) {
      flags.push({ kind: "idle", who: m.name, detail: "Nothing booked from here on." });
    }
    if (m.cancelled > 0 && m.cancelled >= m.held) {
      flags.push({
        kind: "cancellations",
        who: m.name,
        detail: `${m.cancelled} cancelled against ${m.held} held.`,
      });
    }
  }

  /* Uneven load is only worth saying when there is somebody to say it about,
     which means at least two people and a real gap between them. */
  if (load.length > 1 && window.held >= 4) {
    const busiest = [...load].sort((a, b) => b.held - a.held)[0];
    const share = busiest.held / window.held;
    if (share >= 0.6) {
      flags.push({
        kind: "overloaded",
        who: busiest.name,
        detail: `Took ${Math.round(share * 100)}% of the meetings held in the last ${days} days.`,
      });
    }
  }

  return {
    days,
    timezone,
    today,
    next7,
    window,
    upNext,
    perDay,
    byMeeting,
    byWeekday,
    byHour,
    members: load,
    flags,
  };
}
