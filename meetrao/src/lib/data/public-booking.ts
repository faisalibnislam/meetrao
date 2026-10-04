import "server-only";

import { cache } from "react";

import type { AvailabilityRule, DateOverride, Interval, SlotRules } from "@/lib/booking/slots";
import type { BookingQuestion } from "@/lib/types";
import type { PublicBrand } from "@/components/booking/brand";
import { busyPeriods } from "@/lib/google/calendar";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/* ─────────────────────────────────────────────────────────────────────────────
   The public booking page runs with no session at all.

   So it uses an ANONYMOUS client against the named public functions in
   convex/publicBooking.ts, never general table access: the guest path gets
   named doors, each of which decides for itself what a stranger may see.
   ───────────────────────────────────────────────────────────────────────────── */

export type PublicHost = {
  id: string;
  username: string;
  fullName: string;
  jobTitle: string;
  timezone: string;
  avatarUrl: string | null;
  /** Pro: the "Powered by Meetrao" badge is not shown on their pages. */
  unbranded: boolean;
  /**
   * Pro: their own logo and colour, or null for Meetrao's.
   *
   * Already gated by plan in convex/publicBooking.ts. A lapsed host's rows
   * are still in the table and do not come back from the query. Nothing here
   * re-checks, because there is nothing here to re-check with.
   */
  brand: PublicBrand;
};

export type PublicMeeting = {
  id: string;
  name: string;
  description: string;
  slug: string;
  durationMinutes: number;
  /** What this meeting asks the guest, besides name, email and the note. */
  questions: BookingQuestion[];
  /** How it happens: "google_meet", "phone", "in_person" or "custom". */
  location: string;
  locationDetail: string;
  /** 1 is one-to-one; above that, several guests share each time. */
  capacity: number;
  rules: SlotRules;
};

type HostRow = {
  id: string;
  username: string;
  unbranded?: boolean;
  brand?: { logo_url: string | null; logo_hidden?: boolean; color: string | null; background: string | null } | null;
  full_name: string;
  job_title: string;
  timezone: string;
  avatar_url: string | null;
};

function toHost(row: HostRow): PublicHost {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    jobTitle: row.job_title,
    timezone: row.timezone,
    avatarUrl: row.avatar_url ?? null,
    unbranded: row.unbranded ?? false,
    brand: row.brand
      ? {
          logoUrl: row.brand.logo_url,
          logoHidden: row.brand.logo_hidden ?? false,
          color: row.brand.color,
          background: row.brand.background,
        }
      : null,
  };
}

/* MEMOISED PER REQUEST. A booking page's metadata and the page itself both
   read the host and the meeting, and the personal route starts them early
   while it decides whether to redirect. Without cache() each of those was its
   own cross-region round trip. */
export const getPublicHost = cache(async function getPublicHost(username: string): Promise<PublicHost | null> {
  const row = await convexAnonymous().query(api.publicBooking.getHost, { username });
  // A suspended host has no public booking page.
  return !row || row.is_suspended ? null : toHost(row);
});

type MeetingRow = {
  id: string;
  name: string;
  description: string;
  slug: string;
  duration_minutes: number;
  buffer_minutes: number;
  minimum_notice_minutes: number;
  booking_window_days: number;
  questions?: BookingQuestion[];
  location?: string;
  location_detail?: string;
  capacity?: number;
};

function toMeeting(row: MeetingRow): PublicMeeting {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    slug: row.slug,
    durationMinutes: row.duration_minutes,
    questions: row.questions ?? [],
    location: row.location ?? "google_meet",
    locationDetail: row.location_detail ?? "",
    capacity: row.capacity ?? 1,
    rules: {
      durationMinutes: row.duration_minutes,
      bufferMinutes: row.buffer_minutes,
      minimumNoticeMinutes: row.minimum_notice_minutes,
      bookingWindowDays: row.booking_window_days,
    },
  };
}

/**
 * ONE meeting with its booking rules, in one round trip.
 *
 * Every caller used to list every meeting the host has, fetch the rules for
 * each, and pick one out: two trips in sequence for a page that shows a
 * single meeting. The rules query is
 * keyed by username and slug already, and refuses exactly what the list did:
 * a suspended host, or a meeting that is switched off.
 */
export const getPublicMeeting = cache(async function getPublicMeeting(
  username: string,
  slug: string,
): Promise<PublicMeeting | null> {
  const row = await convexAnonymous().query(api.publicBooking.getMeetingAvailability, { username, slug });
  return row ? toMeeting(row.meeting as MeetingRow) : null;
});

/**
 * The hours behind ONE meeting.
 *
 * Not the host's. A host can have several named schedules and each meeting
 * points at one, so asking by host would offer every window the host has ever
 * opened. The meeting's own schedule is resolved, or the host's default when it
 * has none. Only the hours come back: a schedule's name is the host's private
 * note to themselves.
 */
