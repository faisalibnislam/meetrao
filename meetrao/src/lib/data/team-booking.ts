import "server-only";

import { cache } from "react";
import { bookableDatesInMonth, computeSlots, type AvailabilityRule, type DateOverride, type Interval, type PlainDate, type SlotRules } from "@/lib/booking/slots";
import { busyPeriods } from "@/lib/google/calendar";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import type { BookingQuestion } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────────────────────
   A team's booking page.

   The slot list is the UNION of its members: a time is offered when at least
   one person could take it, which is the whole promise of a team link. The
   engine is run once per member, against that member's own hours, own zone,
   own days off and own calendar, not against some merged pseudo-host, which
   would have to invent a timezone and would get DST wrong for everybody.

   That costs one Google call per member. A team is people, so the number is
   small and bounded by the 25-member cap in convex/teams.ts.
   ───────────────────────────────────────────────────────────────────────────── */

export type TeamMember = { id: string; name: string; timezone: string; avatarUrl: string | null };

export type TeamMeeting = {
  id: string;
  name: string;
  description: string;
  slug: string;
  durationMinutes: number;
  location: string;
  locationDetail: string;
  questions: BookingQuestion[];
  rules: SlotRules;
};

export type PublicTeam = { id: string; name: string; slug: string; members: TeamMember[]; meetings: TeamMeeting[] };

/* Cached per request: the page's metadata and the page both ask. */
export const getPublicTeam = cache(async function getPublicTeam(slug: string): Promise<PublicTeam | null> {
  const team = await convexAnonymous().query(api.publicBooking.getTeam, { slug });
  if (!team) return null;

  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    members: team.members.map((m) => ({ id: m.id, name: m.name, timezone: m.timezone, avatarUrl: m.avatar_url })),
    meetings: team.meetings.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      slug: m.slug,
      durationMinutes: m.duration_minutes,
      location: m.location,
      locationDetail: m.location_detail,
      questions: m.questions,
      rules: {
        durationMinutes: m.duration_minutes,
        bufferMinutes: m.buffer_minutes,
        minimumNoticeMinutes: m.minimum_notice_minutes,
        bookingWindowDays: m.booking_window_days,
      },
    })),
  };
});

type MemberHours = {
  userId: string;
  timezone: string;
  availability: AvailabilityRule[];
  overrides: DateOverride[];
};

export async function getTeamHours(teamSlug: string, meetingId: string): Promise<MemberHours[]> {
  const rows = await convexAnonymous().query(api.publicBooking.teamMemberAvailability, { teamSlug, meetingId });
  return rows.map((r) => ({
    userId: r.user_id,
    timezone: r.timezone,
    availability: r.rules.map((x) => ({ weekday: x.weekday, startMinute: x.start_minute, endMinute: x.end_minute })),
    overrides: r.overrides.map((o) => ({
      date: o.date,
      ranges: o.ranges.map((x) => ({ startMinute: x.start_minute, endMinute: x.end_minute })),
    })),
  }));
}

async function busyFor(userId: string, from: Date, to: Date): Promise<Interval[]> {
  // Our bookings and Google's free/busy at the same time: neither needs the
  // other. Google unreachable for one member is not a reason to hide the team.
  const [rows, google] = await Promise.all([
    convexAnonymous().query(api.publicBooking.busyForHost, { hostId: userId, from: from.getTime(), to: to.getTime() }),
    busyPeriods(userId, from, to).catch(() => [] as Interval[]),
  ]);
  const own: Interval[] = rows.map((r) => ({ start: new Date(r.starts_at), end: new Date(r.ends_at) }));
  return [...own, ...google];
}

/**
 * Everyone's calendars for one window, fetched once.
 *
 * The month grid and the day's times are two questions about the same data,
 * and asking Google twice per member to answer them would double the cost of
 * every page load for nothing.
 *
 * Every member at once. This awaited each member in turn, two round trips
 * apiece, so a team of five waited through ten before a guest saw a time.
 */
export async function getTeamBusy(hours: MemberHours[], from: Date, to: Date): Promise<Map<string, Interval[]>> {
  const busy = await Promise.all(hours.map((member) => busyFor(member.userId, from, to)));
  return new Map(hours.map((member, i) => [member.userId, busy[i]]));
}

/**
 * Every instant at least one member could take, for one guest-local day.
 *
 * De-duplicated: two members free at 10:00 is one slot on offer, and which of
 * them gets it is decided when the booking is made, by the rotation, not
 * here, where nothing has been agreed yet.
 */
export function teamSlotsForDay(args: {
  hours: MemberHours[];
  busy: Map<string, Interval[]>;
  meeting: TeamMeeting;
  date: PlainDate;
  guestTimezone: string;
  now?: Date;
}): string[] {
  const now = args.now ?? new Date();
  const found = new Set<string>();

  for (const member of args.hours) {
    for (const slot of computeSlots({
      date: args.date,
      guestTimezone: args.guestTimezone,
      hostTimezone: member.timezone,
      availability: member.availability,
      overrides: member.overrides,
      rules: args.meeting.rules,
      busy: args.busy.get(member.userId) ?? [],
      now,
    })) {
      found.add(slot.toISOString());
    }
  }

  return [...found].sort();
}

/** Every date in the month at least one member has something open on. */
export function teamOpenDates(args: {
  hours: MemberHours[];
  busy: Map<string, Interval[]>;
  meeting: TeamMeeting;
  year: number;
  month: number;
  guestTimezone: string;
  now?: Date;
}): string[] {
  const now = args.now ?? new Date();
  const open = new Set<string>();

  for (const member of args.hours) {
    for (const key of bookableDatesInMonth({
      year: args.year,
      month: args.month,
      guestTimezone: args.guestTimezone,
      hostTimezone: member.timezone,
      availability: member.availability,
      overrides: member.overrides,
      rules: args.meeting.rules,
      busy: args.busy.get(member.userId) ?? [],
      now,
    })) {
      open.add(key);
    }
  }

  return [...open].sort();
}
