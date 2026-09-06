"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Avatar, EmptyState } from "@/components/ui/controls";
import { SearchField } from "@/components/ui/field";
import { MenuSelect } from "@/components/ui/menu-select";
import { buttonClass } from "@/components/ui/button-style";
import { initialsOf } from "@/lib/initials";

const TH =
  "border-b border-line bg-fill px-[14px] py-[9px] font-mono text-[10px] font-normal tracking-[0.07em] whitespace-nowrap uppercase text-ink-2";

/* ── Users ───────────────────────────────────────────────────────────────── */

export type AdminUserView = {
  id: string;
  name: string;
  email: string;
  username: string;
  timezoneLabel: string;
  meetingCount: number;
  bookingCount: number;
  joinedLabel: string;
  suspended: boolean;
};

export function AdminUsersTable({ users }: { users: AdminUserView[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const rows = useMemo(
    () =>
      q
        ? users.filter((u) =>
            `${u.name} ${u.email} ${u.username}`.toLowerCase().includes(q),
          )
        : users,
    [users, q],
  );

  return (
    <div className="flex flex-col gap-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <SearchField
          label="Search users"
          value={query}
          onValueChange={setQuery}
          placeholder="Search name, email, username..."
          className="w-[280px] max-w-full"
        />
        <span className="text-[12.5px] text-ink-3">
          {rows.length === 1 ? "1 user" : `${rows.length} users`}
        </span>
      </div>

      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr>
                  <th className={`${TH} text-left`}>User</th>
                  <th className={`${TH} text-left`}>Timezone</th>
                  <th className={`${TH} text-right`}>Meetings</th>
                  <th className={`${TH} text-right`}>Bookings</th>
                  <th className={`${TH} text-left`}>Status</th>
                  <th className={`${TH} text-left`}>Joined</th>
                  <th className={`${TH} text-right`} />
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-line-soft transition-colors duration-[120ms] hover:bg-fill"
                  >
                    <td className="px-[14px] py-[10px] align-middle">
                      <div className="flex items-center gap-[10px]">
                        <Avatar
                          initials={initialsOf(user.name)}
                          size={28}
                          tone="neutral"
                        />
                        <div className="flex min-w-0 flex-col gap-[1px]">
                          <span className="text-[13.5px] font-semibold text-ink">
                            {user.name}
                          </span>
                          <span className="text-[12px] text-ink-3">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-[14px] py-[10px] align-middle text-[12.5px] whitespace-nowrap text-ink-2">
                      {user.timezoneLabel}
                    </td>
                    <td className="px-[14px] py-[10px] text-right align-middle text-[13px] text-ink">
                      {user.meetingCount}
                    </td>
                    <td className="px-[14px] py-[10px] text-right align-middle text-[13px] text-ink">
                      {user.bookingCount}
                    </td>
                    <td className="px-[14px] py-[10px] align-middle">
                      <Badge tone={user.suspended ? "bad" : "ok"}>
                        {user.suspended ? "Suspended" : "Active"}
                      </Badge>
                    </td>
                    <td className="px-[14px] py-[10px] align-middle text-[12.5px] whitespace-nowrap text-ink-2">
                      {user.joinedLabel}
                    </td>
                    <td className="px-[14px] py-[10px] text-right align-middle">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className={buttonClass({
                          variant: "secondary",
                          size: "xs",
                        })}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No users found"
          body="No account matches that name, email or username."
        />
      )}
    </div>
  );
}

/* ── Bookings ────────────────────────────────────────────────────────────── */

export type AdminBookingView = {
  id: string;
  hostName: string;
  hostEmail: string;
  guestName: string;
  guestEmail: string;
  meetingName: string;
  dateLabel: string;
  timeLabel: string;
  status: "confirmed" | "cancelled";
  upcoming: boolean;
};

const DATE_FILTERS = [
  { value: "all", label: "All dates" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

export function AdminBookingsTable({
  bookings,
}: {
  bookings: AdminBookingView[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const q = query.trim().toLowerCase();

  const rows = useMemo(
    () =>
      bookings
        .filter((b) =>
          q
            ? `${b.hostName} ${b.guestName} ${b.guestEmail} ${b.hostEmail}`
                .toLowerCase()
                .includes(q)
            : true,
        )
        .filter((b) =>
          filter === "all" ? true : filter === "upcoming" ? b.upcoming : !b.upcoming,
        ),
    [bookings, q, filter],
  );

  return (
    <div className="flex flex-col gap-[13px]">
      <div className="flex flex-wrap items-center gap-[10px]">
        <SearchField
          label="Search bookings"
          value={query}
          onValueChange={setQuery}
          placeholder="Search host, guest, email..."
          className="w-[260px] max-w-full"
        />
        <div className="w-[150px]">
          <MenuSelect
            size="sm"
            label="Date range"
            options={DATE_FILTERS}
            value={filter}
            onChange={setFilter}
          />
        </div>
        <span className="ml-auto text-[12.5px] text-ink-3">
          {rows.length === 1 ? "1 booking" : `${rows.length} bookings`}
        </span>
      </div>

      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr>
                  <th className={`${TH} text-left`}>Host</th>
                  <th className={`${TH} text-left`}>Guest</th>
                  <th className={`${TH} text-left`}>Meeting</th>
                  <th className={`${TH} text-left`}>Date</th>
                  <th className={`${TH} text-left`}>Time</th>
                  <th className={`${TH} text-left`}>Status</th>
                  <th className={`${TH} text-right`} />
                </tr>
              </thead>
              <tbody>
                {rows.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-line-soft transition-colors duration-[120ms] hover:bg-fill"
                  >
                    <td className="px-[14px] py-[10px] align-middle text-[13.5px] font-semibold whitespace-nowrap text-ink">
                      {booking.hostName}
                    </td>
                    <td className="px-[14px] py-[10px] align-middle">
                      <div className="flex flex-col gap-[1px]">
                        <span className="text-[13px] text-ink">
                          {booking.guestName}
                        </span>
                        <span className="text-[12px] text-ink-3">
                          {booking.guestEmail}
                        </span>
                      </div>
                    </td>
                    <td className="px-[14px] py-[10px] align-middle text-[13px] text-ink-2">
                      {booking.meetingName}
                    </td>
                    <td className="px-[14px] py-[10px] align-middle text-[13px] whitespace-nowrap text-ink">
                      {booking.dateLabel}
                    </td>
                    <td className="px-[14px] py-[10px] align-middle text-[13px] whitespace-nowrap text-ink">
                      {booking.timeLabel}
                    </td>
                    <td className="px-[14px] py-[10px] align-middle">
                      <Badge
                        tone={booking.status === "cancelled" ? "bad" : "ok"}
                      >
                        {booking.status === "cancelled"
                          ? "Cancelled"
                          : "Confirmed"}
                      </Badge>
                    </td>
                    <td className="px-[14px] py-[10px] text-right align-middle">
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className={buttonClass({
                          variant: "secondary",
                          size: "xs",
                        })}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No bookings found"
          body="Nothing matches that search or date range."
        />
      )}
    </div>
  );
}
