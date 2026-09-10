import "server-only";

import type { AvailabilityRule, Interval, SlotRules } from "@/lib/booking/slots";
import { busyPeriods } from "@/lib/google/calendar";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* ─────────────────────────────────────────────────────────────────────────────
   The public booking page runs with no session at all, so every read goes
   through the SECURITY DEFINER functions in the schema — never a table.
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

export async function getPublicHost(username: string): Promise<PublicHost | null> {
  const { data } = await supabaseAdmin().rpc("get_public_host", { p_username: username });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    jobTitle: row.job_title,
    timezone: row.timezone,
    avatarUrl: row.avatar_url ?? null,
  };
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

export async function getPublicMeetings(username: string): Promise<PublicMeeting[]> {
  const { data } = await supabaseAdmin().rpc("get_public_meeting_types", { p_username: username });

  return ((data ?? []) as MeetingRow[]).map((row) => ({
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
  }));
}

/**
 * The hours behind ONE meeting.
 *
 * Not the host's — a host can have several named schedules and each meeting
 * points at one, so asking by host would offer every window the host has ever
 * opened. `get_meeting_availability` resolves the meeting's own schedule, or
 * the host's default when it has none. Only the hours come back: a schedule's
 * name is the host's private note to themselves.
 */
export async function getMeetingAvailability(meetingId: string): Promise<AvailabilityRule[]> {
  const { data } = await supabaseAdmin().rpc("get_meeting_availability", { p_meeting_id: meetingId });

  return ((data ?? []) as { weekday: number; start_minute: number; end_minute: number }[]).map((r) => ({
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
  const { data } = await supabaseAdmin().rpc("get_busy_intervals", {
    p_user_id: hostId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  const own: Interval[] = ((data ?? []) as { starts_at: string; ends_at: string }[]).map((r) => ({
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
