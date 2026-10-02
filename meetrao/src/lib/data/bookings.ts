import "server-only";

import { formatDayLabel, formatTimeRange, isSameDay } from "@/lib/booking/time";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
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
  /** "Thu 10 Sep", the heading above a day's rows. */
  dayHeading: string;
  timeRange: string;
  status: "Confirmed" | "Cancelled";
  cancelled: boolean;
  past: boolean;
  today: boolean;
  joinable: boolean;
  meetUrl: string | null;
  note: string;
  /** What the guest answered, each carrying the label it was asked under. */
  answers: { label: string; value: string }[];
  /** Where it happens, as it was when the booking was made. */
  location: string;
  locationDetail: string;
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
    answers: row.answers ?? [],
    location: row.location ?? "google_meet",
    locationDetail: row.location_detail ?? "",
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
 * The Past tab reads backwards from now, so a cap is the natural shape. This
 * is the most recent 250, not an arbitrary slice. A host who needs more than
 * their last 250 bookings needs an export, not a longer page.
 */
const PAST_LIMIT = 250;

/**
 * Bookings for the host's screens.
 *
 * `history: false` fetches only what is still to come. That is all the
 * dashboard has ever displayed, and it means the dashboard no longer pays for
 * a history it throws away.
 */
export async function listBookings(
  hostId: string,
  timeZone: string,
  { history = true }: { history?: boolean } = {},
): Promise<BookingView[]> {
  const now = new Date();

  const convex = await convexServer();
  const { rows, invitees } = await convex.query(api.bookings.listForScreen, { history, pastLimit: PAST_LIMIT });
  const views = (rows as unknown as Booking[]).map((row) => toView(row, timeZone, now));
  for (const view of views) {
    for (const i of invitees[view.id] ?? []) view.invitees.push({ name: i.name, email: i.email });
  }
  return views;
}

export async function getBooking(hostId: string, bookingId: string, timeZone: string) {
  void hostId; // the query is scoped by the caller's own identity
  const convex = await convexServer();
  const row = await convex.query(api.bookings.getForHost, { id: bookingId });
  return row ? toView(row as unknown as Booking, timeZone, new Date()) : null;
}
