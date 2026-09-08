"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookingDialogs, type DialogState } from "./booking-dialogs";
import type { BookingView } from "@/lib/data/bookings";
import { cx } from "@/lib/cx";

/* Today's rows carry a Join button; later rows stack the day over the time and
   do not, because a meeting three days out has nothing to join yet. */

export function DashboardRows({
  rows,
  variant,
}: {
  rows: BookingView[];
  variant: "today" | "later";
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
              <span className="w-[112px] flex-none text-[13px] font-semibold text-ink">{row.timeRange}</span>
            ) : (
              <div className="flex w-[112px] flex-none flex-col gap-[1px]">
                <span className="text-[13px] font-semibold text-ink">{row.dayLabel}</span>
                <span className="text-[12px] text-ink-3">{row.timeRange}</span>
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
        onBackToDetail={() => setDialog((d) => (d ? { ...d, view: "detail" } : null))}
      />
    </>
  );
}
