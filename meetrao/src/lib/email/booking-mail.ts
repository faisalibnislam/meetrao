import { formatDuration, formatLongDate, formatTime, formatTimeRange } from "@/lib/booking/time";
import { timezoneLabel } from "@/lib/timezones";
import type { CancellationMail } from "./send";
import type { Booking } from "@/lib/types";

/* Turning a booking row into the values its emails need. Kept out of the
   server-action file, where every export has to be an async action. */

export function cancellationMail(
  booking: Booking,
  host: { full_name: string; username: string; email: string; timezone: string },
  by: "host" | "guest",
): CancellationMail {
  const hostName = host.full_name || host.username;
  const hostTimezone = host.timezone;
  const start = new Date(booking.starts_at);
  const end = new Date(booking.ends_at);
  const guestZone = booking.guest_timezone ?? hostTimezone;

  return {
    bookingId: booking.id,
    reference: booking.reference,
    meetingName: booking.meeting_name,
    guestName: booking.guest_name,
    guestEmail: booking.guest_email,
    guestNote: booking.guest_note,
    hostName,
    hostEmail: host.email,
    startLong: `${formatLongDate(start, hostTimezone)} · ${formatTimeRange(start, end, hostTimezone)}`,
    startShort: `${formatLongDate(start, hostTimezone)} at ${formatTime(start, hostTimezone)}`,
    hostTimezoneLabel: timezoneLabel(hostTimezone),
    guestTimezoneLabel: timezoneLabel(guestZone),
    durationLabel: formatDuration(booking.duration_minutes),
    meetUrl: booking.meet_url ?? "",
    cancelledByName: by === "host" ? hostName : booking.guest_name,
    cancelledAtLong: `${formatLongDate(new Date(), hostTimezone)} · ${formatTime(new Date(), hostTimezone)}`,
    reason: "",
  };
}
