import "server-only";

import { formatDayLabel, formatTimeRange, isSameDay } from "@/lib/booking/time";
import { supabaseServer } from "@/lib/supabase/server";
import type { Booking } from "@/lib/types";

/* Bookings, shaped for the screens. Labels are formatted here, in the host's
   own timezone, so the client components stay presentational and no screen has
   to remember which zone it is in. */

export type BookingView = {
  id: string;
  reference: string;
  guest: string;
  email: string;
  meetingName: string;
  duration: number;
  startsAt: string;
  dayLabel: string;
  timeRange: string;
  status: "Confirmed" | "Cancelled";
  cancelled: boolean;
  past: boolean;
  today: boolean;
  joinable: boolean;
  meetUrl: string | null;
  note: string;
  /** Everyone invited, when the host scheduled this. Empty for guest bookings. */
  invitees: { name: string; email: string }[];
  hostCreated: boolean;
};

export function toView(row: Booking, timeZone: string, now: Date): BookingView {
  const start = new Date(row.starts_at);
  const end = new Date(row.ends_at);
  const cancelled = row.status === "cancelled";
  const past = end.getTime() < now.getTime();

  return {
    id: row.id,
    reference: row.reference,
    guest: row.guest_name,
    email: row.guest_email,
    meetingName: row.meeting_name,
    duration: row.duration_minutes,
    startsAt: row.starts_at,
    dayLabel: formatDayLabel(start, timeZone, now),
    timeRange: formatTimeRange(start, end, timeZone),
    status: cancelled ? "Cancelled" : "Confirmed",
    cancelled,
    past,
    today: isSameDay(start, now, timeZone),
    joinable: !cancelled && !past,
    meetUrl: row.meet_url,
    note: row.guest_note,
    invitees: [],
    hostCreated: Boolean((row as { host_created?: boolean }).host_created),
  };
}

export async function listBookings(hostId: string, timeZone: string): Promise<BookingView[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("host_id", hostId)
    .order("starts_at", { ascending: true });

  const now = new Date();
  const rows = (data ?? []) as Booking[];
  const views = rows.map((row) => toView(row, timeZone, now));

  // One query for every invitee rather than one per booking. Only bookings the
  // host scheduled have any, so this is usually a very short list.
  const hostCreated = rows.filter((r) => (r as { host_created?: boolean }).host_created).map((r) => r.id);
  if (hostCreated.length) {
    const { data: invitees } = await supabase
      .from("booking_invitees")
      .select("booking_id, name, email")
      .in("booking_id", hostCreated);

    for (const row of (invitees ?? []) as { booking_id: string; name: string; email: string }[]) {
      const view = views.find((v) => v.id === row.booking_id);
      if (view) view.invitees.push({ name: row.name, email: row.email });
    }
  }

  return views;
}

export async function getBooking(hostId: string, bookingId: string, timeZone: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("host_id", hostId)
    .eq("id", bookingId)
    .maybeSingle();

  return data ? toView(data as Booking, timeZone, new Date()) : null;
}
