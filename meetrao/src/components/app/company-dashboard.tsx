import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { MetricCard } from "@/components/app/metric-card";
import { Card, EmptyState, SectionHeading, TableCard } from "@/components/ui/panels";
import { formatDayLabel, formatTime } from "@/lib/booking/time";
import { cx } from "@/lib/cx";
import type { CompanyDashboard } from "@/lib/data/company-analytics";

/* ─────────────────────────────────────────────────────────────────────────────
   The company's morning screen.

   THE ORDER IS THE ARGUMENT. What is happening now, then what to do about it,
   then who is doing it, then the shape of the last month. Anybody opening
   this at nine o'clock wants the first two and nothing else; the charts are
   for the person asking a question on a Friday afternoon, and they are
   underneath because they are not what the screen is for.

   PEOPLE ARE SORTED BY WHOSE MEETING IS NEXT, which is the question that was
   asked and the only ordering that makes the table readable at a glance. A
   list sorted by volume answers "who is busiest" at the cost of never
   answering "who is on in ten minutes".

   NO CHART LIBRARY. Two bar charts of fixed height, drawn with divs. A
   dependency for forty rectangles is a dependency to upgrade forever.
   ───────────────────────────────────────────────────────────────────────── */

const RANGES = [7, 30, 90] as const;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "29h 30m", or "45m". Minutes are the unit on the wire, never on screen. */
function hours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** The name and the window, for the page's own header bar. */
export function CompanyDashboardHeader({ name, days }: { name: string; days: number }) {
  return (
    <>
      <div className="flex flex-col gap-[3px]">
        <h1 className="m-0 text-[20px] font-semibold text-ink">{name}</h1>
        <span className="text-[13px] text-ink-3">
          Everyone on this company&rsquo;s domain, and what they are booked for.
        </span>
      </div>

      {/* Links rather than a control: the window belongs in the address, so
          somebody can keep the one they read every morning. */}
      <div className="flex gap-[6px]">
        {RANGES.map((d) => (
          <Link
            key={d}
            href={d === 30 ? "/dashboard" : `/dashboard?days=${d}`}
            className={cx(
              "unlink rounded-[6px] border px-[10px] py-[5px] text-[12.5px] font-semibold",
              d === days
                ? "border-accent-line bg-accent-soft text-accent-ink"
                : "border-line bg-surface text-ink-2 hover:bg-fill",
            )}
          >
            {d} days
          </Link>
        ))}
      </div>
    </>
  );
}

