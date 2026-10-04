import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/seo";
import { companyForRequest, publicUrl } from "@/lib/public-origin";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { Eyebrow } from "@/components/ui/badge";
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
import { PublicFooter } from "@/components/booking/public-footer";
import { BrandMark, BrandScope } from "@/components/booking/brand";

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
  /* Absolute, and built from the domain this request arrived on. A Pro host's
     page on their own domain must not canonicalise to meetrao.com, see
     src/lib/public-origin.ts. */
  const here = await publicUrl(`/${host.username}/${meeting.slug}`);
  /* The host's own description when they wrote one, and a generated sentence
     when they did not. An empty description leaves the search result to be
     filled in from whatever text the crawler happens to find first, which on
     this page is a list of times. */
  const description =
    meeting.description ||
    `Book a ${meeting.durationMinutes}-minute ${meeting.name.toLowerCase()} with ${name}. ` +
      `Live availability, no account needed, and a Google Meet link on every booking.`;

  return {
    title,
    description,
    alternates: { canonical: here },
    openGraph: {
      images: [OG_IMAGE],
      type: "website",
      title,
      description,
      url: here,
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

  /* On a company's domain the page wears the COMPANY's brand, not the host's.
     Resolved from the hostname rather than from anything in the path, so
     meetrao.com/alex cannot be made to wear somebody else's logo.

     The company wins outright rather than merging: a page that took the logo
     from one brand and the colour from another would be neither. */
  const company = await companyForRequest();
  const brand = company ? company.brand : host.brand;
  const unbranded = company ? company.unbranded : host.unbranded;

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

  // Land on the first bookable day rather than an empty "pick a date" panel.
  const firstOpen = openDates
    .map((key) => Number(key.slice(8)))
    .filter((d) => d >= day)
    .sort((a, b) => a - b)[0];

  const times = (firstOpen ? computeSlots({ ...shared, date: { year, month, day: firstOpen } }) : [])
    .map((d) => d.toISOString())
    // A full slot is not on offer, however free the host's calendar looks.
    .filter((iso) => meeting.capacity <= 1 || (seats[iso] ?? 0) < meeting.capacity);

  // Records that the page was opened, which is what "Avg. Reply time" measures.
  const pageViewId = await convexAnonymous().mutation(api.publicBooking.recordPageView, {
    hostId: host.id,
    meetingTypeId: meeting.id,
  });

  return (
    <BrandScope brand={brand}>
    <div className="m-auto flex w-full max-w-[940px] flex-col gap-[14px]">
      <div className="flex items-center justify-between gap-[12px] px-[2px]">
        <BrandMark brand={brand} hostName={company?.name || host.fullName || host.username} height={20} />
        <Eyebrow size={10.5} className="text-on-ground">Booking page</Eyebrow>
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
        location={meeting.location}
        locationDetail={meeting.locationDetail}
        capacity={meeting.capacity}
        seats={seats}
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
      <PublicFooter badge={!unbranded} />
    </BrandScope>
  );
}
