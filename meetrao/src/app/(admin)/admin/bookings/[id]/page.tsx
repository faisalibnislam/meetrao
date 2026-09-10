import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppScreen } from "@/components/app/app-screen";
import { CopyMeetLink } from "@/components/admin/copy-meet-link";
import { Badge, Eyebrow } from "@/components/ui/badge";
import { getAdminBooking } from "@/lib/data/admin";
import { cx } from "@/lib/cx";

export const metadata: Metadata = { title: "Booking detail" };

export default async function AdminBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await getAdminBooking(id);
  if (!booking) notFound();

  const groups: { label: string; rows: { key: string; value: string; machine?: boolean }[] }[] = [
    {
      label: "Host",
      rows: [
        { key: "Name", value: booking.host },
        { key: "Email", value: booking.hostEmail, machine: true },
      ],
    },
    {
      label: "Guest",
      rows: [
        { key: "Name", value: booking.guest },
        { key: "Email", value: booking.guestEmail, machine: true },
      ],
    },
    {
      label: "Schedule",
      rows: [
        { key: "Date", value: booking.date },
        { key: "Time", value: booking.time },
        { key: "Timezone", value: booking.timezone },
        { key: "Duration", value: `${booking.duration} minutes` },
      ],
    },
    {
      label: "Google Meet",
      rows: [
        {
          key: "Link",
          value: booking.meetUrl ? booking.meetUrl.replace(/^https?:\/\//, "") : "No calendar event",
          machine: Boolean(booking.meetUrl),
        },
      ],
    },
  ];

  return (
    <AppScreen
      title="Booking detail"
      crumb={{ label: "Bookings", href: "/admin/bookings" }}
      crumbCurrent={booking.meeting}
    >
      <div className="mx-auto flex w-full max-w-[620px] flex-col gap-[18px]">
        <div className="flex flex-wrap items-center gap-[12px] border-b border-line pb-[16px]">
          <span className="text-[15px] font-semibold text-ink">{booking.meeting}</span>
          <Badge tone={booking.cancelled ? "bad" : "ok"}>{booking.cancelled ? "Cancelled" : "Confirmed"}</Badge>
          <span className="ml-auto text-[11.5px] text-ink-3">
            {booking.reference.slice(0, 12).toUpperCase()}
          </span>
        </div>

        {groups.map((group) => (
          <section key={group.label} className="flex flex-col gap-[9px]">
            <Eyebrow>{group.label}</Eyebrow>
            <div className="flex flex-col gap-[7px]">
              {group.rows.map((row) => (
                <div key={row.key} className="flex flex-wrap gap-[12px]">
                  <span className="w-[92px] flex-none text-[12.5px] text-ink-3">{row.key}</span>
                  <span
                    className={cx(
                      "min-w-[150px] flex-1 break-all text-ink",
                      row.machine ? "text-[12.5px]" : "text-[13px]",
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}

        {booking.meetUrl ? <CopyMeetLink url={booking.meetUrl} /> : null}
      </div>
    </AppScreen>
  );
}
