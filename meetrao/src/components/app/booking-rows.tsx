"use client";

import { createContext, useContext, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Modal, DetailRow } from "@/components/ui/modal";

/** Kept in step with RSVP_LABEL in @/lib/booking/rsvp, which is server-only. */
const RSVP_LABEL: Record<
  NonNullable<BookingRowData["rsvp"]>,
  string
> = {
  needsAction: "Invitation sent — no response yet",
  accepted: "Guest accepted",
  declined: "Guest declined in Google",
  tentative: "Guest replied maybe",
};
import { useToast } from "@/components/ui/toast";
import { cancelBookingAsHost } from "@/lib/actions/bookings";

/**
 * Times are formatted on the server in the host's timezone and passed down as
 * strings — formatting them again in the browser would render a different
 * timezone and trip a hydration mismatch.
 */
export type BookingRowData = {
  id: string;
  guest: string;
  email: string;
  meetingName: string;
  durationMinutes: number;
  note: string;
  status: "confirmed" | "cancelled";
  meetUrl: string | null;
  /** "Today", "Tomorrow", "Mon 7 Sep" */
  dayLabel: string;
  /** "Sep 7, 2026" */
  dateLabel: string;
  /** "3:00 – 3:30 PM" */
  timeRange: string;
  /** Whether the meeting has already happened. */
  past: boolean;
  /**
   * The guest's response on the Google event. Null when the calendar was not
   * connected for this booking, or it has not been read back yet.
   */
  rsvp: "needsAction" | "accepted" | "declined" | "tentative" | null;
};

/* ── Dialog host ─────────────────────────────────────────────────────────── */

type DialogApi = { open: (booking: BookingRowData) => void };
const DialogContext = createContext<DialogApi | null>(null);

function useBookingDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("Use inside <BookingDialogs>");
  return ctx;
}

/**
 * Wraps any tree containing booking rows and owns the detail + cancel dialogs,
 * so a single pair of dialogs serves the dashboard's two lists and the
 * Bookings table.
 */
export function BookingDialogs({ children }: { children: ReactNode }) {
  const [booking, setBooking] = useState<BookingRowData | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const { notify } = useToast();

  function joinMeet() {
    if (!booking?.meetUrl) {
      notify(
        "off",
        "No Meet link",
        "This booking has no Google Meet link — reconnect your calendar and rebook.",
      );
      return;
    }
    window.open(booking.meetUrl, "_blank", "noopener,noreferrer");
  }

  function confirmCancel() {
    if (!booking) return;
    startTransition(async () => {
      const result = await cancelBookingAsHost(booking.id);
      if (!result.ok) {
        notify("bad", "Could not cancel", result.message ?? "Try again.");
        return;
      }
      setConfirming(false);
      setBooking(null);
      notify("bad", "Meeting cancelled", "The calendar event was removed.");
    });
  }

  return (
    <DialogContext.Provider
      value={{
        open: (b) => {
          setBooking(b);
          setConfirming(false);
        },
      }}
    >
      {children}

      <Modal
        open={Boolean(booking) && !confirming}
        onClose={() => setBooking(null)}
        width={460}
        title={booking?.meetingName ?? ""}
        subtitle={
          booking ? `${booking.dayLabel} · ${booking.timeRange}` : undefined
        }
        primaryLabel="Join Google Meet"
        onPrimary={joinMeet}
        secondaryLabel="Cancel meeting"
        onSecondary={() => setConfirming(true)}
      >
        {booking ? (
          <div className="flex flex-col gap-[9px]">
            <DetailRow k="Guest" v={booking.guest} />
            <DetailRow k="Email" v={booking.email} mono />
            <DetailRow
              k="When"
              v={`${booking.dayLabel} · ${booking.timeRange}`}
            />
            <DetailRow k="Duration" v={`${booking.durationMinutes} minutes`} />
            <DetailRow
              k="Status"
              v={booking.status === "cancelled" ? "Cancelled" : "Confirmed"}
            />
            <DetailRow
              k="Calendar"
              v={
                booking.status === "cancelled"
                  ? "Event removed"
                  : booking.rsvp
                    ? RSVP_LABEL[booking.rsvp]
                    : "Invitation sent"
              }
            />
            {booking.rsvp === "declined" && booking.status !== "cancelled" ? (
              <div className="rounded-[8px] border border-amber-line bg-amber-soft px-[13px] py-[11px]">
                <span className="text-[12.5px] leading-[1.5] text-amber-ink text-pretty">
                  Declining in Google does not cancel the booking — the slot is
                  still held. Cancel it here if the meeting is off.
                </span>
              </div>
            ) : null}
            <DetailRow
              k="Meet"
              v={
                booking.status === "cancelled"
                  ? "Removed with the event"
                  : (booking.meetUrl ?? "No link — calendar was not connected")
              }
              mono={booking.status !== "cancelled" && Boolean(booking.meetUrl)}
            />
            {booking.note ? (
              <div className="mt-[4px] rounded-[8px] border border-line bg-fill px-[13px] py-[11px]">
                <span className="text-[12.5px] leading-[1.5] text-pretty text-ink-2">
                  {booking.note}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(booking) && confirming}
        onClose={() => setConfirming(false)}
        title="Cancel this meeting?"
        primaryLabel="Cancel meeting"
        primaryVariant="danger"
        onPrimary={confirmCancel}
        primaryLoading={pending}
        secondaryLabel="Keep it"
        onSecondary={() => setConfirming(false)}
      >
        {booking ? (
          <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">
            This cancels {booking.meetingName} with {booking.guest}. They will be
            notified, the calendar event is removed, and the slot opens back up.
          </span>
        ) : null}
      </Modal>
    </DialogContext.Provider>
  );
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */

export function DetailsButton({
  booking,
  size = "sm",
}: {
  booking: BookingRowData;
  size?: "xs" | "sm";
}) {
  const { open } = useBookingDialog();
  return (
    <Button variant="ghost" size={size} onClick={() => open(booking)}>
      Details
    </Button>
  );
}

export function JoinButton({
  booking,
  variant = "primary",
  size = "sm",
}: {
  booking: BookingRowData;
  variant?: "primary" | "secondary";
  size?: "xs" | "sm";
}) {
  const { notify } = useToast();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => {
        if (!booking.meetUrl) {
          notify(
            "off",
            "No Meet link",
            "This booking has no Google Meet link yet.",
          );
          return;
        }
        window.open(booking.meetUrl, "_blank", "noopener,noreferrer");
      }}
    >
      {variant === "primary" ? <Icon name="video" size={11} /> : null}
      Join
    </Button>
  );
}

/* ── Dashboard rows ──────────────────────────────────────────────────────── */

export function TodayRow({
  booking,
  first,
}: {
  booking: BookingRowData;
  first: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-[14px] px-[15px] py-[12px] transition-colors duration-[120ms] hover:bg-fill",
        !first && "border-t border-line-soft",
      )}
    >
      <span className="w-[112px] flex-none text-[13px] font-semibold text-ink">
        {booking.timeRange}
      </span>
      <div className="flex min-w-[160px] flex-1 flex-col gap-[1px]">
        <span className="text-[13.5px] font-semibold text-ink">
          {booking.guest}
        </span>
        <span className="text-[12.5px] text-ink-3">
          {booking.meetingName} · {booking.durationMinutes} min
        </span>
      </div>
      <DetailsButton booking={booking} />
      <JoinButton booking={booking} />
    </div>
  );
}

