"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { CountBadge, EmptyState } from "@/components/ui/controls";
import { SearchField } from "@/components/ui/field";
import {
  BookingDialogs,
  BookingTableRow,
  type BookingRowData,
} from "./booking-rows";

const TH =
  "border-b border-line bg-fill px-[14px] py-[9px] font-mono text-[10px] font-normal tracking-[0.07em] whitespace-nowrap uppercase text-ink-2";

type Tab = "upcoming" | "past";

export function BookingsScreen({
  upcoming,
  past,
}: {
  upcoming: BookingRowData[];
  past: BookingRowData[];
}) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");

  const source = tab === "upcoming" ? upcoming : past;
  const q = query.trim().toLowerCase();

  const rows = useMemo(
    () =>
      q
        ? source.filter((b) =>
            `${b.guest} ${b.email}`.toLowerCase().includes(q),
          )
        : source,
    [source, q],
  );

  const emptyTitle = q
    ? "No matches"
    : tab === "past"
      ? "Nothing in the past yet"
      : "No upcoming bookings";

  const emptyBody = q
    ? "No booking matches that guest or email."
    : tab === "past"
      ? "Meetings move here once they have happened."
      : "New bookings will appear here as guests book.";

  return (
    <BookingDialogs>
      <div className="flex flex-col gap-[15px]">
        <div className="flex flex-wrap items-end justify-between gap-[12px] border-b border-line">
          <div role="tablist" aria-label="Bookings" className="flex gap-[2px]">
            {(
              [
                ["upcoming", "Upcoming", upcoming.length],
                ["past", "Past", past.length],
              ] as const
            ).map(([key, label, count]) => {
              const on = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(key)}
                  className={cn(
                    "-mb-px inline-flex h-[34px] cursor-pointer items-center gap-[7px] border-0 border-b-2 bg-transparent px-[12px] text-[13.5px] font-semibold",
                    on
                      ? "border-b-ink text-ink"
                      : "border-b-transparent text-ink-2",
                  )}
                >
                  <span>{label}</span>
                  <CountBadge active={on}>{count}</CountBadge>
                </button>
              );
            })}
          </div>

          <SearchField
            label="Search bookings"
            value={query}
            onValueChange={setQuery}
            placeholder="Search guest or email..."
            className="mb-[8px] w-[230px] max-w-full"
          />
        </div>

        {rows.length > 0 ? (
          <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse">
                <thead>
                  <tr>
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
                    <BookingTableRow key={booking.id} booking={booking} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState title={emptyTitle} body={emptyBody} />
        )}
      </div>
    </BookingDialogs>
  );
}
