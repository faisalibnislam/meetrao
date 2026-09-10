"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/panels";
import { BookingDialogs, type DialogState } from "./booking-dialogs";
import type { BookingView } from "@/lib/data/bookings";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Bookings, grouped by day.

   A flat table sorted by date makes you read the date column to work out where
   one day ends and the next begins. Grouping says it once, in a heading, and
   the rows underneath only have to carry the time — which is how a diary reads
   and how anyone scanning this is already thinking.

   The same shape serves every width, so there is no second card layout for
   phones: a row is a flex line that wraps, not a table cell.

   Upcoming and Past are unchanged. Past runs newest-first, because the thing
   you want from a history is usually the thing that just happened.
   ───────────────────────────────────────────────────────────────────────────── */

type Day = { key: string; heading: string; today: boolean; rows: BookingView[] };

/** Consecutive runs of one calendar day, in the order the rows already have. */
function byDay(rows: BookingView[]): Day[] {
  const days: Day[] = [];
  for (const row of rows) {
    const last = days.at(-1);
    if (last && last.key === row.dateKey) last.rows.push(row);
    else days.push({ key: row.dateKey, heading: row.dayHeading, today: row.today, rows: [row] });
  }
  return days;
}

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
  // listBookings sorts ascending. Upcoming reads forwards from now; a history
  // reads backwards from now.
  const ordered = tab === "past" ? [...rows].reverse() : rows;
  const days = byDay(ordered);

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
        <div className="flex flex-col gap-[20px]">
          {days.map((day) => (
            <section key={day.key} className="flex flex-col gap-[9px]">
              <div className="flex flex-wrap items-baseline gap-[9px]">
                <h2 className="m-0 text-[14px] font-semibold text-ink">{day.heading}</h2>
                {day.today ? (
                  <span className="inline-flex h-[19px] items-center rounded-[4px] bg-accent-soft px-[7px] text-[10.5px] font-semibold tracking-[0.04em] text-accent uppercase">
                    Today
                  </span>
                ) : null}
                <span className="text-[12.5px] text-ink-3">
                  {day.rows.length} {day.rows.length === 1 ? "meeting" : "meetings"}
                </span>
              </div>

              <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
                {day.rows.map((row, i) => (
                  <div
                    key={row.id}
                    className={cx(
                      "flex flex-wrap items-center gap-x-[14px] gap-y-[8px] px-[15px] py-[12px]",
                      "transition-colors duration-[120ms] hover:bg-fill",
                      i > 0 && "border-t border-line-soft",
                    )}
                  >
                    {/* The coloured edge is what the eye follows down a long day:
                        cancelled reads at a glance without reaching the badge. */}
                    <span
                      aria-hidden="true"
                      className={cx(
                        "-my-[12px] -ml-[15px] mr-[1px] w-[3px] flex-none self-stretch",
                        row.cancelled ? "bg-red" : row.today ? "bg-accent" : "bg-line-strong",
                      )}
                    />
                    <span className="w-[134px] flex-none text-[13px] font-semibold whitespace-nowrap text-ink">
                      {row.timeRange}
                    </span>

                    <div className="flex min-w-[180px] flex-1 flex-col gap-[1px]">
                      <span className="text-[13.5px] font-semibold text-ink">
                        {row.meetingName}
                        <span className="font-normal text-ink-3"> with {row.guest}</span>
                      </span>
                      <span className="text-[12.5px] text-ink-3">
                        {row.email} · {row.duration} min
                      </span>
                    </div>

                    {row.cancelled ? <Badge tone="bad">Cancelled</Badge> : null}

                    <div className="flex flex-none flex-wrap gap-[6px]">
                      <Button variant="ghost" size={28} className="hover:bg-fill-2" onClick={() => open(row)}>
                        Details
                      </Button>
                      {row.joinable ? (
                        <Button
                          variant="accent"
                          size={28}
                          icon="video"
                          onClick={() =>
                            row.meetUrl ? window.open(row.meetUrl, "_blank", "noopener,noreferrer") : open(row)
                          }
                        >
                          Join
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
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
