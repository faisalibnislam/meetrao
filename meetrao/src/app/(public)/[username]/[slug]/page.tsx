import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/seo";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { Eyebrow } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { bookableDatesInMonth, computeSlots } from "@/lib/booking/slots";
import {
  getBusy,
  getMeetingAvailability,
  getMeetingOverrides,
  getPublicHost,
  getPublicMeetings,
} from "@/lib/data/public-booking";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const host = await getPublicHost(username);
  if (!host)
    return { title: "Not found", robots: { index: false, follow: false } };

  const meeting = (await getPublicMeetings(username)).find(
    (m) => m.slug === slug,
  );
  if (!meeting)
    return { title: "Book a time", robots: { index: false, follow: false } };

  const name = host.fullName || host.username;
  const title = `${meeting.name} with ${name}`;
  /* The host's own description when they wrote one, and a generated sentence
     when they did not — an empty description leaves the search result to be
     filled in from whatever text the crawler happens to find first, which on
     this page is a list of times. */
  const description =
    meeting.description ||
    `Book a ${meeting.durationMinutes}-minute ${meeting.name.toLowerCase()} with ${name}. ` +
      `Live availability, no account needed, and a Google Meet link on every booking.`;

  return {
    title,
    description,
    alternates: { canonical: `/${host.username}/${meeting.slug}` },
    openGraph: {
      images: [OG_IMAGE],
      type: "website",
      title,
      description,
      url: `/${host.username}/${meeting.slug}`,
    },
  };
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;

  const host = await getPublicHost(username);
  if (!host) notFound();

  const meeting = (await getPublicMeetings(username)).find(
    (m) => m.slug === slug,
  );
  if (!meeting) notFound();

  const availability = await getMeetingAvailability(meeting.id);
  const overrides = await getMeetingOverrides(meeting.id);

  // The first paint is rendered in the host's zone, because the server cannot
  // know the guest's. The client corrects it on mount.
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: host.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number);

  const [year, month, day] = today;

  const { busy } = await getBusy(
    host.id,
    new Date(Date.UTC(year, month - 1, 1) - DAY),
    new Date(Date.UTC(year, month, 1) + DAY),
  );

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

  // Land on the first bookable day rather than an empty "pick a date" panel.
  const firstOpen = openDates
    .map((key) => Number(key.slice(8)))
    .filter((d) => d >= day)
    .sort((a, b) => a - b)[0];

  const times = firstOpen
    ? computeSlots({ ...shared, date: { year, month, day: firstOpen } }).map(
        (d) => d.toISOString(),
      )
    : [];

  // Records that the page was opened, which is what "Avg. reply time" measures.
  const pageViewId = await convexAnonymous().mutation(api.publicBooking.recordPageView, {
    hostId: host.id,
    meetingTypeId: meeting.id,
  });

  return (
    <div className="m-auto flex w-full max-w-[940px] flex-col gap-[14px]">
      <div className="flex items-center justify-between gap-[12px] px-[2px]">
        <Logo height={20} />
        <Eyebrow size={10.5}>Booking page</Eyebrow>
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
        questions={meeting.questions}
        initial={{
          year,
          month,
          openDates,
          day: firstOpen ?? null,
          times,
          timezone: host.timezone,
        }}
        pageViewId={typeof pageViewId === "string" ? pageViewId : null}
      />
    </div>
  );
}
