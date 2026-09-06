import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { BookingsScreen } from "@/components/app/bookings-screen";
import {
  getBookings,
  partitionBookings,
  requireProfile,
} from "@/lib/data/host";
import { toRowData } from "@/lib/data/booking-rows";

export const metadata: Metadata = { title: "Bookings" };

export default async function BookingsPage() {
  const profile = await requireProfile();
  const now = new Date();

  const bookings = await getBookings();
  const { upcoming, past } = partitionBookings(bookings, now);

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
