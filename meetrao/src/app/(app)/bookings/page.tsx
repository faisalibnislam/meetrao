import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { BookingsScreen } from "@/components/app/bookings-screen";
import { listBookings } from "@/lib/data/bookings";
import { requireOnboardedSession } from "@/lib/data/session";

export const metadata: Metadata = { title: "Bookings" };

export default async function BookingsPage() {
  const { profile } = await requireOnboardedSession();
  const bookings = await listBookings(profile.id, profile.timezone);

  return (
    <AppScreen
      title="Bookings"
      subtitle="Everyone who has booked time with you — and everything you scheduled yourself."
    >
      <BookingsScreen bookings={bookings} />
    </AppScreen>
  );
}
