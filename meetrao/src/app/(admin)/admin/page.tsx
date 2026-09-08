import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { Card, SectionHeading } from "@/components/ui/panels";
import { Eyebrow } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icon";
import { adminMetrics, recentActivity } from "@/lib/data/admin";
import { cx } from "@/lib/cx";

export const metadata: Metadata = { title: "Admin" };

const ACTIVITY_ICON: Record<string, IconName> = {
  user_created: "user-plus",
  meeting_created: "plus",
  booking_created: "calendar",
  booking_cancelled: "circle-xmark",
  calendar_connected: "cloud-upload",
  user_suspended: "lock",
  user_reactivated: "check",
  user_removed: "xmark",
};

export default async function AdminDashboard() {
  const [metrics, activity] = await Promise.all([adminMetrics(), recentActivity()]);

  const cells = [
    { value: metrics.users, label: "Total users" },
    { value: metrics.bookings, label: "Total bookings" },
    { value: metrics.upcoming, label: "Upcoming" },
    { value: metrics.meetings, label: "Meetings" },
  ];

  return (
    <AppScreen title="Dashboard" subtitle="Platform overview.">
      <div className="flex flex-col gap-[22px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(148px,1fr))] overflow-hidden rounded-[8px] border border-line bg-surface">
          {cells.map((cell, i) => (
            <div
              key={cell.label}
              className={cx("flex flex-col gap-[4px] px-[15px] py-[13px]", i > 0 && "border-l border-line-soft")}
            >
              <span className="text-[20px] leading-[1.1] font-semibold tracking-[-0.015em] text-ink">
                {cell.value.toLocaleString("en-US")}
              </span>
              <Eyebrow>{cell.label}</Eyebrow>
            </div>
          ))}
        </div>

        <section className="flex flex-col gap-[9px]">
          <SectionHeading title="Recent activity" />
          <Card>
            {activity.length === 0 ? (
              <div className="px-[15px] py-[14px] text-[13px] text-ink-3">Nothing has happened yet.</div>
            ) : (
              activity.map((row, i) => (
                <div
                  key={row.id}
                  className={cx(
                    "flex flex-wrap items-center gap-[12px] px-[15px] py-[11px]",
                    i > 0 && "border-t border-line-soft",
                  )}
                >
                  <Icon
                    name={ACTIVITY_ICON[row.kind] ?? "circle-info"}
                    size={13}
                    className="w-[16px] flex-none text-ink-3"
                  />
                  <span className="min-w-[160px] flex-1 text-[13.5px] text-ink">{row.summary}</span>
                  <span className="flex-none text-[12px] text-ink-3">{row.when}</span>
                </div>
              ))
            )}
          </Card>
        </section>
      </div>
    </AppScreen>
  );
}