export async function getMeetingAvailability(meetingId: string): Promise<AvailabilityRule[]> {
  const rows = await convexAnonymous().query(api.publicBooking.availabilityForMeeting, { meetingId });
  return rows.map((r) => ({
    weekday: r.weekday,
    startMinute: r.start_minute,
    endMinute: r.end_minute,
  }));
}

/**
 * The days the meeting does not follow its weekly pattern on.
 *
 * Fetched beside the weekly rules and handed to the engine with them, a slot
 * list built from one without the other offers a host's holiday as bookable.
 */
export async function getMeetingOverrides(meetingId: string): Promise<DateOverride[]> {
  const rows = await convexAnonymous().query(api.publicBooking.overridesForMeetingPublic, { meetingId });
  return rows.map((o) => ({
    date: o.date,
    ranges: o.ranges.map((r) => ({ startMinute: r.start_minute, endMinute: r.end_minute })),
  }));
}

/** How many seats are taken at each instant of a group meeting. */
export async function getSeatMap(
  meetingId: string,
  from: Date,
  to: Date,
): Promise<Record<string, number>> {
  const rows = await convexAnonymous().query(api.publicBooking.seatsForMeeting, {
    meetingId,
    from: from.getTime(),
    to: to.getTime(),
  });
  const out: Record<string, number> = {};
  for (const r of rows) out[new Date(r.starts_at).toISOString()] = r.taken;
  return out;
}

export type BusyResult = { busy: Interval[]; calendarChecked: boolean };

/**
 * Everything the host is not free for: Meetrao's own confirmed bookings, plus
 * whatever Google Calendar reports.
 *
 * If Google cannot be reached the bookings we know about still apply, and
 * `calendarChecked` is false so the caller can say so rather than implying the
 * host's whole calendar was consulted.
 */
export async function getBusy(
  hostId: string,
  from: Date,
  to: Date,
  /* A group meeting's own bookings are not conflicts with themselves: they are
     seats, and whether a seat is left is a count rather than an overlap. Left
     in `busy`, the first booking of a workshop would close it. */
  ignoreMeetingId?: string,
): Promise<BusyResult> {
  /* Both at once. The Google check does not use the bookings at all, and it
     was asked only after they came back, which made it a third round trip in
     sequence on the booking page, and the slowest of the three since it goes
     on to Google from there.

     A Google failure still falls back to our own bookings rather than failing
     the page: `null` here is "could not check", not "nothing busy". */
  const [rows, google] = await Promise.all([
    convexAnonymous().query(api.publicBooking.busyForHost, {
      hostId,
      from: from.getTime(),
      to: to.getTime(),
    }),
    busyPeriods(hostId, from, to).catch(() => null),
  ]);

  const own: Interval[] = rows
    .filter((r) => !ignoreMeetingId || r.meeting_type_id !== ignoreMeetingId)
    .map((r) => ({
      start: new Date(r.starts_at),
      end: new Date(r.ends_at),
    }));

  return google ? { busy: [...own, ...google], calendarChecked: true } : { busy: own, calendarChecked: false };
}

/** Whether this meeting is one the given company's domain may serve. */
export async function meetingIsOnCompany(
  username: string,
  slug: string,
  companySlug: string,
): Promise<boolean> {
  return await convexAnonymous().query(api.publicBooking.meetingIsOnCompany, {
    username,
    slug,
    companySlug,
  });
}

/* ── a company's own address on meetrao.com ──────────────────────────────── */

/** Who `handle` is on this company, or null when the path names nobody. */
export const hostOnCompany = cache(async function hostOnCompany(
  companySlug: string,
  handle: string,
): Promise<string | null> {
  const row = await convexAnonymous().query(api.publicBooking.hostOnCompany, { companySlug, handle });
  return row?.username ?? null;
});

/**
 * Where this meeting's own address is, when it belongs to a company.
 *
 * Null for a personal meeting. The two-segment page uses this to send a
 * company's meeting on to the company's address, so every link already in
 * somebody's signature keeps working and each page has one canonical home.
 */
export async function companyPlaceOf(
  username: string,
  slug: string,
): Promise<{ companySlug: string; handle: string } | null> {
  return await convexAnonymous().query(api.publicBooking.companyPlaceOf, { username, slug });
}

/** A company's brand by slug, in the shape BrandScope wants. */
export const companyBySlug = cache(async function companyBySlug(slug: string): Promise<{
  slug: string;
  name: string;
  unbranded: boolean;
  brand: { logoUrl: string | null; logoHidden: boolean; color: string | null; background: string | null } | null;
} | null> {
  const row = await convexAnonymous().query(api.publicBooking.companyBrandBySlug, { slug });
  if (!row) return null;
  return {
    slug: row.slug,
    name: row.name,
    unbranded: row.unbranded,
    brand: row.brand
      ? {
          logoUrl: row.brand.logo_url,
          logoHidden: row.brand.logo_hidden,
          color: row.brand.color,
          background: row.brand.background,
        }
      : null,
  };
});
