import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { EmbedHeight } from "@/components/booking/embed-height";
import { BrandScope } from "@/components/booking/brand";
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
import { siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const DAY = 86_400_000;

/**
 * The booking page, for somebody else's website.
 *
 * The same component, the same slot engine and the same API as the hosted
 * page. A second implementation would be a second place for a timezone bug,
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

  // The widget counts as an opening, the same as the hosted page: "Avg. Reply
  // time" measures opened → booked, and a booking with no opening skews it.
  const pageViewId = await convexAnonymous().mutation(api.publicBooking.recordPageView, {
    hostId: host.id,
    meetingTypeId: meeting.id,
  });

  /* THE COLOUR, BUT NOT THE MARK. A widget sits on the host's own site, which
     already carries their logo at the top of the page. A second one inside
     the card would be the only place on the internet their logo appears
     twice. The colour is what makes it look like part of their site. */
  return (
    <BrandScope brand={host.brand}>
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

      {/* Free accounts carry a line on somebody else's site; Pro does not.
          Deliberately small and below the card, a widget a host paid to
          embed should look like theirs, and one they did not should still
          not shout. */}
      {host.unbranded ? null : (
        <p className="m-0 pt-[10px] text-center text-[11.5px] text-ink-3">
          <a href={`${siteUrl()}/?via=embed`} target="_blank" rel="noopener noreferrer">
            Powered by Meetrao
          </a>
        </p>
      )}
    </BrandScope>
  );
}