export function CompanyDashboard({ data, timezone }: { data: CompanyDashboard; timezone: string }) {
  const now = new Date();
  /* One scale for the bar chart, so a quiet fortnight does not draw itself as
     tall as a busy one. A chart that rescales per column is a chart that
     lies. */
  const peak = Math.max(1, ...data.perDay.map((d) => d.count));
  const hourPeak = Math.max(1, ...data.byHour);
  const weekdayPeak = Math.max(1, ...data.byWeekday);
  /* The first day that has not happened yet, which is today. Falls back to
     the end so the label never lands off the chart. */
  const firstFuture = data.perDay.findIndex((d) => d.future);
  const todayIndex = firstFuture === -1 ? data.perDay.length - 1 : firstFuture - 1;

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[11px]">
        <MetricCard
          icon="calendar"
          tone="accent"
          value={String(data.today.total)}
          label="On today"
          note={
            data.today.total === 0
              ? "Nothing booked today."
              : `${data.today.remaining} still to come · ${hours(data.today.minutes)}`
          }
        />
        <MetricCard
          icon="clock"
          tone="slate"
          value={String(data.next7)}
          label="Next seven days"
          note={data.next7 === 0 ? "The week ahead is empty." : "Booked across everyone."}
        />
        <MetricCard
          icon="check"
          tone="plain"
          value={String(data.window.held)}
          label={`Held in ${data.days} days`}
          note={`${hours(data.window.minutes)} · ${data.window.people} ${
            data.window.people === 1 ? "person" : "people"
          }`}
        />
        <MetricCard
          icon="circle-exclamation"
          tone={data.window.cancelRate >= 0.2 ? "amber" : "plain"}
          value={`${Math.round(data.window.cancelRate * 100)}%`}
          label="Cancelled"
          note={
            data.window.cancelled === 0
              ? "Nothing cancelled."
              : `${data.window.cancelled} of ${data.window.held + data.window.cancelled} booked`
          }
        />
      </div>

      {/* Before the charts, because this is the part somebody can act on and
          a dashboard that only describes is one nobody opens twice. */}
      {data.flags.length > 0 ? (
        <section className="flex flex-col gap-[9px]">
          <SectionHeading title="Worth a look" />
          <Card>
            <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
              {data.flags.map((f, i) => (
                <li key={`${f.kind}-${f.who}-${i}`} className="flex items-start gap-[9px] text-[13px]">
                  <Icon
                    name={f.kind === "no-links" ? "circle-exclamation" : "circle-question"}
                    size={12}
                    className={cx("mt-[3px] flex-none", f.kind === "no-links" ? "text-amber" : "text-ink-3")}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="font-semibold text-ink">{f.who}</span>
                    <span className="text-ink-2"> · {f.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <section className="flex flex-col gap-[9px]">
        <SectionHeading title="Up next" />
        {data.upNext.length === 0 ? (
          <EmptyState
            title="Nothing booked"
            text="When somebody books one of this company's links it appears here, whoever it belongs to."
          />
        ) : (
          <TableCard>
            {data.upNext.map((b) => (
              <div
                key={`${b.memberId}-${b.startsAt}`}
                className="flex flex-wrap items-center gap-[10px] border-b border-line-soft px-[14px] py-[11px] last:border-b-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-ink">{b.meetingName}</span>
                  <span className="block text-[12px] text-ink-3">
                    {b.memberName} · with {b.guestName}
                  </span>
                </span>
                <span className="text-right text-[12.5px] text-ink-2">
                  <span className="block font-semibold text-ink">
                    {formatDayLabel(new Date(b.startsAt), timezone, now)}
                  </span>
                  <span className="block text-ink-3">
                    {formatTime(new Date(b.startsAt), timezone)} · {b.durationMinutes} min
                  </span>
                </span>
              </div>
            ))}
          </TableCard>
        )}
      </section>

      <section className="flex flex-col gap-[9px]">
        <SectionHeading title="People" />
        <TableCard>
          <div className="hidden grid-cols-[1.6fr_1fr_0.7fr_0.7fr_0.7fr] gap-[10px] border-b border-line px-[14px] py-[9px] text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase min-[760px]:grid">
            <span>Person</span>
            <span>Next</span>
            <span className="text-right">Held</span>
            <span className="text-right">Hours</span>
            <span className="text-right">Links</span>
          </div>

          {data.members.map((m) => (
            <div
              key={m.userId}
              className="grid grid-cols-1 gap-[6px] border-b border-line-soft px-[14px] py-[11px] last:border-b-0 min-[760px]:grid-cols-[1.6fr_1fr_0.7fr_0.7fr_0.7fr] min-[760px]:items-center min-[760px]:gap-[10px]"
            >
              <span className="flex flex-wrap items-center gap-[7px]">
                <span className="text-[13px] font-semibold text-ink">{m.name}</span>
                {m.role === "member" ? null : (
                  <Badge tone="ok" dot={false}>
                    {m.role === "owner" ? "Owner" : "Admin"}
                  </Badge>
                )}
                <span className="text-[12px] text-ink-3">/{m.handle}</span>
              </span>

              <span className="text-[12.5px] text-ink-2">
                {m.next ? (
                  <>
                    {formatDayLabel(new Date(m.next.startsAt), timezone, now)}{" "}
                    {formatTime(new Date(m.next.startsAt), timezone)}
                  </>
                ) : (
                  <span className="text-ink-3">Nothing booked</span>
                )}
              </span>

              <span className="text-[12.5px] text-ink-2 min-[760px]:text-right">
                <span className="text-ink-3 min-[760px]:hidden">Held </span>
                {m.held}
                {m.cancelled > 0 ? <span className="text-amber"> · {m.cancelled} off</span> : null}
              </span>
              <span className="text-[12.5px] text-ink-2 min-[760px]:text-right">
                <span className="text-ink-3 min-[760px]:hidden">Hours </span>
                {hours(m.minutes)}
              </span>
              <span className="text-[12.5px] min-[760px]:text-right">
                <span className="text-ink-3 min-[760px]:hidden">Links </span>
                {m.activeLinks === 0 ? (
                  <span className="font-semibold text-amber">None</span>
                ) : (
                  <span className="text-ink-2">{m.activeLinks}</span>
                )}
              </span>
            </div>
          ))}
        </TableCard>
      </section>

      <section className="flex flex-col gap-[9px]">
        <SectionHeading title="Meetings a day" />
        <Card>
          <div className="flex items-end gap-[2px]" style={{ height: 90 }}>
            {/* Lighter ahead of today: those are bookings held, not work
                done, and one fill for both would draw two different facts as
                the same one. */}
            {data.perDay.map((d) => (
              <span
                key={d.key}
                title={`${d.label}: ${d.count}`}
                className={cx(
                  "min-w-[3px] flex-1 rounded-[2px]",
                  d.count === 0 ? "bg-line" : d.future ? "bg-accent-line" : "bg-accent",
                )}
                style={{ height: `${Math.max(d.count === 0 ? 3 : 8, (d.count / peak) * 100)}%` }}
              />
            ))}
          </div>
          {/* "Today" sits over the column it names. The window is not
              symmetrical (a month behind against a fortnight ahead) so a
              label centred by the layout would point at a day in the middle
              of last week. */}
          <div className="relative mt-[7px] h-[14px] text-[11px] text-ink-3">
            <span className="absolute left-0">{data.perDay[0]?.label}</span>
            <span
              className="absolute -translate-x-1/2 font-semibold text-ink-2"
              style={{ left: `${((todayIndex + 0.5) / data.perDay.length) * 100}%` }}
            >
              Today
            </span>
            <span className="absolute right-0">{data.perDay[data.perDay.length - 1]?.label}</span>
          </div>
        </Card>
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[14px]">
        <section className="flex flex-col gap-[9px]">
          <SectionHeading title="What gets booked" />
          <Card>
            {data.byMeeting.length === 0 ? (
              <span className="text-[12.5px] text-ink-3">Nothing held in this window.</span>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
                {data.byMeeting.slice(0, 6).map((m) => (
                  <li key={m.name} className="flex flex-col gap-[4px]">
                    <span className="flex items-baseline justify-between gap-[10px] text-[12.5px]">
                      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-ink">
                        {m.name}
                      </span>
                      <span className="flex-none text-ink-3">
                        {m.count} · {hours(m.minutes)}
                      </span>
                    </span>
                    <span className="h-[5px] overflow-hidden rounded-[3px] bg-fill-2">
                      <span
                        className="block h-full rounded-[3px] bg-accent"
                        style={{ width: `${(m.count / data.byMeeting[0].count) * 100}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section className="flex flex-col gap-[9px]">
          <SectionHeading title="When people book" />
          <Card>
            <span className="mb-[6px] block text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
              By day
            </span>
            <div className="flex items-end gap-[5px]" style={{ height: 52 }}>
              {data.byWeekday.map((n, i) => (
                <span key={WEEKDAYS[i]} className="flex flex-1 flex-col items-center gap-[4px]">
                  <span className="flex w-full flex-1 items-end">
                    <span
                      title={`${WEEKDAYS[i]}: ${n}`}
                      className={cx("w-full rounded-[2px]", n === 0 ? "bg-line" : "bg-accent")}
                      style={{ height: `${Math.max(n === 0 ? 4 : 10, (n / weekdayPeak) * 100)}%` }}
                    />
                  </span>
                  <span className="text-[10px] text-ink-3">{WEEKDAYS[i][0]}</span>
                </span>
              ))}
            </div>

            <span className="mt-[12px] mb-[6px] block text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
              By hour
            </span>
            <div className="flex items-end gap-[2px]" style={{ height: 44 }}>
              {data.byHour.map((n, h) => (
                <span
                  key={h}
                  title={`${String(h).padStart(2, "0")}:00 · ${n}`}
                  className={cx("flex-1 rounded-[2px]", n === 0 ? "bg-line" : "bg-accent")}
                  style={{ height: `${Math.max(n === 0 ? 5 : 12, (n / hourPeak) * 100)}%` }}
                />
              ))}
            </div>
            <div className="mt-[5px] flex justify-between text-[10px] text-ink-3">
              <span>00</span>
              <span>12</span>
              <span>23</span>
            </div>
          </Card>
        </section>
      </div>

      {data.window.medianNoticeHours !== null ? (
        <span className="text-[12px] text-ink-3">
          Typically booked{" "}
          <span className="font-semibold text-ink-2">
            {data.window.medianNoticeHours >= 48
              ? `${Math.round(data.window.medianNoticeHours / 24)} days`
              : `${Math.round(data.window.medianNoticeHours)} hours`}
          </span>{" "}
          ahead, measured across the meetings that were kept. Times are {timezone.replace(/_/g, " ")}.
        </span>
      ) : null}
    </div>
  );
}
