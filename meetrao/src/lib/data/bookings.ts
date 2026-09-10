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
  /** Host-local calendar day, for grouping. */
  dateKey: string;
  /** "Thu 10 Sep" — the heading above a day's rows. */
  dayHeading: string;
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
    dateKey: new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(start),
    dayHeading: new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(start),
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

/**
 * How far back the Bookings screen's history reaches.
 *
 * This read used to be `select *` with no bound at all: every booking the host
 * had ever taken, fetched on the Bookings screen AND on the dashboard, which
 * then discarded all of it except the next few. Fine at six bookings; a page
 * that gets slower every month, forever, by construction.
 *
 * The Past tab reads backwards from now, so a cap is the natural shape — this
 * is the most recent 250, not an arbitrary slice. A host who needs more than
 * their last 250 bookings needs an export, not a longer page.
 */
const PAST_LIMIT = 250;

/**
 * Bookings for the host's screens.
 *
 * `history: false` fetches only what is still to come — that is all the
 * dashboard has ever displayed, and it means the dashboard no longer pays for
 * a history it throws away.
 */
export async function listBookings(
  hostId: string,
  timeZone: string,
  { history = true }: { history?: boolean } = {},
): Promise<BookingView[]> {
  const supabase = await supabaseServer();
  const now = new Date();

  // A booking is "past" once it has *ended*, so the boundary is ends_at.
  const boundary = now.toISOString();

  // Two bounded reads in parallel rather than one unbounded one. Upcoming is
  // naturally small — it is a calendar, not an archive — so only the history
  // needs a cap, taken newest-first and then flipped back into the ascending
  // order every caller expects.
  const [upcoming, past] = await Promise.all([
    supabase
      .from("bookings")
      .select("*")
      .eq("host_id", hostId)
      .gte("ends_at", boundary)
      .order("starts_at", { ascending: true }),
    history
      ? supabase
          .from("bookings")
          .select("*")
          .eq("host_id", hostId)
          .lt("ends_at", boundary)
          .order("starts_at", { ascending: false })
          .limit(PAST_LIMIT)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const rows = [
    ...(((past.data ?? []) as Booking[]).slice().reverse()),
    ...((upcoming.data ?? []) as Booking[]),
  ];
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
