import { NextResponse } from "next/server";
import { getBookingByReference } from "@/lib/data/guest-booking";
import { whereText } from "@/lib/locations";
import { SUPPORT_EMAIL } from "@/lib/contact";
import { siteUrl } from "@/lib/env";
import { buildInvite } from "@/lib/calendar/invite";

/* The download behind "Add to calendar" for anyone whose mail client did not
   pick up the invitation attached to the confirmation email. Same UID and
   SEQUENCE as that invitation, so importing both leaves one meeting. */

export const dynamic = "force-dynamic";

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

  const where = booking.meetUrl || whereText(booking.location, booking.locationDetail, null);
  const description = [
    booking.meetUrl ? `Join: ${booking.meetUrl}` : null,
    booking.guestNote ? `Note: ${booking.guestNote}` : null,
    `Booked through Meetrao, ${siteUrl()}/booking/${reference}`,
  ]
    .filter(Boolean)
    .join("\n");

  const ics = buildInvite({
    method: cancelled ? "CANCEL" : "PUBLISH",
    reference,
    // A cancellation goes one higher inside buildInvite.
    sequence: booking.revision,
    start,
    end,
    summary: `${booking.meetingName}: ${booking.hostName}`,
    description,
    location: where,
    url: `${siteUrl()}/booking/${reference}`,
    // Calendar apps show this beside the host's name; support@ reaches a person.
    organizer: { name: booking.hostName, email: SUPPORT_EMAIL },
    attendees: [],
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="meetrao-${reference.slice(0, 8)}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
