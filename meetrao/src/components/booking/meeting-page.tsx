import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { Eyebrow } from "@/components/ui/badge";
import { bookableDatesInMonth, computeSlots } from "@/lib/booking/slots";
import {
  getBusy,
  meetingIsOnCompany,
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

const DAY = 86_400_000;

/** A company, however the route worked out which one. */
export type CompanyContext = {
  slug: string;
  name: string;
  unbranded: boolean;
  brand: { logoUrl: string | null; logoHidden: boolean; color: string | null; background: string | null } | null;
};

/**
 * One meeting's booking page, wherever it was reached from.
 *
 * Three addresses lead here and the difference between them is entirely in
 * WHO RESOLVED THE COMPANY, which is why that is a prop rather than something
 * this reads for itself:
 *
 *   meetrao.com/<username>/<meeting>          personal, no company
 *   meetrao.com/<company>/<handle>/<meeting>  the company, from the path
 *   <domain>/<handle>/<meeting>               the company, from the hostname
 *
 * The company, when there is one, wins the brand outright rather than
 * merging: a page that took the logo from one brand and the colour from
 * another would be neither.
 */
export async function MeetingPage({
  username,
  slug,
  company,
}: {
  username: string;
  slug: string;
  /** Already resolved by the route, from the path or from the hostname. */
  company: CompanyContext | null;
}) {
  const host = await getPublicHost(username);
  if (!host) notFound();

  const meeting = (await getPublicMeetings(username)).find(
    (m) => m.slug === slug,
  );
  if (!meeting) notFound();

  /* A company's address serves only that company's meetings. Without this, a
     guest who guessed a slug could reach a member's PERSONAL meeting through
     somebody else's branded address, which is the whole thing company scoping
     exists to prevent. */
  if (company && !(await meetingIsOnCompany(username, meeting.slug, company.slug))) notFound();

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
