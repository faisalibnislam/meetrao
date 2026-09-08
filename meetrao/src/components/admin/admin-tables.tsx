"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/controls";
import { MenuSelect } from "@/components/ui/menu-select";
import { EmptyState, TableCard } from "@/components/ui/panels";
import { StackedCell, Table, Td, Th, Tr } from "@/components/ui/table";
import type { AdminBookingRow, AdminUserRow } from "@/lib/data/admin";

/* Search and filtering run in the browser over a bounded page of rows, so the
   admin gets an instant answer without a round trip per keystroke. */

export function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      q
        ? users.filter((u) => `${u.name} ${u.email} ${u.username}`.toLowerCase().includes(q))
        : users,
    [users, q],
  );

  return (
    <div className="flex flex-col gap-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <SearchField
          value={query}
          onValueChange={setQuery}
          width={280}
          placeholder="Search name, email, username..."
          aria-label="Search users"
        />
        <span className="text-[12.5px] text-ink-3">{rows.length === 1 ? "1 user" : `${rows.length} users`}</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No users found" text="No account matches that name, email or username." />
      ) : (
        <TableCard>
          <Table minWidth={800}>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Timezone</Th>
                <Th align="right">Meetings</Th>
                <Th align="right">Bookings</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                <Th align="right">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <Tr key={u.id}>
                  <Td>
                    <div className="flex items-center gap-[10px]">
                      <Avatar name={u.name} size={28} tone="neutral" />
                      <StackedCell primary={u.name} secondary={u.email} />
                    </div>
                  </Td>
                  <Td className="text-[12.5px] whitespace-nowrap text-ink-2">{u.timezone}</Td>
                  <Td className="text-right text-[13px] text-ink">{u.meetings}</Td>
                  <Td className="text-right text-[13px] text-ink">{u.bookings}</Td>
                  <Td>
                    <Badge tone={u.suspended ? "bad" : "ok"}>{u.suspended ? "Suspended" : "Active"}</Badge>
                  </Td>
                  <Td className="text-[12.5px] whitespace-nowrap text-ink-2">{u.joined}</Td>
                  <Td className="text-right">
                    <Button
                      variant="secondary"
                      size={26}
                      className="hover:bg-fill-2"
                      onClick={() => router.push(`/admin/users/${u.id}`)}
                    >
                      View
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableCard>
      )}
    </div>
  );
}

const DATE_FILTERS = [
  { value: "all", label: "All dates" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

export function AdminBookingsTable({ bookings }: { bookings: AdminBookingRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      bookings
        .filter((b) => (filter === "all" ? true : filter === "upcoming" ? b.upcoming : !b.upcoming))
        .filter((b) => !q || `${b.host} ${b.hostEmail} ${b.guest} ${b.guestEmail}`.toLowerCase().includes(q)),
    [bookings, filter, q],
  );

  return (
    <div className="flex flex-col gap-[13px]">
      <div className="flex flex-wrap items-center gap-[10px]">
        <SearchField
          value={query}
          onValueChange={setQuery}
          width={260}
          placeholder="Search host, guest, email..."
          aria-label="Search bookings"
        />
        <div className="w-[150px]">
          <MenuSelect
            size="sm"
            aria-label="Filter by date"
            options={DATE_FILTERS}
            value={filter}
            onChange={setFilter}
          />
        </div>
        <span className="ml-auto text-[12.5px] text-ink-3">
          {rows.length === 1 ? "1 booking" : `${rows.length} bookings`}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No bookings found" text="Nothing matches that search or date range." />
      ) : (
        <TableCard>
          <Table minWidth={820}>
            <thead>
              <tr>
                <Th>Host</Th>
                <Th>Guest</Th>
                <Th>Meeting</Th>
                <Th>Date</Th>
                <Th>Time</Th>
                <Th>Status</Th>
                <Th align="right">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <Tr key={b.id}>
                  <Td className="text-[13.5px] font-semibold whitespace-nowrap text-ink">{b.host}</Td>
                  <Td>
                    <div className="flex min-w-0 flex-col gap-[1px]">
                      <span className="text-[13px] text-ink">{b.guest}</span>
                      <span className="text-[12px] text-ink-3">{b.guestEmail}</span>
                    </div>
                  </Td>
                  <Td className="text-[13px] text-ink-2">{b.meeting}</Td>
                  <Td className="text-[13px] whitespace-nowrap text-ink">{b.date}</Td>
                  <Td className="text-[13px] whitespace-nowrap text-ink">{b.time}</Td>
                  <Td>
                    <Badge tone={b.cancelled ? "bad" : "ok"}>{b.cancelled ? "Cancelled" : "Confirmed"}</Badge>
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="secondary"
                      size={26}
                      className="hover:bg-fill-2"
                      onClick={() => router.push(`/admin/bookings/${b.id}`)}
                    >
                      View
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableCard>
      )}
    </div>
  );
}
