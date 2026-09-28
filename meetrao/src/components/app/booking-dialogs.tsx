"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/controls";
import { MenuSelect } from "@/components/ui/menu-select";
import { DetailRow, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cancelBooking, rescheduleBooking } from "@/lib/actions/bookings";
import { timeOptions } from "@/lib/booking/time";
import type { BookingView } from "@/lib/data/bookings";

/* Booking detail, its cancel confirmation, and moving it. "Cancel meeting"
   moves to the confirm; "Keep it" comes back here, so the destructive action
   always costs two deliberate clicks.

   Moving is offered beside cancelling rather than behind it: a host who wants
   a different time should not have to cancel — that mails the guest a
   cancellation and throws away the Meet link to say "can we do Thursday?". */

export type DialogState = { booking: BookingView; view: "detail" | "cancel" | "move" } | null;

export function BookingDialogs({
  state,
  onClose,
  onOpenCancel,
  onOpenMove,
  onBackToDetail,
  timezoneLabel,
}: {
  state: DialogState;
  onClose: () => void;
  onOpenCancel: () => void;
  onOpenMove?: () => void;
  onBackToDetail: () => void;
  /** The host's zone, named on the move dialog so the fields are unambiguous. */
  timezoneLabel?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [cancelling, startCancel] = useTransition();
  const [moving, startMove] = useTransition();
  const [moveDate, setMoveDate] = useState("");
  const [moveTime, setMoveTime] = useState("540");

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

  if (state.view === "move") {
    return (
      <Modal
        open
        onClose={onClose}
        title="Move this meeting"
        subtitle={timezoneLabel ? `Your time — ${timezoneLabel}.` : undefined}
        primary={{
          label: moving ? "Moving…" : "Move meeting",
          busy: moving,
          onClick: () =>
            startMove(async () => {
              if (!moveDate) {
                toast({ tone: "bad", title: "Pick a date", text: "Choose the day it moves to." });
                return;
              }
              const result = await rescheduleBooking(booking.id, moveDate, Number(moveTime));
              if (result.error) {
                toast({ tone: "bad", title: "Could not move", text: result.error });
                return;
              }
              onClose();
              toast({
                tone: "ok",
                title: "Meeting moved",
                text: result.calendarWarning ?? `${guestFirst} has been emailed the new time.`,
              });
              router.refresh();
            }),
        }}
        secondary={{ label: "Keep it", onClick: onBackToDetail }}
      >
        <div className="flex flex-col gap-[12px]">
          <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">
            {booking.meetingName} with {booking.guest} is at {booking.dayLabel} · {booking.timeRange}. Moving
            it emails everyone invited and updates both calendars; the Meet link stays the same.
          </span>
          <div className="flex flex-wrap gap-[12px]">
            <Field label="New date" htmlFor="move-date" className="min-w-[150px] flex-1">
              <Input
                id="move-date"
                type="date"
                height={36}
                value={moveDate}
                onChange={(e) => setMoveDate(e.target.value)}
              />
            </Field>
            <div className="flex min-w-[150px] flex-1 flex-col gap-[6px]">
              <span className="text-[12.5px] font-semibold text-ink">Start</span>
              <MenuSelect aria-label="Start time" options={timeOptions()} value={moveTime} onChange={setMoveTime} />
            </div>
          </div>
        </div>
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
        {/* Moving lives in the body, not the footer: the footer's two slots are
            joining and cancelling, and a host looking for another time should
            not have to reach for the destructive one. A meeting that has been
            and gone, or one already cancelled, has nowhere to move to. */}
        {onOpenMove && !booking.cancelled && !booking.past ? (
          <div className="-mt-[2px] mb-[3px] flex">
            <Button variant="secondary" size={28} icon="rotate-left" onClick={onOpenMove}>
              Move to another time
            </Button>
          </div>
        ) : null}

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

        {booking.answers.length ? (
          // What the guest was asked, in the order the meeting asks it. The
          // label comes from the answer rather than the meeting, so a question
          // reworded since does not relabel an old reply.
          <div className="mt-[4px] flex flex-col gap-[9px] rounded-[8px] border border-line bg-fill px-[13px] py-[11px]">
            {booking.answers.map((a) => (
              <div key={a.label} className="flex flex-col gap-[2px]">
                <span className="text-[11px] tracking-[0.04em] text-ink-3 uppercase">{a.label}</span>
                <span className="text-[12.5px] leading-[1.5] text-pretty text-ink">{a.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        {booking.note ? (
          <div className="mt-[4px] rounded-[8px] border border-line bg-fill px-[13px] py-[11px]">
            <span className="text-[12.5px] leading-[1.5] text-pretty text-ink-2">{booking.note}</span>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