export function LaterRow({
  booking,
  first,
}: {
  booking: BookingRowData;
  first: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-[14px] px-[15px] py-[12px] transition-colors duration-[120ms] hover:bg-fill",
        !first && "border-t border-line-soft",
      )}
    >
      <div className="flex w-[112px] flex-none flex-col gap-[1px]">
        <span className="text-[13px] font-semibold text-ink">
          {booking.dayLabel}
        </span>
        <span className="text-[12px] text-ink-3">{booking.timeRange}</span>
      </div>
      <div className="flex min-w-[160px] flex-1 flex-col gap-[1px]">
        <span className="text-[13.5px] font-semibold text-ink">
          {booking.guest}
        </span>
        <span className="text-[12.5px] text-ink-3">
          {booking.meetingName} · {booking.durationMinutes} min
        </span>
      </div>
      <DetailsButton booking={booking} />
    </div>
  );
}

/* ── Bookings table row ──────────────────────────────────────────────────── */

export function BookingTableRow({ booking }: { booking: BookingRowData }) {
  const cancelled = booking.status === "cancelled";
  const joinable = !cancelled && !booking.past;

  return (
    <tr className="border-b border-line-soft transition-colors duration-[120ms] hover:bg-fill">
      <td className="px-[14px] py-[10px] align-middle">
        <div className="flex flex-col gap-[1px]">
          <span className="text-[13.5px] font-semibold text-ink">
            {booking.guest}
          </span>
          <span className="text-[12px] text-ink-3">{booking.email}</span>
        </div>
      </td>
      <td className="px-[14px] py-[10px] align-middle text-[13px] text-ink-2">
        {booking.meetingName}
      </td>
      <td className="px-[14px] py-[10px] align-middle text-[13px] whitespace-nowrap text-ink">
        {booking.dateLabel}
      </td>
      <td className="px-[14px] py-[10px] align-middle text-[13px] whitespace-nowrap text-ink">
        {booking.timeRange}
        <span className="text-ink-3"> · {booking.durationMinutes}m</span>
      </td>
      <td className="px-[14px] py-[10px] align-middle">
        <Badge tone={cancelled ? "bad" : "ok"}>
          {cancelled ? "Cancelled" : "Confirmed"}
        </Badge>
      </td>
      <td className="px-[14px] py-[10px] text-right align-middle whitespace-nowrap">
        {joinable ? (
          <span className="mr-[4px] inline-flex">
            <JoinButton booking={booking} variant="secondary" size="xs" />
          </span>
        ) : null}
        <DetailsButton booking={booking} size="xs" />
      </td>
    </tr>
  );
}
