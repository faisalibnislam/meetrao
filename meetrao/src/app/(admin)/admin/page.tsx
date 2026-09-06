import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { Icon, type IconName } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/controls";
import { loadAdminData } from "@/lib/data/admin";
import { formatRelative } from "@/lib/booking/time";

export const metadata: Metadata = { title: "Admin · Dashboard" };

const ACTIVITY_GLYPH: Record<string, IconName> = {
  user_created: "userPlus",
  meeting_created: "plus",
  booking_created: "calendar",
  booking_cancelled: "circleXmark",
  calendar_connected: "cloudArrowUp",
};

export default async function AdminDashboardPage() {
  const { metrics, activity } = await loadAdminData();
  const now = new Date();

  const cells = [
    { label: "Total users", value: metrics.totalUsers },
    { label: "Total bookings", value: metrics.totalBookings },
    { label: "Upcoming", value: metrics.upcoming },
    { label: "Meetings", value: metrics.meetings },
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Platform overview." />
      <PageBody>
        <div className="flex flex-col gap-[22px]">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(148px,1fr))] overflow-hidden rounded-[8px] border border-line bg-surface">
            {cells.map((cell) => (
              <div
                key={cell.label}
                className="flex flex-col gap-[4px] border-l border-line-soft px-[15px] py-[13px]"
              >
                <span className="text-[20px] leading-[1.1] font-semibold tracking-[-0.015em] text-ink">
                  {cell.value.toLocaleString("en-US")}
                </span>
                <span className="font-mono text-[10px] tracking-[0.07em] uppercase text-ink-3">
                  {cell.label}
                </span>
              </div>
            ))}
          </div>

          <section className="flex flex-col gap-[9px]">
            <h2 className="m-0 text-[14.5px] font-semibold text-ink">
              Recent activity
            </h2>
            {activity.length > 0 ? (
              <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
                {activity.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`flex flex-wrap items-center gap-[12px] px-[15px] py-[11px] ${
                      i > 0 ? "border-t border-line-soft" : ""
                    }`}
                  >
                    <Icon
                      name={ACTIVITY_GLYPH[entry.kind] ?? "circleInfo"}
                      size={13}
                      className="w-[16px] text-center text-ink-3"
                    />
                    <span className="min-w-[160px] flex-1 text-[13.5px] text-ink">
                      {entry.summary}
                    </span>
                    <span className="flex-none text-[12px] text-ink-3">
                      {formatRelative(new Date(entry.created_at), now)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nothing has happened yet"
                body="Sign-ups, bookings and calendar connections will appear here."
              />
            )}
          </section>
        </div>
      </PageBody>
    </>
  );
}
