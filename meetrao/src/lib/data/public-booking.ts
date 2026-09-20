import "server-only";

import type { AvailabilityRule, Interval, SlotRules } from "@/lib/booking/slots";
import { busyPeriods } from "@/lib/google/calendar";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { convexServes } from "@/lib/backend";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/* ─────────────────────────────────────────────────────────────────────────────
   The public booking page runs with no session at all.

   On Supabase that meant every read went through a SECURITY DEFINER function
   rather than a table. On Convex it means an ANONYMOUS client against the
   public functions in convex/publicBooking.ts — the same principle, that the
   guest path gets named doors and never general table access.
   ───────────────────────────────────────────────────────────────────────────── */

export type PublicHost = {
  id: string;
  username: string;
  fullName: string;
  jobTitle: string;
  timezone: string;
  avatarUrl: string | null;
};

export type PublicMeeting = {
  id: string;
  name: string;
  description: string;
  slug: string;
  durationMinutes: number;
  rules: SlotRules;
};

type HostRow = {
  id: string;
  username: string;
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
  };
}

export async function getPublicHost(username: string): Promise<PublicHost | null> {
  if (convexServes("publicBooking")) {
    const row = await convexAnonymous().query(api.publicBooking.getHost, { username });
    // get_public_host returned nothing for a suspended host; the Convex query
    // reports the flag instead, so the filter lives here.
    return !row || row.is_suspended ? null : toHost(row);
  }

  const { data } = await supabaseAdmin().rpc("get_public_host", { p_username: username });
  const row = (Array.isArray(data) ? data[0] : data) as HostRow | null;
  return row ? toHost(row) : null;
}

type MeetingRow = {
  id: string;
  name: string;
  description: string;
  slug: string;
  duration_minutes: number;
  buffer_minutes: number;
  minimum_notice_minutes: number;
  booking_window_days: number;
};

function toMeeting(row: MeetingRow): PublicMeeting {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    slug: row.slug,
    durationMinutes: row.duration_minutes,
    rules: {
      durationMinutes: row.duration_minutes,
      bufferMinutes: row.buffer_minutes,
      minimumNoticeMinutes: row.minimum_notice_minutes,
      bookingWindowDays: row.booking_window_days,
    },
  };
}

export async function getPublicMeetings(username: string): Promise<PublicMeeting[]> {
  if (convexServes("publicBooking")) {
    // getMeetingTypes is the listing shape and omits the booking rules, which
    // only matter once a meeting is chosen; getMeetingAvailability carries them.
    const list = await convexAnonymous().query(api.publicBooking.getMeetingTypes, { username });
    const full = await Promise.all(
      list.map((m) => convexAnonymous().query(api.publicBooking.getMeetingAvailability, { username, slug: m.slug })),
    );
    return full
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .map((r) => toMeeting(r.meeting as MeetingRow));
  }

  const { data } = await supabaseAdmin().rpc("get_public_meeting_types", { p_username: username });
  return ((data ?? []) as MeetingRow[]).map(toMeeting);
}

/**
 * The hours behind ONE meeting.
 *
 * Not the host's — a host can have several named schedules and each meeting
 * points at one, so asking by host would offer every window the host has ever
 * opened. The meeting's own schedule is resolved, or the host's default when it
 * has none. Only the hours come back: a schedule's name is the host's private
 * note to themselves.
 */
export async function getMeetingAvailability(meetingId: string): Promise<AvailabilityRule[]> {
  const rows = convexServes("publicBooking")
    ? await convexAnonymous().query(api.publicBooking.availabilityForMeeting, { meetingId })
    : (
        (await supabaseAdmin().rpc("get_meeting_availability", { p_meeting_id: meetingId })).data ?? []
      ) as { weekday: number; start_minute: number; end_minute: number }[];

  return rows.map((r) => ({
    weekday: r.weekday,
    startMinute: r.start_minute,
    endMinute: r.end_minute,
  }));
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
export async function getBusy(hostId: string, from: Date, to: Date): Promise<BusyResult> {
  const rows = convexServes("publicBooking")
    ? await convexAnonymous().query(api.publicBooking.busyForHost, {
        hostId,
        from: from.getTime(),
        to: to.getTime(),
      })
    : (
        (
          await supabaseAdmin().rpc("get_busy_intervals", {
            p_user_id: hostId,
            p_from: from.toISOString(),
            p_to: to.toISOString(),
          })
        ).data ?? []
      ) as { starts_at: string; ends_at: string }[];

  const own: Interval[] = rows.map((r) => ({
    start: new Date(r.starts_at),
    end: new Date(r.ends_at),
  }));

  try {
    const google = await busyPeriods(hostId, from, to);
    return { busy: [...own, ...google], calendarChecked: true };
  } catch {
    return { busy: own, calendarChecked: false };
  }
}
