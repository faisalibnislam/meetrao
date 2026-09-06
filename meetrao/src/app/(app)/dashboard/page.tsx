import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { DashboardGreeting } from "@/components/app/dashboard-header";
import { ConnectCalendarBanner } from "@/components/app/connect-calendar";
import { CopyLinkButton } from "@/components/app/copy-link";
import {
  BookingDialogs,
  LaterRow,
  TodayRow,
} from "@/components/app/booking-rows";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  getBookings,
  getMeetingTypes,
  partitionBookings,
  requireProfile,
} from "@/lib/data/host";
import { toRowData } from "@/lib/data/booking-rows";
import { getConnectionSummary } from "@/lib/google/calendar";
import { bookingLink } from "@/lib/env";
import {
  dateKeyInZone,
  formatLongDate,
  formatTime,
  greetingInZone,
} from "@/lib/booking/time";

export const metadata: Metadata = { title: "Dashboard" };

/* ── Metric card ─────────────────────────────────────────────────────────── */

type Tone = "accent" | "slate" | "plain" | "amber";

const TONES: Record<Tone, { bg: string; border: string; ink: string }> = {
  accent: { bg: "bg-accent-soft", border: "border-accent-line", ink: "text-accent" },
  // The one colour outside the token set, taken verbatim from the source.
  slate: { bg: "bg-[#EAEFF3]", border: "border-[#D3DEE6]", ink: "text-[#2F4C63]" },
  plain: { bg: "bg-fill", border: "border-line", ink: "text-ink-2" },
  amber: { bg: "bg-amber-soft", border: "border-amber-line", ink: "text-amber" },
};

