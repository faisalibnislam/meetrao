"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { detectTimezone } from "@/lib/timezones";
import { formatLongDate, formatTimeRange } from "@/lib/booking/time";
import { cancelBookingAsGuest } from "@/lib/actions/bookings";
import { useHydrated } from "@/lib/use-hydrated";

export type ConfirmedBooking = {
  reference: string;
  meetingName: string;
  hostName: string;
  guestEmail: string;
  durationMinutes: number;
  startsAtIso: string;
  endsAtIso: string;
  meetUrl: string | null;
  /** Rendered server-side in the host's zone, used until the guest's zone is known. */
  initialWhen: string;
  icsUrl: string;
};

export function Confirmed({ booking }: { booking: ConfirmedBooking }) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const hydrated = useHydrated();

  // Server-rendered in the host's zone; re-rendered in the guest's own zone
  // once hydrated, so the two never disagree on the first paint.
  const when = hydrated
    ? (() => {
        const zone = detectTimezone();
        const start = new Date(booking.startsAtIso);
        const end = new Date(booking.endsAtIso);
        return `${formatLongDate(start, zone)} · ${formatTimeRange(start, end, zone)}`;
      })()
    : booking.initialWhen;

  const rows: Array<{ k: string; v: string; mono?: boolean }> = [
    { k: "Meeting", v: booking.meetingName },
    { k: "Host", v: booking.hostName },
    { k: "When", v: when },
    { k: "Duration", v: `${booking.durationMinutes} minutes` },
    {
      k: "Where",
      v: booking.meetUrl ?? "A Meet link will follow by email",
      mono: Boolean(booking.meetUrl),
    },
  ];

  function cancel() {
    startTransition(async () => {
      const result = await cancelBookingAsGuest(booking.reference);
      if (!result.ok) {
        notify("bad", "Could not cancel", result.message ?? "Try again.");
        return;
      }
      router.push(`/booking/${booking.reference}/cancelled`);
    });
  }

  return (
    <div className="flex min-h-dvh items-start justify-center bg-ground p-[20px]">
      <div className="animate-mu-in m-auto flex w-full max-w-[520px] flex-col gap-[14px]">
        <Link href="/" title="Meetrao home" className="block self-start no-underline">
          <Logo height={20} />
        </Link>

        <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
          <div className="flex flex-col gap-[18px] px-[30px] pt-[30px] pb-[24px]">
            <div className="flex items-center gap-[12px]">
              <span className="inline-flex size-[32px] flex-none items-center justify-center rounded-full bg-accent text-white">
                <Icon name="check" weight={900} size={13} />
              </span>
              <h1 className="m-0 font-serif text-[30px] leading-[1.05] font-normal tracking-[-0.01em] text-ink">
                You&apos;re booked!
              </h1>
            </div>
            <p className="m-0 text-[13.5px] leading-[1.55] text-ink-2">
              A confirmation is on its way to {booking.guestEmail}. The invite
              includes the Google Meet link.
            </p>
          </div>

          <div className="border-t border-line bg-fill">
            {rows.map((row, i) => (
              <div
                key={row.k}
                className={`flex flex-wrap gap-[12px] px-[30px] py-[10px] ${
                  i > 0 ? "border-t border-line-soft" : ""
                }`}
              >
                <span className="w-[82px] flex-none text-[12.5px] text-ink-3">
                  {row.k}
                </span>
                <span
                  className={`min-w-[150px] flex-1 break-words text-ink ${
                    row.mono
                      ? "font-mono text-[12.5px]"
                      : "text-[13px] font-medium"
                  }`}
                >
                  {row.v}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-[12px] border-t border-line px-[30px] pt-[22px] pb-[26px]">
            <Button
              size="4xl"
              full
              onClick={() => {
                if (!booking.meetUrl) {
                  notify(
                    "off",
                    "No Meet link yet",
                    "It will arrive with your confirmation email.",
                  );
                  return;
                }
                window.open(booking.meetUrl, "_blank", "noopener,noreferrer");
              }}
            >
              <Icon name="video" size={13} />
              Join Google Meet
            </Button>

            {/* The guest is an attendee on the host\'s event, so Google has
                already put this on their calendar and emailed the invitation.
                "Add to Google Calendar" would create a SECOND, duplicate entry
                — hence a statement rather than a button. The .ics stays as the
                fallback for anyone not on Google Calendar. */}
            <div className="flex items-start gap-[10px] rounded-[8px] border border-accent-line bg-accent-soft px-[13px] py-[11px]">
              <Icon
                name="circleCheck"
                weight={900}
                size={13}
                className="mt-[2px] flex-none text-accent"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-[12.5px] font-semibold text-ink">
                  This is already on your calendar
                </span>
                <span className="text-[12.5px] leading-[1.5] text-ink-2">
                  You were invited to the meeting, so it is on your calendar
                  with the Meet link attached.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-[8px]">
              <a
                href={booking.icsUrl}
                className="inline-flex h-[44px] items-center justify-center gap-[7px] rounded-[6px] border border-line-strong bg-surface px-[11px] text-[12.5px] font-semibold text-ink no-underline hover:bg-fill hover:text-ink sm:h-[34px]"
              >
                <Icon name="download" size={11} />
                Download .ics instead
              </a>
            </div>

            <span className="text-[12.5px] leading-[1.5] text-ink-3">
              Need to change plans?{" "}
              <button
                type="button"
                onClick={cancel}
                disabled={pending}
                className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] font-medium text-ink underline decoration-line-strong underline-offset-2 hover:text-accent hover:decoration-accent disabled:opacity-60"
              >
                Cancel this meeting
              </button>
              .
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
