import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { Eyebrow } from "@/components/ui/badge";
import { Callout } from "@/components/ui/panels";
import { bookableDatesInMonth, computeSlots } from "@/lib/booking/slots";
import { getBookingByReference } from "@/lib/data/guest-booking";
import { getBusy, getMeetingAvailability, getMeetingOverrides, getPublicHost, getPublicMeetings } from "@/lib/data/public-booking";
import { PublicFooter } from "@/components/booking/public-footer";
import { BrandMark, BrandScope } from "@/components/booking/brand";

export const dynamic = "force-dynamic";

/* Same reasoning as the cancel page: a reference, a named guest and a time. */
const PRIVATE_PAGE = { index: false, follow: false, nocache: true } as const;

export const metadata: Metadata = { title: "Move this meeting", robots: PRIVATE_PAGE };

const DAY = 86_400_000;

/**
 * The guest moving their own booking.
 *
 * Reached from the confirmation screen and from every booking email, and
 * authorised by the reference alone — the same credential that already cancels
 * the meeting outright. Nothing is written until the guest picks a time and
 * confirms, so a link previewer fetching this URL changes nothing.
 */
export default async function ReschedulePage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  const booking = await getBookingByReference(reference);
  if (!booking) notFound();
  if (booking.status === "cancelled") redirect(`/booking/${reference}/cancelled`);

  const host = await getPublicHost(booking.hostUsername);
  const meeting = booking.meetingSlug
    ? (await getPublicMeetings(booking.hostUsername)).find((m) => m.slug === booking.meetingSlug)
    : undefined;

  /* A meeting the host has deleted or switched off has no rules left to book
     against. Cancelling still works, and the host can offer another time
     themselves, so this is a dead end rather than a 404. */
  if (!host || !meeting) {
    return (
      <BrandScope brand={booking.hostBrand}>
      <div className="m-auto flex w-full max-w-[520px] flex-col gap-[14px]">
        <div className="flex items-center justify-between gap-[12px] px-[2px]">
          <BrandMark brand={booking.hostBrand} hostName={booking.hostName} height={20} />
          <Eyebrow size={10.5}>Move this meeting</Eyebrow>
        </div>
        <div className="flex flex-col gap-[16px] rounded-[12px] border border-line bg-surface p-[30px] max-[820px]:p-[22px]">
          <h1 className="m-0 font-serif text-[28px] leading-[1.1] font-normal tracking-[-0.01em] text-ink">
            This one cannot be moved online
          </h1>
          <Callout tone="amber" title="The meeting is no longer offered">
            {booking.hostName} has taken this meeting down, so there are no times to move it to. Email them to
            arrange another, or cancel if you no longer need it.
          </Callout>
          <Link href={`/booking/${reference}`} className="text-[13.5px] font-semibold text-accent-ink">
            Back to your booking
          </Link>
        </div>
      </div>
      <PublicFooter badge={!booking.hostUnbranded} />
      </BrandScope>
    );
  }

  const availability = await getMeetingAvailability(meeting.id);
  const overrides = await getMeetingOverrides(meeting.id);

  // First paint in the host's zone, as the booking page does; the client
  // corrects to the guest's own zone on mount.
  const now = new Date();
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: host.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number);

  const { busy } = await getBusy(
    host.id,
    new Date(Date.UTC(year, month - 1, 1) - DAY),
    new Date(Date.UTC(year, month, 1) + DAY),
  );

  /* The booking's own slot would otherwise read as busy and hide the times
     either side of it — including, at a shorter duration, the time it already
     holds. The API and the Convex mutation drop it again for themselves. */
  const ownStart = new Date(booking.startsAt).getTime();
  const ownEnd = new Date(booking.endsAt).getTime();
  const others = busy.filter((b) => !(b.start.getTime() === ownStart && b.end.getTime() === ownEnd));

  const shared = {
    guestTimezone: host.timezone,
    hostTimezone: host.timezone,
    availability,
    overrides,
    rules: meeting.rules,
    busy: others,
    now,
  };

  const openDates = [...bookableDatesInMonth({ ...shared, year, month })];
  const firstOpen = openDates
    .map((key) => Number(key.slice(8)))
    .filter((d) => d >= day)
    .sort((a, b) => a - b)[0];

  const times = firstOpen
    ? computeSlots({ ...shared, date: { year, month, day: firstOpen } }).map((d) => d.toISOString())
    : [];

  return (
    <BrandScope brand={host.brand}>
    <div className="m-auto flex w-full max-w-[940px] flex-col gap-[14px]">
      <div className="flex items-center justify-between gap-[12px] px-[2px]">
        <BrandMark brand={host.brand} hostName={host.fullName || host.username} height={20} />
        <Eyebrow size={10.5}>Move this meeting</Eyebrow>
      </div>

      <BookingFlow
        username={host.username}
        slug={meeting.slug}
        hostName={host.fullName || host.username}
        hostAvatarUrl={host.avatarUrl}
        hostJobTitle={host.jobTitle}
        hostTimezone={host.timezone}
        meetingName={meeting.name}
        meetingDescription={meeting.description}
        durationMinutes={meeting.durationMinutes}
        bookingWindowDays={meeting.rules.bookingWindowDays}
        initial={{ year, month, openDates, day: firstOpen ?? null, times, timezone: host.timezone }}
        pageViewId={null}
        move={{ reference: booking.reference, currentStart: booking.startsAt }}
      />
    </div>
      <PublicFooter badge={!host.unbranded} />
    </BrandScope>
  );
}
