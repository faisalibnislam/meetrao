import { NextResponse } from "next/server";
import { getBookingByReference } from "@/lib/booking/service";

/** RFC 5545 requires CRLF line endings and escaping of `,` `;` and `\` in TEXT. */
function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  const booking = await getBookingByReference(reference);
  if (!booking) return new NextResponse("Not found", { status: 404 });

  const cancelled = booking.status === "cancelled";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meetrao//Booking//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${booking.reference}@meetrao`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(booking.startsAt)}`,
    `DTEND:${stamp(booking.endsAt)}`,
    `SUMMARY:${escapeText(`${booking.meetingName} with ${booking.hostName}`)}`,
    `DESCRIPTION:${escapeText(
      booking.meetUrl
        ? `Google Meet: ${booking.meetUrl}`
        : "Booked through Meetrao.",
    )}`,
    `LOCATION:${escapeText(booking.meetUrl ?? "Google Meet")}`,
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new NextResponse(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="meetrao-${booking.reference.slice(0, 8)}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
