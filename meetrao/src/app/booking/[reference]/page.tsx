import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Confirmed } from "@/components/booking/confirmed";
import { getBookingByReference, describeBooking } from "@/lib/booking/service";

export const metadata: Metadata = {
  title: "You're booked",
  robots: { index: false, follow: false },
};

/** The Google "add to calendar" template URL. */
function googleCalendarUrl(params: {
  title: string;
  start: Date;
  end: Date;
  details: string;
  location: string;
}) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${stamp(params.start)}/${stamp(params.end)}`,
    details: params.details,
    location: params.location,
  });
  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

export default async function BookingConfirmedPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const booking = await getBookingByReference(reference);
  if (!booking) notFound();

  if (booking.status === "cancelled") {
    redirect(`/booking/${reference}/cancelled`);
  }

  return (
    <Confirmed
      booking={{
        reference: booking.reference,
        meetingName: booking.meetingName,
        hostName: booking.hostName,
        guestEmail: booking.guestEmail,
        durationMinutes: booking.durationMinutes,
        startsAtIso: booking.startsAt.toISOString(),
        endsAtIso: booking.endsAt.toISOString(),
        meetUrl: booking.meetUrl,
        initialWhen: describeBooking(
          booking.startsAt,
          booking.endsAt,
          booking.hostTimezone,
        ),
        googleCalendarUrl: googleCalendarUrl({
          title: `${booking.meetingName} with ${booking.hostName}`,
          start: booking.startsAt,
          end: booking.endsAt,
          details: booking.meetUrl
            ? `Google Meet: ${booking.meetUrl}`
            : "Booked through Meetrao.",
          location: booking.meetUrl ?? "Google Meet",
        }),
        icsUrl: `/booking/${booking.reference}/ics`,
      }}
    />
  );
}
