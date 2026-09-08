"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/controls";
import { EmptyState, TableCard } from "@/components/ui/panels";
import { StackedCell, Table, Td, Th, Tr } from "@/components/ui/table";
import { BookingDialogs, type DialogState } from "./booking-dialogs";
import type { BookingView } from "@/lib/data/bookings";
import { cx } from "@/lib/cx";

/* Bookings: a tab row on a bottom border, a search field that filters on guest
   name and email, and a table that scrolls sideways on desktop but becomes a
   card list below 640px — a horizontally scrolled table is usable, not good. */

type Tab = "upcoming" | "past";

export function BookingsScreen({ bookings }: { bookings: BookingView[] }) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);

  const upcoming = useMemo(() => bookings.filter((b) => !b.past), [bookings]);
  const past = useMemo(() => bookings.filter((b) => b.past), [bookings]);

  const source = tab === "upcoming" ? upcoming : past;
  const q = query.trim().toLowerCase();
  const rows = q ? source.filter((b) => `${b.guest} ${b.email}`.toLowerCase().includes(q)) : source;

  const open = (booking: BookingView) => setDialog({ booking, view: "detail" });

  return (
    <div className="flex flex-col gap-[15px]">
      <div className="flex flex-wrap items-end justify-between gap-[12px] border-b border-line">
        <div className="flex gap-[2px]" role="tablist" aria-label="Bookings">
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
                className={cx(
                  "-mb-[1px] inline-flex h-[34px] cursor-pointer items-center gap-[7px] border-0 border-b-2 bg-transparent px-[12px] font-sans text-[13.5px] font-semibold",
                  on ? "border-ink text-ink" : "border-transparent text-ink-2",
                )}
              >
                <span>{label}</span>
                <span
                  className={cx(
                    "inline-flex h-[17px] min-w-[18px] items-center justify-center rounded-[4px] px-[5px] text-[10.5px] font-semibold",
                    on ? "bg-ink text-white" : "bg-fill-2 text-ink-2",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <SearchField
          value={query}
          onValueChange={setQuery}
          placeholder="Search guest or email..."
          aria-label="Search bookings by guest or email"
          className="mb-[8px]"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={q ? "No matches" : tab === "past" ? "Nothing in the past yet" : "No upcoming bookings"}
          text={
            q
              ? "No booking matches that guest or email."
              : tab === "past"
                ? "Meetings move here once they have happened."
                : "New bookings will appear here as guests book."
          }
        />
      ) : (
        <>
          <TableCard className="max-[640px]:hidden">
            <Table minWidth={700}>
              <thead>
                <tr>
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
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <StackedCell primary={row.guest} secondary={row.email} />
                    </Td>
                    <Td className="text-[13px] text-ink-2">{row.meetingName}</Td>
                    <Td className="text-[13px] whitespace-nowrap text-ink">{row.dayLabel}</Td>
                    <Td className="text-[13px] whitespace-nowrap text-ink">
                      {row.timeRange}
                      <span className="text-ink-3"> · {row.duration}m</span>
                    </Td>
                    <Td>
                      <Badge tone={row.cancelled ? "bad" : "ok"}>{row.status}</Badge>
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      {row.joinable ? (
                        <Button
                          variant="secondary"
                          size={26}
                          className="mr-[4px] hover:bg-fill-2"
                          onClick={() =>
                            row.meetUrl
                              ? window.open(row.meetUrl, "_blank", "noopener,noreferrer")
                              : open(row)
                          }
                        >
                          Join
                        </Button>
                      ) : null}
                      <Button variant="ghost" size={26} className="hover:bg-fill-2" onClick={() => open(row)}>
                        Details
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableCard>

          {/* Below 640px the same rows become cards. */}
          <div className="hidden flex-col gap-[10px] max-[640px]:flex">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-[10px] rounded-[8px] border border-line bg-surface p-[14px]"
              >
                <div className="flex items-start justify-between gap-[12px]">
                  <StackedCell primary={row.guest} secondary={row.email} />
                  <Badge tone={row.cancelled ? "bad" : "ok"}>{row.status}</Badge>
                </div>
                <div className="flex flex-col gap-[2px]">
                  <span className="text-[13px] text-ink">
                    {row.dayLabel} · {row.timeRange}
                  </span>
                  <span className="text-[12.5px] text-ink-3">
                    {row.meetingName} · {row.duration} min
                  </span>
                </div>
                <div className="flex flex-wrap gap-[8px]">
                  {row.joinable ? (
                    <Button
                      variant="secondary"
                      size={36}
                      onClick={() =>
                        row.meetUrl ? window.open(row.meetUrl, "_blank", "noopener,noreferrer") : open(row)
                      }
                    >
                      Join
                    </Button>
                  ) : null}
                  <Button variant="ghost" size={36} onClick={() => open(row)}>
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <BookingDialogs
        state={dialog}
        onClose={() => setDialog(null)}
        onOpenCancel={() => setDialog((d) => (d ? { ...d, view: "cancel" } : null))}
        onBackToDetail={() => setDialog((d) => (d ? { ...d, view: "detail" } : null))}
      />
    </div>
  );
}
