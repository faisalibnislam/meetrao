import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { BookingsScreen } from "@/components/app/bookings-screen";
import { listBookingsForScreen } from "@/lib/data/bookings";
import { activeContext } from "@/lib/data/context";
import { requireOnboardedSession } from "@/lib/data/session";
import { timezoneLabel } from "@/lib/timezones";

export const metadata: Metadata = { title: "Bookings" };

export default async function BookingsPage() {
  const { profile } = await requireOnboardedSession();
  const { bookings, elsewhere } = await listBookingsForScreen(profile.id, profile.timezone);
  const context = await activeContext();

  return (
    <AppScreen
      title="Bookings"
      subtitle="Everyone who has booked time with you, and everything you scheduled yourself."
    >
      <BookingsScreen
        bookings={bookings}
        elsewhere={elsewhere}
        here={context.name}
        timezoneLabel={timezoneLabel(profile.timezone)}
      />
    </AppScreen>
  );
}
