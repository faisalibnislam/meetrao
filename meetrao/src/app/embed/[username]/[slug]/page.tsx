import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { EmbedHeight } from "@/components/booking/embed-height";
import { BrandScope } from "@/components/booking/brand";
import { bookingStart } from "@/lib/data/booking-start";
import { siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The booking page, for somebody else's website.
 *
 * The same component, the same loader, the same slot engine and the same API
 * as the hosted page. A second implementation would be a second place for a
 * timezone bug, and the one thing worse than no widget is a widget that
 * offers times the real page would not.
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

  const start = await bookingStart(username, slug, null);
  if (!start) notFound();
  const { host, meeting, seats, initial, pageViewId } = start;

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
        initial={initial}
        pageViewId={pageViewId}
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
