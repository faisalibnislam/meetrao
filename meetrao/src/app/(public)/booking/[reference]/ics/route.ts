import { NextResponse } from "next/server";
import { getBookingByReference } from "@/lib/data/guest-booking";
import { SUPPORT_EMAIL } from "@/lib/contact";
import { siteUrl } from "@/lib/env";

/* The fallback for a guest who does not use Google Calendar. Google invitees
   already have the event; this is for everyone else. */

export const dynamic = "force-dynamic";

function stamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** RFC 5545 escaping, then folding at 75 octets. */
function line(name: string, value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

  const full = `${name}:${escaped}`;
  if (full.length <= 75) return full;

  const parts = [full.slice(0, 75)];
  let rest = full.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join("\r\n");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  const booking = await getBookingByReference(reference);

  if (!booking) return new NextResponse("Not found", { status: 404 });

  const start = new Date(booking.startsAt);
  const end = new Date(booking.endsAt);
  const cancelled = booking.status === "cancelled";

  const description = [
    booking.meetUrl ? `Google Meet: ${booking.meetUrl}` : null,
    booking.guestNote ? `Note: ${booking.guestNote}` : null,
    `Booked through Meetrao — ${siteUrl()}/booking/${reference}`,
  ]
    .filter(Boolean)
    .join("\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meetrao//Booking//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    line("UID", `${reference}@meetrao.com`),
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    line("SUMMARY", `${booking.meetingName} — ${booking.hostName}`),
    line("DESCRIPTION", description),
    booking.meetUrl
      ? line("LOCATION", booking.meetUrl)
      : line("LOCATION", "Google Meet"),
    // Calendar apps show this address beside the host's name. It used to be
    // noreply@, which was honest when nothing on the domain was received; now
    // that support@ is forwarded to a real inbox, an address that reaches a
    // person is the better one to put in front of a guest.
    line("ORGANIZER;CN=" + booking.hostName, `mailto:${SUPPORT_EMAIL}`),
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="meetrao-${reference.slice(0, 8)}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
