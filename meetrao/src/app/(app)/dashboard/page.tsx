import type { Metadata } from "next";
import Link from "next/link";
import { DashboardScreen } from "@/components/app/app-screen";
import { CompanyDashboard, CompanyDashboardHeader } from "@/components/app/company-dashboard";
import { DashboardHeader } from "@/components/app/dashboard-header";
import { DashboardRows } from "@/components/app/dashboard-rows";
import { CopyLinkControl } from "@/components/app/copy-link";
import { MetricCard } from "@/components/app/metric-card";
import { ButtonLink } from "@/components/ui/button";
import { Callout, EmptyState, SectionHeading } from "@/components/ui/panels";
import { GoogleG } from "@/components/ui/logo";
import { formatTime } from "@/lib/booking/time";
import { listBookings } from "@/lib/data/bookings";
import { requireOnboardedSession } from "@/lib/data/session";
import { activeContext } from "@/lib/data/context";
import { companyAnalytics } from "@/lib/data/company-analytics";
import { timezoneLabel } from "@/lib/timezones";
import { connectionStatus } from "@/lib/google/connection";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { bookingLink } from "@/lib/username";
import type { MeetingType } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

/* Two dashboards behind one address, chosen by the workspace in force.

   A company's dashboard is not this one with a filter on it: the question
   changes from "what am I doing today" to "what is this company doing, and
   who is doing it", and the second has no use for a copy-link control or a
   Google connection notice. */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { profile } = await requireOnboardedSession();
  const context = await activeContext();
  const zone = profile.timezone;

  if (context.companyId) {
    const asked = Number((await searchParams).days);
    const days = asked === 7 || asked === 90 ? asked : 30;
    const data = await companyAnalytics(context.companyId, zone, days);
    return (
      <DashboardScreen header={<CompanyDashboardHeader name={data.companyName} days={data.days} />}>
        <CompanyDashboard data={data} timezone={zone} />
      </DashboardScreen>
    );
  }

  const convex = await convexServer();

  const [bookings, meetingRows, calendar, replyMinutes] = await Promise.all([
    // The dashboard shows what is next; it has never rendered a past booking.
    listBookings(profile.id, zone, { history: false }),
    convex.query(api.meetingTypes.listOwn, {}),
    connectionStatus(profile.id),
    convex.query(api.admin.avgReplyMinutes, { days: 30 }),
  ]);

  /* Personal only: the company dashboard returned above, so anything filed
     under a company is somebody else's screen. Without this the Copy link
     control handed out a company's links from the personal dashboard. */
  const meetings = (meetingRows as unknown as MeetingType[]).filter((m) => !m.company_id);
  const active = meetings.filter((m) => m.is_active);

  const upcoming = bookings.filter((b) => !b.past && !b.cancelled);
  const today = upcoming.filter((b) => b.today);
  const later = upcoming.filter((b) => !b.today);

  const next = today[0] ?? later[0] ?? null;
  const nextStart = next ? new Date(next.startsAt) : null;
  const nextTime = nextStart ? formatTime(nextStart, zone) : null;

  // Avg. Reply time measures link-opened → booked. With nothing recorded yet
  // the card says so rather than showing an invented figure.
  const reply = typeof replyMinutes === "number" ? replyTime(replyMinutes) : null;

  const copyTargets = active.map((m) => ({
    id: m.id,
    name: m.name,
    link: bookingLink(profile.username, m.slug),
  }));

  return (
    <DashboardScreen
      header={
        <DashboardHeader
          firstName={(profile.full_name || profile.username).split(" ")[0]}
          timeZone={zone}
          initialNow={new Date().toISOString()}
        />
      }
      actions={
        <CopyLinkControl meetings={copyTargets} />
      }
    >
      <div className="flex flex-col gap-[24px]">
        {!calendar.connected ? (
          <Callout
            tone="amber"
            align="center"
            action={
              <ButtonLink variant="amber" size={28} href="/api/google/connect?next=/dashboard">
                <GoogleG size={13} />
                Connect
              </ButtonLink>
            }
          >
            <strong className="font-semibold">Google Calendar isn&rsquo;t connected.</strong> Meetrao can&rsquo;t
            check for conflicts or add bookings to your calendar.
          </Callout>
        ) : null}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-[12px]">
          <MetricCard
            icon="calendar"
            tone="accent"
            value={String(upcoming.length)}
            label="Upcoming"
            note={upcoming.length ? `Through ${(later.at(-1) ?? today.at(-1))?.dayLabel}` : "Nothing booked yet"}
            trend={today.length ? `${today.length} today` : undefined}
          />
          <MetricCard
            icon="clock"
            tone="slate"
            value={nextTime ? nextTime.replace(/\s?[AP]M$/, "") : "–"}
            label="Next meeting"
            note={next ? `with ${next.guest}` : "Free for the rest of today"}
            trend={nextTime ? (nextTime.match(/[AP]M$/)?.[0] ?? undefined) : undefined}
          />
          <MetricCard
            icon="list"
            tone="plain"
            value={String(active.length)}
            unit={`of ${meetings.length}`}
            label="Active meetings"
            note="Bookable from your link"
          />
          <MetricCard
            icon="bolt"
            tone="amber"
            value={reply?.value ?? "–"}
            unit={reply?.unit}
            label="Avg. reply time"
            note={reply ? "From link opened to booked" : "No booking-page views recorded yet"}
          />
        </div>

        {today.length ? (
          <section className="flex flex-col gap-[9px]">
            <SectionHeading title="Today" meta={today.length === 1 ? "1 meeting" : `${today.length} meetings`} />
            <DashboardRows rows={today} variant="today" timezoneLabel={timezoneLabel(profile.timezone)} />
          </section>
        ) : null}

        <section className="flex flex-col gap-[9px]">
          <SectionHeading
            title={today.length ? "Later this week" : "Upcoming"}
            right={
              <Link href="/bookings" className="text-[12.5px]">
                View all
              </Link>
            }
          />
          {later.length ? (
            <DashboardRows rows={later} variant="later" timezoneLabel={timezoneLabel(profile.timezone)} />
          ) : upcoming.length === 0 ? (
            /* What is empty is BOOKINGS, not meetings. It said "No upcoming
               meetings" beside a Create meeting button to somebody with two
               meetings already live, which sent them to make a third when
               what they needed was for someone to book the first two. */
            active.length > 0 ? (
              <EmptyState
                title="No upcoming bookings"
                text="Your links are live. Share one and bookings land here."
                action={<CopyLinkControl meetings={copyTargets} />}
              />
            ) : (
              <EmptyState
                title="No upcoming bookings"
                text="Nothing is bookable yet. Create a meeting and its link works straight away."
                action={
                  <ButtonLink variant="accent" size={30} href="/meetings/new" icon="plus">
                    Create meeting
                  </ButtonLink>
                }
              />
            )
          ) : null}
        </section>
      </div>
    </DashboardScreen>
  );
}

/**
 * A reply time in the unit a person would say it in.
 *
 * It was always hours to one decimal, so a booking made within a minute of
 * the page opening read "0.0 hrs", which looks like a broken card rather than
 * a very fast guest.
 */
function replyTime(minutes: number): { value: string; unit: string } {
  if (minutes < 1) return { value: "<1", unit: "min" };
  if (minutes < 60) return { value: String(Math.round(minutes)), unit: "min" };
  if (minutes < 48 * 60) return { value: (minutes / 60).toFixed(1), unit: "hrs" };
  return { value: String(Math.round(minutes / 1440)), unit: "days" };
}
