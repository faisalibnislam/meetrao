import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { Eyebrow } from "@/components/ui/badge";
import { bookingStart } from "@/lib/data/booking-start";
import { PublicFooter } from "@/components/booking/public-footer";
import { BrandMark, BrandScope } from "@/components/booking/brand";

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
  /* The reads are bookingStart's, in two phases, shared with the embed
     widget so the two can never offer different times. */
  const start = await bookingStart(username, slug, company?.slug ?? null);
  if (!start) notFound();
  const { host, meeting, seats, initial, pageViewId } = start;

  const brand = company ? company.brand : host.brand;
  const unbranded = company ? company.unbranded : host.unbranded;

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
        initial={initial}
        pageViewId={pageViewId}
      />
    </div>
      <PublicFooter badge={!unbranded} />
    </BrandScope>
  );
}
