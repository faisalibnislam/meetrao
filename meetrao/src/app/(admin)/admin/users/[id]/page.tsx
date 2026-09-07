import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { SuspendUserButton } from "@/components/admin/suspend-user";
import { RemoveUserPanel } from "@/components/admin/remove-user";
import { Avatar, Badge, EmptyState } from "@/components/ui/controls";
import { loadAdminData } from "@/lib/data/admin";
import { initialsOf } from "@/lib/initials";
import { timezoneLabel } from "@/lib/timezones";
import { formatMediumDate, formatTimeRange } from "@/lib/booking/time";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Admin · User detail" };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { users, bookings, types } = await loadAdminData();

  const user = users.find((u) => u.id === id);
  if (!user) notFound();

  const userTypes = types.filter((t) => t.user_id === id);
  const userBookings = bookings.filter((b) => b.hostEmail === user.email).slice(0, 5);

  const bookingsPerType = new Map<string, number>();
  for (const b of bookings) {
    if (b.hostEmail !== user.email) continue;
    bookingsPerType.set(
      b.meetingName,
      (bookingsPerType.get(b.meetingName) ?? 0) + 1,
    );
  }

  const fields = [
    { label: "Username", value: `${publicEnv.bookingHost}/${user.username}` },
    { label: "Timezone", value: timezoneLabel(user.timezone) },
    { label: "Joined", value: formatMediumDate(new Date(user.joined), "UTC") },
    { label: "Meetings", value: String(user.meetingCount) },
    { label: "Bookings", value: String(user.bookingCount) },
    { label: "Status", value: user.suspended ? "Suspended" : "Active" },
  ];

  return (
    <>
      <PageHeader
        title={user.name}
        crumb={{ href: "/admin/users", label: "Users", current: user.name }}
      />
      <PageBody>
        <div className="mx-auto flex w-full max-w-[680px] flex-col gap-[20px]">
          <div className="flex flex-wrap items-center gap-[13px] border-b border-line pb-[18px]">
            <Avatar initials={initialsOf(user.name)} size={42} />
            <div className="flex min-w-[150px] flex-1 flex-col gap-[2px]">
              <span className="text-[15px] font-semibold text-ink">
                {user.name}
              </span>
              <span className="text-[12.5px] text-ink-3">{user.email}</span>
            </div>
            <Badge tone={user.suspended ? "bad" : "ok"}>
              {user.suspended ? "Suspended" : "Active"}
            </Badge>
            <SuspendUserButton
              userId={user.id}
              name={user.name}
              suspended={user.suspended}
            />
          </div>

          {/* Removal sits apart from the Suspend button above on purpose: one
              is reversible and one is not. */}
          <RemoveUserPanel
            userId={user.id}
            name={user.name}
            email={user.email}
            username={user.username}
          />

          <section className="flex flex-col gap-[11px]">
            <h2 className="m-0 text-[14.5px] font-semibold text-ink">Profile</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-px overflow-hidden rounded-[8px] border border-line bg-line-soft">
              {fields.map((field) => (
                <div
                  key={field.label}
                  className="flex flex-col gap-[3px] bg-surface px-[14px] py-[11px]"
                >
                  <span className="font-mono text-[10px] tracking-[0.07em] uppercase text-ink-3">
                    {field.label}
                  </span>
                  <span className="text-[13px] text-ink">{field.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-[11px]">
            <div className="flex items-baseline gap-[9px]">
              <h2 className="m-0 text-[14.5px] font-semibold text-ink">
                Meetings
              </h2>
              <span className="text-[12.5px] text-ink-3">
                {userTypes.filter((t) => t.is_active).length} active ·{" "}
                {user.bookingCount} bookings all-time
              </span>
            </div>
            {userTypes.length > 0 ? (
              <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
                {userTypes.map((type, i) => (
                  <div
                    key={type.id}
                    className={`flex flex-wrap items-center gap-[12px] px-[15px] py-[11px] ${
                      i > 0 ? "border-t border-line-soft" : ""
                    }`}
                  >
                    <span className="min-w-[150px] flex-1 text-[13.5px] font-semibold text-ink">
                      {type.name}
                    </span>
                    <span className="flex-none text-[12.5px] text-ink-2">
                      {type.duration_minutes} min
                    </span>
                    <span className="flex-none text-[12.5px] text-ink-3">
                      {bookingsPerType.get(type.name) ?? 0} bookings
                    </span>
                    <Badge tone={type.is_active ? "ok" : "off"}>
                      {type.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No meetings"
                body="This account has not created anything bookable yet."
              />
            )}
          </section>

          <section className="flex flex-col gap-[11px]">
            <h2 className="m-0 text-[14.5px] font-semibold text-ink">
              Recent bookings
            </h2>
            {userBookings.length > 0 ? (
              <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
                {userBookings.map((booking, i) => (
                  <div
                    key={booking.id}
                    className={`flex flex-wrap items-center gap-[12px] px-[15px] py-[11px] ${
                      i > 0 ? "border-t border-line-soft" : ""
                    }`}
                  >
                    <span className="min-w-[130px] flex-1 text-[13.5px] text-ink">
                      {booking.guestName}
                    </span>
                    <span className="flex-none text-[12.5px] text-ink-2">
                      {booking.meetingName}
                    </span>
                    <span className="flex-none text-[12.5px] text-ink-3">
                      {formatMediumDate(new Date(booking.startsAt), "UTC")} ·{" "}
                      {formatTimeRange(
                        new Date(booking.startsAt),
                        new Date(booking.endsAt),
                        "UTC",
                      )}
                    </span>
                    <Badge tone={booking.status === "cancelled" ? "bad" : "ok"}>
                      {booking.status === "cancelled" ? "Cancelled" : "Confirmed"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No bookings"
                body="Nobody has booked time with this account yet."
              />
            )}
          </section>
        </div>
      </PageBody>
    </>
  );
}
