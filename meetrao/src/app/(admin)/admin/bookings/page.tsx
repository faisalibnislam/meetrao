import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { AdminBookingsTable } from "@/components/admin/admin-tables";
import { loadAdminData } from "@/lib/data/admin";
import { formatMediumDate, formatTimeRange } from "@/lib/booking/time";

export const metadata: Metadata = { title: "Admin · Bookings" };

export default async function AdminBookingsPage() {
  const { bookings } = await loadAdminData();

  return (
    <>
      <PageHeader title="Bookings" />
      <PageBody>
        <AdminBookingsTable
          bookings={bookings.map((b) => ({
            id: b.id,
            hostName: b.hostName,
            hostEmail: b.hostEmail,
            guestName: b.guestName,
            guestEmail: b.guestEmail,
            meetingName: b.meetingName,
            // Admin views are platform-wide, so times are shown in UTC rather
            // than any one host's zone.
            dateLabel: formatMediumDate(new Date(b.startsAt), "UTC"),
            timeLabel: formatTimeRange(
              new Date(b.startsAt),
              new Date(b.endsAt),
              "UTC",
            ),
            status: b.status,
            upcoming: b.upcoming,
          }))}
        />
      </PageBody>
    </>
  );
}
