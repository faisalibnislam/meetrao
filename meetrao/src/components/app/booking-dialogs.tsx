"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DetailRow, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cancelBooking } from "@/lib/actions/bookings";
import type { BookingView } from "@/lib/data/bookings";

/* Booking detail and its cancel confirmation. "Cancel meeting" moves to the
   confirm; "Keep it" comes back here, so the destructive action always costs
   two deliberate clicks. */

export type DialogState = { booking: BookingView; view: "detail" | "cancel" } | null;

export function BookingDialogs({
  state,
  onClose,
  onOpenCancel,
  onBackToDetail,
}: {
  state: DialogState;
  onClose: () => void;
  onOpenCancel: () => void;
  onBackToDetail: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [cancelling, startCancel] = useTransition();

  if (!state) return null;
  const { booking } = state;
  const guestFirst = booking.guest.split(" ")[0] || booking.guest;

  if (state.view === "cancel") {
    return (
      <Modal
        open
        onClose={onClose}
        title="Cancel this meeting?"
        primary={{
          label: cancelling ? "Cancelling…" : "Cancel meeting",
          variant: "danger",
          busy: cancelling,
          onClick: () =>
            startCancel(async () => {
              const result = await cancelBooking(booking.id);
              if (result.error) {
                toast({ tone: "bad", title: "Could not cancel", text: result.error });
                return;
              }
              onClose();
              toast({
                tone: "bad",
                title: "Meeting cancelled",
                text: result.calendarWarning ?? "The calendar event was removed.",
              });
              router.refresh();
            }),
        }}
        secondary={{ label: "Keep it", onClick: onBackToDetail }}
      >
        <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">
          This cancels {booking.meetingName} with {booking.guest}. They will be notified, the calendar event is
          removed, and the slot opens back up.
        </span>
      </Modal>
    );
  }

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={booking.meetingName}
      subtitle={`${booking.dayLabel} · ${booking.timeRange}`}
      primary={{
        label: "Join Google Meet",
        onClick: () => {
          if (booking.meetUrl) window.open(booking.meetUrl, "_blank", "noopener,noreferrer");
          else toast({ tone: "warn", title: "No Meet link yet", text: "This booking has no calendar event." });
        },
      }}
      secondary={{ label: "Cancel meeting", onClick: onOpenCancel }}
    >
      <div className="flex flex-col gap-[9px]">
        {booking.invitees.length > 1 ? (
          // A meeting the host scheduled for several people. Listing them beats
          // showing the first one and calling it "Guest", which is what the row
          // below would say on its own.
          <DetailRow
            label={`Invitees`}
            value={
              <span className="flex flex-col gap-[2px]">
                {booking.invitees.map((i) => (
                  <span key={i.email}>
                    {i.name ? `${i.name} · ` : ""}
                    <span className="text-[12px] text-ink-2">{i.email}</span>
                  </span>
                ))}
              </span>
            }
          />
        ) : (
          <>
            <DetailRow label="Guest" value={booking.guest} />
            <DetailRow label="Email" value={booking.email} machine />
          </>
        )}
        <DetailRow label="When" value={`${booking.dayLabel} · ${booking.timeRange}`} />
        <DetailRow label="Duration" value={`${booking.duration} minutes`} />
        <DetailRow label="Status" value={booking.status} />
        <DetailRow
          label="Meet"
          value={booking.cancelled ? "Removed with the event" : (booking.meetUrl ?? "Not created")}
          machine={!booking.cancelled && Boolean(booking.meetUrl)}
        />
        <DetailRow
          label="Calendar"
          value={
            booking.cancelled ? "Removed from both calendars" : `On your calendar and ${guestFirst}’s`
          }
        />

        {booking.note ? (
          <div className="mt-[4px] rounded-[8px] border border-line bg-fill px-[13px] py-[11px]">
            <span className="text-[12.5px] leading-[1.5] text-pretty text-ink-2">{booking.note}</span>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
