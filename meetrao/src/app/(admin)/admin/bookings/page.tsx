import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { AdminBookingsTable } from "@/components/admin/admin-tables";
import { listAdminBookings } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Bookings" };

export default async function AdminBookingsPage() {
  const bookings = await listAdminBookings("", "all");
  return (
    <AppScreen title="Bookings">
      <AdminBookingsTable bookings={bookings} />
    </AppScreen>
  );
}
