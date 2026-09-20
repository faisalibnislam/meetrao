import "server-only";

import { formatDayLabel, formatShortDate, formatTimeRange } from "@/lib/booking/time";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { timezoneLabel } from "@/lib/timezones";
import type { Booking, MeetingType, Profile } from "@/lib/types";

/* Admin reads go through the caller's own session: RLS grants an admin select
   on everything, so nothing here needs the service role and an admin who loses
   the flag loses the data with it. */

export type AdminMetrics = { users: number; bookings: number; upcoming: number; meetings: number };

export async function adminMetrics(): Promise<AdminMetrics> {
  const convex = await convexServer();
  return await convex.query(api.admin.metrics, {});
}

export type ActivityRow = { id: string; kind: string; summary: string; when: string };

export async function recentActivity(limit = 8): Promise<ActivityRow[]> {
  const convex = await convexServer();
  const rows = await convex.query(api.admin.listActivity, { limit });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    summary: r.summary,
    when: relative(new Date(r.created_at)),
  }));
}

function relative(at: Date): string {
  const seconds = Math.max(0, Math.round((Date.now() - at.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  username: string;
  timezone: string;
  meetings: number;
  bookings: number;
  joined: string;
  suspended: boolean;
};

export async function listUsers(query: string): Promise<AdminUserRow[]> {
  const convex = await convexServer();
  const rows = await convex.query(api.admin.usersWithCounts, {});
  const profiles = rows as unknown as Profile[];
  const meetingCount = new Map(rows.map((r) => [r.id, r.meetings]));
  const bookingCount = new Map(rows.map((r) => [r.id, r.bookings]));

  const q = query.trim().toLowerCase();

  return profiles
    .filter((p) => !q || `${p.full_name} ${p.email} ${p.username}`.toLowerCase().includes(q))
    .map((p) => ({
      id: p.id,
      name: p.full_name || p.username,
      email: p.email,
      username: p.username,
      timezone: timezoneLabel(p.timezone),
      meetings: meetingCount.get(p.id) ?? 0,
      bookings: bookingCount.get(p.id) ?? 0,
      joined: formatShortDate(new Date(p.created_at), "UTC"),
      suspended: p.is_suspended,
    }));
}

function tally(ids: string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const id of ids) out.set(id, (out.get(id) ?? 0) + 1);
  return out;
}

export type AdminUserDetail = {
  user: AdminUserRow;
  meetings: { id: string; name: string; duration: number; bookings: number; active: boolean }[];
  bookings: { id: string; guest: string; meeting: string; when: string; cancelled: boolean }[];
};

export async function getUserDetail(id: string): Promise<AdminUserDetail | null> {
  const convex = await convexServer();
  const detail = await convex.query(api.admin.userDetail, { userId: id });
  if (!detail) return null;
  return buildUserDetail(
    detail.profile as unknown as Profile,
    detail.meetings as unknown as MeetingType[],
    detail.recentBookings as unknown as Booking[],
  );
}

/** Shared by both backends so the two cannot present the same user differently. */
function buildUserDetail(profile: Profile, meetings: MeetingType[], bookings: Booking[]): AdminUserDetail {
  const perMeeting = tally(bookings.map((b) => b.meeting_type_id ?? "-"));
  const now = new Date();

  return {
    user: {
      id: profile.id,
      name: profile.full_name || profile.username,
      email: profile.email,
      username: profile.username,
      timezone: timezoneLabel(profile.timezone),
      meetings: meetings.length,
      bookings: bookings.length,
      joined: formatShortDate(new Date(profile.created_at), "UTC"),
      suspended: profile.is_suspended,
    },
    meetings: meetings.map((m) => ({
      id: m.id,
      name: m.name,
      duration: m.duration_minutes,
      bookings: perMeeting.get(m.id) ?? 0,
      active: m.is_active,
    })),
    bookings: bookings.map((b) => ({
      id: b.id,
      guest: b.guest_name,
      meeting: b.meeting_name,
      when: `${formatDayLabel(new Date(b.starts_at), profile.timezone, now)} · ${formatTimeRange(
        new Date(b.starts_at),
        new Date(b.ends_at),
        profile.timezone,
      )}`,
      cancelled: b.status === "cancelled",
    })),
  };
}

export type AdminBookingRow = {
  id: string;
  reference: string;
  host: string;
  hostEmail: string;
  guest: string;
  guestEmail: string;
  meeting: string;
  date: string;
  time: string;
  timezone: string;
  duration: number;
  cancelled: boolean;
  meetUrl: string | null;
  upcoming: boolean;
};

type AdminHost = Pick<Profile, "id" | "full_name" | "username" | "email" | "timezone">;

export async function listAdminBookings(query: string, filter: "all" | "upcoming" | "past") {
  const convex = await convexServer();
  const rows = await convex.query(api.admin.bookingsWithHosts, { limit: 200 });
  const bookings = rows as unknown as Booking[];
  const hosts = new Map(rows.filter((r) => r.host !== null).map((r) => [r.host!.id, r.host as AdminHost]));

  const now = Date.now();
  const q = query.trim().toLowerCase();

  return bookings
    .map((b): AdminBookingRow => {
      const host = hosts.get(b.host_id);
      const zone = host?.timezone ?? "UTC";
      const start = new Date(b.starts_at);
      return {
        id: b.id,
        reference: b.reference,
        host: host ? host.full_name || host.username : "Removed account",
        hostEmail: host?.email ?? "",
        guest: b.guest_name,
        guestEmail: b.guest_email,
        meeting: b.meeting_name,
        date: formatShortDate(start, zone),
        time: formatTimeRange(start, new Date(b.ends_at), zone),
        timezone: timezoneLabel(zone),
        duration: b.duration_minutes,
        cancelled: b.status === "cancelled",
        meetUrl: b.meet_url,
        upcoming: start.getTime() >= now,
      };
    })
    .filter((row) => {
      if (filter === "upcoming" && !row.upcoming) return false;
      if (filter === "past" && row.upcoming) return false;
      if (!q) return true;
      return `${row.host} ${row.hostEmail} ${row.guest} ${row.guestEmail}`.toLowerCase().includes(q);
    });
}

export async function getAdminBooking(id: string): Promise<AdminBookingRow | null> {
  const convex = await convexServer();
  const row = await convex.query(api.admin.bookingWithHost, { id });
  if (!row) return null;
  const booking = row as unknown as Booking;
  const host = (row.host ?? null) as AdminHost | null;

  const zone = host?.timezone ?? "UTC";
  const start = new Date(booking.starts_at);

  return {
    id: booking.id,
    reference: booking.reference,
    host: host ? host.full_name || host.username : "Removed account",
    hostEmail: host?.email ?? "",
    guest: booking.guest_name,
    guestEmail: booking.guest_email,
    meeting: booking.meeting_name,
    date: formatShortDate(start, zone),
    time: formatTimeRange(start, new Date(booking.ends_at), zone),
    timezone: timezoneLabel(zone),
    duration: booking.duration_minutes,
    cancelled: booking.status === "cancelled",
    meetUrl: booking.meet_url,
    upcoming: start.getTime() >= Date.now(),
  };
}
