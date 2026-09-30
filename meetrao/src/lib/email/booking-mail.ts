import { formatDuration, formatLongDate, formatTime, formatTimeRange } from "@/lib/booking/time";
import { timezoneLabel } from "@/lib/timezones";
import { whereText } from "@/lib/locations";
import type { BookingMail, CancellationMail } from "./send";
import type { Booking } from "@/lib/types";

/* Turning a booking row into the values its emails need. Kept out of the
   server-action file, where every export has to be an async action.

   Both take the fields they actually read rather than a whole `Booking`, so a
   caller holding a freshly moved row — which comes back from Convex as a few
   columns, not as the full record — can pass it without inventing the rest. */

export type MailableBooking = Pick<
  Booking,
  | "id"
  | "reference"
  | "meeting_name"
  | "duration_minutes"
  | "guest_name"
  | "guest_email"
  | "guest_note"
  | "guest_timezone"
  | "starts_at"
  | "ends_at"
  | "meet_url"
  | "location"
  | "location_detail"
>;

/**
 * The same values, for a booking that moved rather than ended.
 *
 * `booking` is the row AFTER the move, so every "when" field already reads as
 * the new time; the old one arrives separately because it no longer exists
 * anywhere on the row.
 *
 * Each recipient reads the time in their own zone in the body of the mail, so
 * the old and new times here are both rendered in the HOST's zone — mixing
 * zones between "was" and "now" is how a reader concludes the meeting moved by
 * five and a half hours when it moved by one.
 */
export function rescheduleMail(
  booking: MailableBooking,
  host: { full_name: string; username: string; email: string; timezone: string },
  by: "host" | "guest",
  oldStartsAt: string | Date,
): BookingMail & { oldStartLong: string; changedByName: string } {
  const base = cancellationMail(booking, host, by);
  const hostTimezone = host.timezone;
  const oldStart = new Date(oldStartsAt);
  const oldEnd = new Date(oldStart.getTime() + booking.duration_minutes * 60_000);

  return {
    bookingId: base.bookingId,
    reference: base.reference,
    meetingName: base.meetingName,
    guestName: base.guestName,
    guestEmail: base.guestEmail,
    guestNote: base.guestNote,
    hostName: base.hostName,
    hostEmail: base.hostEmail,
    startLong: base.startLong,
    startShort: base.startShort,
    hostTimezoneLabel: base.hostTimezoneLabel,
    guestTimezoneLabel: base.guestTimezoneLabel,
    durationLabel: base.durationLabel,
    meetUrl: base.meetUrl,
    where: base.where,
    oldStartLong: `${formatLongDate(oldStart, hostTimezone)} · ${formatTimeRange(oldStart, oldEnd, hostTimezone)}`,
    changedByName: by === "host" ? base.hostName : booking.guest_name,
  };
}

/**
 * The note and the answers as one string, for the "Note from …" block.
 *
 * The templates substitute escaped TEXT, not markup, so answers cannot be a
 * table without teaching the renderer to trust pre-built HTML — which is the
 * one thing it refuses to do. A labelled run of lines is the honest fit, and
 * it is what a host reads on their phone anyway.
 */
export function noteWithAnswers(note: string, answers: { label: string; value: string }[]): string {
  const lines = answers.filter((a) => a.value.trim()).map((a) => `${a.label}: ${a.value.trim()}`);
  const parts = [note.trim(), ...lines].filter(Boolean);
  return parts.join(" · ");
}

export function cancellationMail(
  booking: MailableBooking,
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
    where: whereText(booking.location ?? "google_meet", booking.location_detail ?? "", booking.meet_url),
    cancelledByName: by === "host" ? hostName : booking.guest_name,
    cancelledAtLong: `${formatLongDate(new Date(), hostTimezone)} · ${formatTime(new Date(), hostTimezone)}`,
    reason: "",
  };
}
