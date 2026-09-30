import type { Metadata } from "next";
import Link from "next/link";
import { DashboardScreen } from "@/components/app/app-screen";
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
import { timezoneLabel } from "@/lib/timezones";
import { connectionStatus } from "@/lib/google/connection";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { bookingLink } from "@/lib/username";
import type { MeetingType } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { profile } = await requireOnboardedSession();
  const convex = await convexServer();
  const zone = profile.timezone;

  const [bookings, meetingRows, calendar, replyMinutes] = await Promise.all([
    // The dashboard shows what is next; it has never rendered a past booking.
    listBookings(profile.id, zone, { history: false }),
    convex.query(api.meetingTypes.listOwn, {}),
    connectionStatus(profile.id),
    convex.query(api.admin.avgReplyMinutes, { days: 30 }),
  ]);

  const meetings = meetingRows as unknown as MeetingType[];
  const active = meetings.filter((m) => m.is_active);

  const upcoming = bookings.filter((b) => !b.past && !b.cancelled);
  const today = upcoming.filter((b) => b.today);
  const later = upcoming.filter((b) => !b.today);

  const next = today[0] ?? later[0] ?? null;
  const nextStart = next ? new Date(next.startsAt) : null;
  const nextTime = nextStart ? formatTime(nextStart, zone) : null;

  // Avg. reply time measures link-opened → booked. With nothing recorded yet
  // the card says so rather than showing an invented figure.
  const hours = typeof replyMinutes === "number" ? (replyMinutes / 60).toFixed(1) : null;

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
        <CopyLinkControl
          accountLink={bookingLink(profile.username)}
          meetings={active.map((m) => ({
            id: m.id,
            name: m.name,
            link: bookingLink(profile.username, m.slug),
          }))}
        />
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
            value={nextTime ? nextTime.replace(/\s?[AP]M$/, "") : "—"}
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
            value={hours ?? "—"}
            unit={hours ? "hrs" : undefined}
            label="Avg. reply time"
            note={hours ? "From link opened to booked" : "No booking-page views recorded yet"}
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
            <EmptyState
              title="No upcoming meetings"
              text="Your scheduled meetings will appear here."
              action={
                <ButtonLink variant="accent" size={30} href="/meetings/new" icon="plus">
                  Create meeting
                </ButtonLink>
              }
            />
          ) : null}
        </section>
      </div>
    </DashboardScreen>
  );
}
