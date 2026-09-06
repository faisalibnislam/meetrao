import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { CopyLinkChip } from "@/components/app/copy-link";
import { Badge } from "@/components/ui/controls";
import { loadAdminData } from "@/lib/data/admin";
import { formatMediumDate, formatTimeRange } from "@/lib/booking/time";

export const metadata: Metadata = { title: "Admin · Booking detail" };

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { bookings } = await loadAdminData();
  const booking = bookings.find((b) => b.id === id);
  if (!booking) notFound();

  const groups: Array<{ label: string; rows: Array<{ k: string; v: string; mono?: boolean }> }> = [
    {
      label: "Host",
      rows: [
        { k: "Name", v: booking.hostName },
        { k: "Email", v: booking.hostEmail, mono: true },
      ],
    },
    {
      label: "Guest",
      rows: [
        { k: "Name", v: booking.guestName },
        { k: "Email", v: booking.guestEmail, mono: true },
      ],
    },
    {
      label: "Schedule",
      rows: [
        { k: "Date", v: formatMediumDate(new Date(booking.startsAt), "UTC") },
        {
          k: "Time",
          v: formatTimeRange(
            new Date(booking.startsAt),
            new Date(booking.endsAt),
            "UTC",
          ),
        },
        { k: "Timezone", v: "UTC" },
        { k: "Duration", v: `${booking.durationMinutes} minutes` },
      ],
    },
    {
      label: "Google Meet",
      rows: [
        { k: "Link", v: booking.meetUrl ?? "No link on this booking", mono: Boolean(booking.meetUrl) },
      ],
    },
  ];

  return (
    <>
      <PageHeader
        title="Booking detail"
        crumb={{
          href: "/admin/bookings",
          label: "Bookings",
          current: booking.meetingName,
        }}
      />
      <PageBody>
        <div className="mx-auto flex w-full max-w-[620px] flex-col gap-[18px]">
          <div className="flex flex-wrap items-center gap-[12px] border-b border-line pb-[16px]">
            <span className="text-[15px] font-semibold text-ink">
              {booking.meetingName}
            </span>
            <Badge tone={booking.status === "cancelled" ? "bad" : "ok"}>
              {booking.status === "cancelled" ? "Cancelled" : "Confirmed"}
            </Badge>
            <span className="ml-auto font-mono text-[11.5px] text-ink-3">
              {booking.reference.slice(0, 8).toUpperCase()}
            </span>
          </div>

          {groups.map((group) => (
            <section key={group.label} className="flex flex-col gap-[9px]">
              <span className="font-mono text-[10px] tracking-[0.07em] uppercase text-ink-3">
                {group.label}
              </span>
              <div className="flex flex-col gap-[7px]">
                {group.rows.map((row) => (
                  <div key={row.k} className="flex flex-wrap gap-[12px]">
                    <span className="w-[92px] flex-none text-[12.5px] text-ink-3">
                      {row.k}
                    </span>
                    <span
                      className={`min-w-[150px] flex-1 text-ink ${
                        row.mono
                          ? "font-mono text-[12.5px] break-all"
                          : "text-[13px]"
                      }`}
                    >
                      {row.v}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {booking.meetUrl ? (
            <div>
              <CopyLinkChip link={booking.meetUrl} />
            </div>
          ) : null}
        </div>
      </PageBody>
    </>
  );
}
