import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { Eyebrow } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { getPublicTeam, getTeamBusy, getTeamHours, teamOpenDates, teamSlotsForDay } from "@/lib/data/team-booking";
import { PublicFooter } from "@/components/booking/public-footer";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; meeting: string }>;
}): Promise<Metadata> {
  const { slug, meeting } = await params;
  const team = await getPublicTeam(slug);
  const found = team?.meetings.find((m) => m.slug === meeting);
  if (!team || !found) return { title: "Not found" };

  const title = `${found.name} with ${team.name}`;
  return {
    title,
    description: found.description || `Book ${found.name} with the ${team.name} team.`,
    alternates: { canonical: `/team/${team.slug}/${found.slug}` },
  };
}

/**
 * One link, several hosts.
 *
 * The times are the union of everyone's — a slot is offered when at least one
 * member could take it — and who actually takes it is decided by the rotation
 * when the booking is made. Deciding here would mean holding a name in the
 * browser for as long as the guest hesitates, and honouring it afterwards even
 * if that person filled their morning in the meantime.
 */
export default async function TeamBookingPage({
  params,
}: {
  params: Promise<{ slug: string; meeting: string }>;
}) {
  const { slug, meeting: meetingSlug } = await params;

  const team = await getPublicTeam(slug);
  if (!team) notFound();

  const meeting = team.meetings.find((m) => m.slug === meetingSlug);
  if (!meeting) notFound();

  const hours = await getTeamHours(team.slug, meeting.id);
  if (hours.length === 0) notFound();

  /* The first paint is rendered in the FIRST member's zone, because the server
     cannot know the guest's; the client corrects it on mount, exactly as the
     solo page does. */
  const paintZone = hours[0].timezone;
  const now = new Date();
  const [year, month, today] = new Intl.DateTimeFormat("en-CA", {
    timeZone: paintZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number);

  const busy = await getTeamBusy(
    hours,
    new Date(Date.UTC(year, month - 1, 1) - DAY),
    new Date(Date.UTC(year, month, 1) + DAY),
  );

  const openDates = teamOpenDates({ hours, busy, meeting, year, month, guestTimezone: paintZone, now });

  const firstOpen = openDates
    .map((key) => Number(key.slice(8)))
    .filter((d) => d >= today)
    .sort((a, b) => a - b)[0];

  const times = firstOpen
    ? teamSlotsForDay({
        hours,
        busy,
        meeting,
        date: { year, month, day: firstOpen },
        guestTimezone: paintZone,
        now,
      })
    : [];

  return (
    <>
    <div className="m-auto flex w-full max-w-[940px] flex-col gap-[14px]">
      <div className="flex items-center justify-between gap-[12px] px-[2px]">
        <Logo height={20} />
        <Eyebrow size={10.5}>Team booking</Eyebrow>
      </div>

      <BookingFlow
        username={team.slug}
        teamSlug={team.slug}
        slug={meeting.slug}
        hostName={team.name}
        hostAvatarUrl={null}
        hostJobTitle={`${team.members.length} ${team.members.length === 1 ? "person" : "people"} — whoever is free`}
        hostTimezone={paintZone}
        meetingName={meeting.name}
        meetingDescription={meeting.description}
        durationMinutes={meeting.durationMinutes}
        bookingWindowDays={meeting.rules.bookingWindowDays}
        questions={meeting.questions}
        location={meeting.location}
        locationDetail={meeting.locationDetail}
        initial={{ year, month, openDates, day: firstOpen ?? null, times, timezone: paintZone }}
        pageViewId={null}
      />
    </div>
      <PublicFooter />
    </>
  );
}
