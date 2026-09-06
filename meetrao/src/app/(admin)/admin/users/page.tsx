import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { AdminUsersTable } from "@/components/admin/admin-tables";
import { loadAdminData } from "@/lib/data/admin";
import { timezoneLabel } from "@/lib/timezones";
import { formatMediumDate } from "@/lib/booking/time";

export const metadata: Metadata = { title: "Admin · Users" };

export default async function AdminUsersPage() {
  const { users } = await loadAdminData();

  return (
    <>
      <PageHeader title="Users" />
      <PageBody>
        <AdminUsersTable
          users={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            username: u.username,
            timezoneLabel: timezoneLabel(u.timezone),
            meetingCount: u.meetingCount,
            bookingCount: u.bookingCount,
            joinedLabel: formatMediumDate(new Date(u.joined), "UTC"),
            suspended: u.suspended,
          }))}
        />
      </PageBody>
    </>
  );
}
