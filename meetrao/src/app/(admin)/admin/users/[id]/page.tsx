import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppScreen } from "@/components/app/app-screen";
import { RemoveAccountPanel, SuspendButton } from "@/components/admin/user-actions";
import { Avatar, Badge, Eyebrow } from "@/components/ui/badge";
import { Card, SectionHeading } from "@/components/ui/panels";
import { getUserDetail } from "@/lib/data/admin";
import { bookingLink } from "@/lib/username";
import { cx } from "@/lib/cx";

export const metadata: Metadata = { title: "User" };

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const { user, meetings, bookings } = detail;

  const fields = [
    { label: "Username", value: bookingLink(user.username) },
    { label: "Timezone", value: user.timezone },
    { label: "Joined", value: user.joined },
    { label: "Meetings", value: String(user.meetings) },
    { label: "Bookings", value: String(user.bookings) },
    { label: "Status", value: user.suspended ? "Suspended" : "Active" },
  ];

  return (
    <AppScreen title={user.name} crumb={{ label: "Users", href: "/admin/users" }} crumbCurrent={user.name}>
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-[20px]">
        <div className="flex flex-wrap items-center gap-[13px] border-b border-line pb-[18px]">
          <Avatar name={user.name} size={42} />
          <div className="flex min-w-[150px] flex-1 flex-col gap-[2px]">
            <span className="text-[15px] font-semibold text-ink">{user.name}</span>
            <span className="text-[12.5px] text-ink-3">{user.email}</span>
          </div>
          <Badge tone={user.suspended ? "bad" : "ok"}>{user.suspended ? "Suspended" : "Active"}</Badge>
          <SuspendButton userId={user.id} name={user.name} suspended={user.suspended} />
        </div>

        <RemoveAccountPanel userId={user.id} name={user.name} />

        <section className="flex flex-col gap-[11px]">
          <SectionHeading title="Profile" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[1px] overflow-hidden rounded-[8px] border border-line bg-line-soft">
            {fields.map((field) => (
              <div key={field.label} className="flex flex-col gap-[3px] bg-surface px-[14px] py-[11px]">
                <Eyebrow>{field.label}</Eyebrow>
                <span className="text-[13px] text-ink">{field.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-[11px]">
          <SectionHeading
            title="Meetings"
            meta={`${meetings.filter((m) => m.active).length} active · ${user.bookings} bookings all-time`}
          />
          <Card>
            {meetings.length === 0 ? (
              <div className="px-[15px] py-[14px] text-[13px] text-ink-3">No meetings yet.</div>
            ) : (
              meetings.map((meeting, i) => (
                <div
                  key={meeting.id}
                  className={cx(
                    "flex flex-wrap items-center gap-[12px] px-[15px] py-[11px]",
                    i > 0 && "border-t border-line-soft",
                  )}
                >
                  <span className="min-w-[150px] flex-1 text-[13.5px] font-semibold text-ink">
                    {meeting.name}
                  </span>
                  <span className="flex-none text-[12.5px] text-ink-2">{meeting.duration} min</span>
                  <span className="flex-none text-[12.5px] text-ink-3">{meeting.bookings} bookings</span>
                  <Badge tone={meeting.active ? "ok" : "off"}>{meeting.active ? "Active" : "Disabled"}</Badge>
                </div>
              ))
            )}
          </Card>
        </section>

        <section className="flex flex-col gap-[11px]">
          <SectionHeading title="Recent bookings" />
          <Card>
            {bookings.length === 0 ? (
              <div className="px-[15px] py-[14px] text-[13px] text-ink-3">No bookings yet.</div>
            ) : (
              bookings.map((booking, i) => (
                <div
                  key={booking.id}
                  className={cx(
                    "flex flex-wrap items-center gap-[12px] px-[15px] py-[11px]",
                    i > 0 && "border-t border-line-soft",
                  )}
                >
                  <span className="min-w-[130px] flex-1 text-[13.5px] text-ink">{booking.guest}</span>
                  <span className="flex-none text-[12.5px] text-ink-2">{booking.meeting}</span>
                  <span className="flex-none text-[12.5px] text-ink-3">{booking.when}</span>
                  <Badge tone={booking.cancelled ? "bad" : "ok"}>
                    {booking.cancelled ? "Cancelled" : "Confirmed"}
                  </Badge>
                </div>
              ))
            )}
          </Card>
        </section>
      </div>
    </AppScreen>
  );
}
