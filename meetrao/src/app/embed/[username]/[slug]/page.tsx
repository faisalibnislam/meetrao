import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { EmbedHeight } from "@/components/booking/embed-height";
import { bookableDatesInMonth, computeSlots } from "@/lib/booking/slots";
import {
  getBusy,
  getMeetingAvailability,
  getMeetingOverrides,
  getSeatMap,
  getPublicHost,
  getPublicMeetings,
} from "@/lib/data/public-booking";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const DAY = 86_400_000;

/**
 * The booking page, for somebody else's website.
 *
 * The same component, the same slot engine and the same API as the hosted
 * page — a second implementation would be a second place for a timezone bug,
 * and the one thing worse than no widget is a widget that offers times the
 * real page would not.
 *
 * Framing is allowed here and denied everywhere else; the policy is in
 * next.config.ts and says why.
 */
export default async function EmbedPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;

  const host = await getPublicHost(username);
  if (!host) notFound();

  const meeting = (await getPublicMeetings(username)).find((m) => m.slug === slug);
  if (!meeting) notFound();

  const availability = await getMeetingAvailability(meeting.id);
  const overrides = await getMeetingOverrides(meeting.id);

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
    // A workshop's own seats are not conflicts with themselves.
    meeting.capacity > 1 ? meeting.id : undefined,
  );

  const seats =
    meeting.capacity > 1
      ? await getSeatMap(
          meeting.id,
          new Date(Date.UTC(year, month - 1, 1) - DAY),
          new Date(Date.UTC(year, month, 1) + DAY),
        )
      : {};

  const shared = {
    guestTimezone: host.timezone,
    hostTimezone: host.timezone,
    availability,
    overrides,
    rules: meeting.rules,
    busy,
    now,
  };

  const openDates = [...bookableDatesInMonth({ ...shared, year, month })];
  const firstOpen = openDates
    .map((key) => Number(key.slice(8)))
    .filter((d) => d >= day)
    .sort((a, b) => a - b)[0];

  const times = (firstOpen ? computeSlots({ ...shared, date: { year, month, day: firstOpen } }) : [])
    .map((d) => d.toISOString())
    // A full slot is not on offer, however free the host's calendar looks.
    .filter((iso) => meeting.capacity <= 1 || (seats[iso] ?? 0) < meeting.capacity);

  // The widget counts as an opening, the same as the hosted page: "Avg. reply
  // time" measures opened → booked, and a booking with no opening skews it.
  const pageViewId = await convexAnonymous().mutation(api.publicBooking.recordPageView, {
    hostId: host.id,
    meetingTypeId: meeting.id,
  });

  return (
    <>
      <EmbedHeight />
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
        questions={meeting.questions}
        location={meeting.location}
        locationDetail={meeting.locationDetail}
        capacity={meeting.capacity}
        seats={seats}
        initial={{ year, month, openDates, day: firstOpen ?? null, times, timezone: host.timezone }}
        pageViewId={typeof pageViewId === "string" ? pageViewId : null}
      />
    </>
  );
}
