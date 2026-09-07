import type { Booking } from "./host";
import type { BookingRowData } from "@/components/app/booking-rows";
import {
  formatDayLabel,
  formatMediumDate,
  formatTimeRange,
} from "@/lib/booking/time";

/**
 * Formats a booking for the client, in the HOST's timezone. Done here rather
 * than in the browser so the server and client agree — otherwise the viewer's
 * own zone would leak into the host's schedule and break hydration.
 */
export function toRowData(
  booking: Booking,
  hostTimezone: string,
  now: Date,
): BookingRowData {
  const startsAt = new Date(booking.starts_at);
  const endsAt = new Date(booking.ends_at);

  return {
    id: booking.id,
    guest: booking.guest_name,
    email: booking.guest_email,
    meetingName: booking.meeting_name,
    durationMinutes: booking.duration_minutes,
    note: booking.guest_note,
    status: booking.status,
    meetUrl: booking.meet_url,
    rsvp: (booking.guest_rsvp as BookingRowData["rsvp"]) ?? null,
    dayLabel: formatDayLabel(startsAt, hostTimezone, now),
    dateLabel: formatMediumDate(startsAt, hostTimezone),
    timeRange: formatTimeRange(startsAt, endsAt, hostTimezone),
    past: endsAt < now,
  };
}
