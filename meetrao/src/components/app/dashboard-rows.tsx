"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookingDialogs, type DialogState } from "./booking-dialogs";
import type { BookingView } from "@/lib/data/bookings";
import { cx } from "@/lib/cx";

/* Today's rows carry a Join button; later rows stack the day over the time and
   do not, because a meeting three days out has nothing to join yet.

   The time column is 134px, not the design's 112px. formatTimeRange keeps both
   meridiems whenever a range crosses noon or midnight, and its widest output —
   "10:00 AM – 10:30 PM" — measures 127.4px at 13px/600 in Instrument Sans. At
   112px roughly half of realistic bookings wrapped onto a second line, which
   also pushed the row's own height around. 134px clears the worst case with
   about 5% to spare. Measured in a browser, not estimated. */

export function DashboardRows({
  rows,
  variant,
  timezoneLabel,
}: {
  rows: BookingView[];
  variant: "today" | "later";
  /** The host's own zone, named in the move dialog's fields. */
  timezoneLabel?: string;
}) {
  const [dialog, setDialog] = useState<DialogState>(null);

  return (
    <>
      <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
        {rows.map((row, i) => (
          <div
            key={row.id}
            className={cx(
              "flex flex-wrap items-center gap-[14px] px-[15px] py-[12px] transition-colors duration-[120ms] hover:bg-fill",
              i > 0 && "border-t border-line-soft",
            )}
          >
            {variant === "today" ? (
              <span className="w-[134px] flex-none text-[13px] font-semibold whitespace-nowrap text-ink">
                {row.timeRange}
              </span>
            ) : (
              <div className="flex w-[134px] flex-none flex-col gap-[1px]">
                <span className="text-[13px] font-semibold text-ink">{row.dayLabel}</span>
                <span className="text-[12px] whitespace-nowrap text-ink-3">{row.timeRange}</span>
              </div>
            )}

            <div className="flex min-w-[160px] flex-1 flex-col gap-[1px]">
              <span className="text-[13.5px] font-semibold text-ink">{row.guest}</span>
              <span className="text-[12.5px] text-ink-3">
                {row.meetingName} · {row.duration} min
              </span>
            </div>

            <Button
              variant="ghost"
              size={28}
              className="flex-none hover:bg-fill-2"
              onClick={() => setDialog({ booking: row, view: "detail" })}
            >
              Details
            </Button>

            {variant === "today" ? (
              <Button
                variant="accent"
                size={28}
                icon="video"
                className="flex-none"
                onClick={() => {
                  if (row.meetUrl) window.open(row.meetUrl, "_blank", "noopener,noreferrer");
                  else setDialog({ booking: row, view: "detail" });
                }}
              >
                Join
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <BookingDialogs
        state={dialog}
        onClose={() => setDialog(null)}
        onOpenCancel={() => setDialog((d) => (d ? { ...d, view: "cancel" } : null))}
        onOpenMove={() => setDialog((d) => (d ? { ...d, view: "move" } : null))}
        onBackToDetail={() => setDialog((d) => (d ? { ...d, view: "detail" } : null))}
        timezoneLabel={timezoneLabel}
      />
    </>
  );
}