function MetricCard({
  tone,
  glyph,
  value,
  unit,
  label,
  note,
  trend,
}: {
  tone: Tone;
  glyph: IconName;
  value: string;
  unit?: string;
  label: string;
  note: string;
  trend?: string;
}) {
  const c = TONES[tone];
  return (
    <div
      className={`flex min-h-[118px] flex-col gap-[14px] rounded-[10px] border px-[15px] py-[14px] ${c.bg} ${c.border}`}
    >
      <div className="flex items-start justify-between gap-[10px]">
        <span
          className={`inline-flex size-[30px] flex-none items-center justify-center rounded-[8px] bg-surface ${c.ink}`}
        >
          <Icon name={glyph} size={13} />
        </span>
        {trend ? (
          <span
            className={`pt-[4px] font-mono text-[10px] tracking-[0.06em] uppercase ${c.ink}`}
          >
            {trend}
          </span>
        ) : null}
      </div>
      <div className="mt-auto flex flex-col gap-[3px]">
        <div className="flex items-baseline gap-[5px]">
          <span
            className={`text-[26px] leading-none font-semibold tracking-[-0.022em] ${c.ink}`}
          >
            {value}
          </span>
          {unit ? (
            <span className="text-[12.5px] font-medium text-ink-3">{unit}</span>
          ) : null}
        </div>
        <span className="text-[12.5px] font-semibold text-ink">{label}</span>
        <span className="text-[11.5px] leading-[1.4] text-ink-3">{note}</span>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function DashboardPage() {
  const profile = await requireProfile();
  const now = new Date();
  const tz = profile.timezone;

  const [bookings, types, connection] = await Promise.all([
    getBookings(),
    getMeetingTypes(),
    getConnectionSummary(profile.id),
  ]);

  const { upcoming } = partitionBookings(bookings, now);
  const todayKey = dateKeyInZone(now, tz);

  const todayBookings = upcoming.filter(
    (b) => dateKeyInZone(new Date(b.starts_at), tz) === todayKey,
  );
  const laterBookings = upcoming.filter(
    (b) => dateKeyInZone(new Date(b.starts_at), tz) !== todayKey,
  );

  const todayRows = todayBookings.map((b) => toRowData(b, tz, now));
  const laterRows = laterBookings.map((b) => toRowData(b, tz, now));

  const activeTypes = types.filter((t) => t.is_active);
  const firstName = (profile.full_name || profile.username).split(" ")[0];

  // Bookings created in the last 30 days. The design's fourth card was
  // "Avg. reply time — from link opened to booked", which has no data source
  // (the handoff flags the same problem for its show-up rate): Meetrao does not
  // track link opens. This is a real number in the same slot.
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
  const bookedRecently = bookings.filter(
    (b) => new Date(b.created_at) >= thirtyDaysAgo,
  ).length;

  const nextUp = todayRows[0] ?? laterRows[0];
  const initialClock = {
    greeting: greetingInZone(now, tz),
    date: formatLongDate(now, tz),
    time: formatTime(now, tz),
  };

  return (
    <BookingDialogs>
      <PageHeader
        tall
        actions={
          <CopyLinkButton
            allLink={bookingLink(profile.username)}
            targets={activeTypes.map((t) => ({
              id: t.id,
              name: t.name,
              link: bookingLink(profile.username, t.slug),
            }))}
          />
        }
      >
        <DashboardGreeting
          firstName={firstName}
          timezone={tz}
          initial={initialClock}
        />
      </PageHeader>

      <PageBody>
        <div className="flex flex-col gap-[24px]">
          {!connection.connected ? (
            <ConnectCalendarBanner returnTo="/dashboard" />
          ) : null}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-[12px]">
            <MetricCard
              tone="accent"
              glyph="calendar"
              value={String(upcoming.length)}
              label="Upcoming"
              note={
                upcoming.length
                  ? `Through ${laterRows.at(-1)?.dayLabel ?? "today"}`
                  : "Nothing booked yet"
              }
              trend={todayRows.length ? `${todayRows.length} today` : undefined}
            />
            <MetricCard
              tone="slate"
              glyph="clock"
              value={
                nextUp ? nextUp.timeRange.split(" – ")[0].replace(/\s?[AP]M$/, "") : "—"
              }
              label="Next meeting"
              note={nextUp ? `with ${nextUp.guest}` : "Nothing on the books"}
              trend={nextUp ? nextUp.dayLabel : undefined}
            />
            <MetricCard
              tone="plain"
              glyph="list"
              value={String(activeTypes.length)}
              unit={`of ${types.length}`}
              label="Active meetings"
              note="Bookable from your link"
            />
            <MetricCard
              tone="amber"
              glyph="bolt"
              value={String(bookedRecently)}
              label="Booked recently"
              note="New bookings in the last 30 days"
            />
          </div>

          {todayRows.length > 0 ? (
            <section className="flex flex-col gap-[9px]">
              <div className="flex items-baseline gap-[9px]">
                <h2 className="m-0 text-[14.5px] font-semibold text-ink">
                  Today
                </h2>
                <span className="text-[12.5px] text-ink-3">
                  {todayRows.length === 1
                    ? "1 meeting"
                    : `${todayRows.length} meetings`}
                </span>
              </div>
              <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
                {todayRows.map((booking, i) => (
                  <TodayRow key={booking.id} booking={booking} first={i === 0} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-[9px]">
            <div className="flex items-baseline justify-between gap-[12px]">
              <h2 className="m-0 text-[14.5px] font-semibold text-ink">
                {todayRows.length ? "Later this week" : "Upcoming"}
              </h2>
              <Link href="/bookings" className="text-[12.5px]">
                View all
              </Link>
            </div>

            {laterRows.length > 0 ? (
              <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
                {laterRows.map((booking, i) => (
                  <LaterRow key={booking.id} booking={booking} first={i === 0} />
                ))}
              </div>
            ) : null}

            {upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming meetings"
                body="Your scheduled meetings will appear here."
                action={
                  <Link
                    href="/meetings/new"
                    className={buttonClass({ size: "md" })}
                  >
                    <Icon name="plus" size={10} />
                    Create meeting
                  </Link>
                }
              />
            ) : null}
          </section>
        </div>
      </PageBody>
    </BookingDialogs>
  );
}
