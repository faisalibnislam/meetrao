import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Confirmed } from "@/components/booking/confirmed";
import { getBookingByReference, describeBooking } from "@/lib/booking/service";

export const metadata: Metadata = {
  title: "You're booked",
  robots: { index: false, follow: false },
};

/** The Google "add to calendar" template URL. */
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
        icsUrl: `/booking/${booking.reference}/ics`,
      }}
    />
  );
}
