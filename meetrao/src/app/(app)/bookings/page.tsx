import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { BookingsScreen } from "@/components/app/bookings-screen";
import {
  getBookings,
  partitionBookings,
  requireProfile,
} from "@/lib/data/host";
import { toRowData } from "@/lib/data/booking-rows";
import { syncGuestRsvp } from "@/lib/booking/rsvp";

export const metadata: Metadata = { title: "Bookings" };

export default async function BookingsPage() {
  const profile = await requireProfile();
  const now = new Date();

  const bookings = await getBookings();
  const { upcoming, past } = partitionBookings(bookings, now);

  // Google reports RSVPs onto the host's event and there is no push
  // subscription, so this is the pull: the bookings list is where a host looks,
  // and syncGuestRsvp throttles itself to five minutes per booking. Capped so a
  // busy week cannot turn one page load into fifty Google calls, and settled so
  // one failure cannot blank the page.
  const sweep = upcoming.filter((b) => b.google_event_id).slice(0, 15);
  if (sweep.length > 0) {
    await Promise.allSettled(sweep.map((b) => syncGuestRsvp(b.id)));
  }

  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle="Everyone who has booked time with you."
      />
      <PageBody>
        <BookingsScreen
          upcoming={upcoming.map((b) => toRowData(b, profile.timezone, now))}
          past={past.map((b) => toRowData(b, profile.timezone, now))}
        />
      </PageBody>
    </>
  );
}
