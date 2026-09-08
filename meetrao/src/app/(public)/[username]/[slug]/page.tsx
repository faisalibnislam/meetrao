import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { Eyebrow } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { bookableDatesInMonth, computeSlots } from "@/lib/booking/slots";
import {
  getBusy,
  getPublicAvailability,
  getPublicHost,
  getPublicMeetings,
} from "@/lib/data/public-booking";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const host = await getPublicHost(username);
  if (!host) return { title: "Not found" };

  const meeting = (await getPublicMeetings(username)).find((m) => m.slug === slug);
  return {
    title: meeting ? `${meeting.name} with ${host.fullName || host.username}` : "Book a time",
    description: meeting?.description || undefined,
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

  const meeting = (await getPublicMeetings(username)).find((m) => m.slug === slug);
  if (!meeting) notFound();

  const availability = await getPublicAvailability(host.id);

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
    ? computeSlots({ ...shared, date: { year, month, day: firstOpen } }).map((d) => d.toISOString())
    : [];

  // Records that the page was opened, which is what "Avg. reply time" measures.
  const { data: pageViewId } = await supabaseAdmin().rpc("record_booking_page_view", {
    p_host_id: host.id,
    p_meeting_type_id: meeting.id,
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
