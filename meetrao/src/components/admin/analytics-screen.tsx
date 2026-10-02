import Link from "next/link";
import { Card, EmptyState, SectionHeading } from "@/components/ui/panels";
import { Eyebrow } from "@/components/ui/badge";
import { cx } from "@/lib/cx";
import { RANGES, type DailyPoint, type Range, type SiteAnalytics, type TopRow } from "@/lib/data/analytics";

/* ─────────────────────────────────────────────────────────────────────────────
   The analytics screen.

   Hand-drawn SVG rather than a charting library, for the same reason the icon
   set is hand-drawn: this app has no UI dependencies, and a chart library is
   ~60KB of JavaScript shipped to a browser to draw eleven rectangles that the
   server already knows the positions of. Everything here renders on the server
   and ships as markup.

   One rule the charts follow, and it is the only rule that matters in a
   dashboard someone will make decisions from: nothing is drawn that the data
   does not support. A day with no visits is a gap at zero, not a line
   interpolated between its neighbours. A list with two entries is two rows, not
   two rows padded to look like eight. An empty range says it is empty.
   ───────────────────────────────────────────────────────────────────────────── */

export function AnalyticsScreen({ data }: { data: SiteAnalytics }) {
  const empty = data.visits === 0 && data.visitsPrev === 0 && data.bots === 0;

  return (
    <div className="flex flex-col gap-[22px]">
      <RangeTabs current={data.range} />

      {empty ? (
        <EmptyState
          title="No visits recorded yet"
          text="The counter is live on every public page. Numbers appear here as soon as somebody opens one. There is nothing to configure."
        />
      ) : (
        <>
          <Headline data={data} />
          <VisitsSection data={data} />

          <div className="grid grid-cols-2 gap-[18px] max-[820px]:grid-cols-1">
            <TopList title="Countries" rows={data.topCountries} meta={`${data.countries} in this period`} />
            <TopList title="Pages" rows={data.topPages} />
            <TopList
              title="Traffic sources"
              rows={data.topReferrers}
              meta="Where visitors arrived from"
              unknownLabel="Direct or bookmarked"
            />
            <TopList title="Devices" rows={data.devices} />
            <TopList title="Browsers" rows={data.browsers} />
            <TopList title="Operating systems" rows={data.systems} />
          </div>

          <p className="m-0 max-w-[620px] text-[12px] leading-[1.6] text-ink-3">
            Counted without cookies: no identifier is stored on a visitor&rsquo;s device and no IP address is kept.
            Visitors are counted per day, so the same person on two days is two visitors. The figures do not follow
            anybody across the period. Crawlers are excluded from every number above except the bot count. Rows are
            deleted after 400 days.
          </p>
        </>
      )}
    </div>
  );
}

/* ── range ─────────────────────────────────────────────────────────────────── */

/* Links, not buttons: the data is fetched on the server, so the range belongs in
   the URL, which also means a range can be bookmarked and the back button
   does what it looks like it should. */
function RangeTabs({ current }: { current: Range }) {
  return (
    <div className="flex gap-[2px] border-b border-line" role="tablist" aria-label="Period">
      {RANGES.map((days) => {
        const on = days === current;
        return (
          <Link
            key={days}
            href={`/admin/analytics?days=${days}`}
            role="tab"
            aria-selected={on}
            scroll={false}
            className={cx(
              "unlink -mb-[1px] inline-flex h-[34px] items-center border-0 border-b-2 px-[12px] text-[13.5px] font-semibold no-underline",
              on ? "border-ink text-ink" : "border-transparent text-ink-2",
            )}
          >
            {days} days
          </Link>
        );
      })}
    </div>
  );
}

/* ── headline numbers ──────────────────────────────────────────────────────── */

function Headline({ data }: { data: SiteAnalytics }) {
  const cells = [
    { value: data.visits, label: "Page views", change: change(data.visits, data.visitsPrev) },
    { value: data.visitors, label: "Visitors", change: change(data.visitors, data.visitorsPrev) },
    { value: data.countries, label: "Countries", change: null },
    { value: data.bots, label: "Crawlers", change: null },
  ];

  /* The dividers are the grid's own 1px gaps showing the container colour
     through, not borders on the cells. An auto-fit grid rewraps (four across,
     then two by two, then one) and a "border-left on every cell but the first"
     rule draws a stray line at the start of each new row when it does. A gap
     cannot be in the wrong place. */
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(148px,1fr))] gap-[1px] overflow-hidden rounded-[8px] border border-line bg-line-soft">
      {cells.map((cell) => (
        <div key={cell.label} className="flex flex-col gap-[4px] bg-surface px-[15px] py-[13px]">
          <span className="flex items-baseline gap-[8px]">
            <span className="text-[20px] leading-[1.1] font-semibold tracking-[-0.015em] text-ink">
              {cell.value.toLocaleString("en-US")}
            </span>
            {cell.change ? (
              <span
                className={cx(
                  "text-[11.5px] font-semibold",
                  cell.change.up ? "text-accent-ink" : cell.change.flat ? "text-ink-3" : "text-red",
                )}
              >
                {cell.change.text}
              </span>
            ) : null}
          </span>
          <Eyebrow>{cell.label}</Eyebrow>
        </div>
      ))}
    </div>
  );
}

/**
 * Change against the same span immediately before this one.
 *
 * Returns null when there is nothing to compare, zero to zero is not "0%", and
 * zero to something is not "+∞%". Both of those render as a word.
 */
function change(now: number, before: number): { text: string; up: boolean; flat: boolean } | null {
  if (before === 0) return now === 0 ? null : { text: "new", up: true, flat: false };
  if (now === before) return { text: "no change", up: false, flat: true };
  const pct = Math.round(((now - before) / before) * 100);
  return { text: `${pct > 0 ? "+" : ""}${pct}%`, up: pct > 0, flat: false };
}

/* ── the chart ─────────────────────────────────────────────────────────────── */

function VisitsSection({ data }: { data: SiteAnalytics }) {
  return (
    <section className="flex flex-col gap-[9px]">
      <SectionHeading
        title="Over time"
        right={
          <span className="flex items-center gap-[14px] text-[11.5px] text-ink-3">
            <Key className="bg-accent">Visitors</Key>
            <Key className="bg-accent-line">Repeat views</Key>
          </span>
        }
      />
      <Card className="p-[14px_12px_10px]">
        <VisitsChart points={data.daily} />
      </Card>
    </section>
  );
}

function Key({ className, children }: { className: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-[5px]">
      <span aria-hidden="true" className={cx("inline-block h-[9px] w-[9px] flex-none rounded-[2px]", className)} />
      {children}
    </span>
  );
}

/* The viewBox is fixed and the element is fluid: one drawing, scaled by the
   browser, so there is no measuring on the client and nothing to re-render on
   resize. `vector-effect: non-scaling-stroke` keeps hairlines at 1 device pixel
   at every width, which is the one thing scaling would otherwise ruin. */
const W = 720;
const H = 188;
const PAD = { left: 32, right: 4, top: 10, bottom: 22 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function VisitsChart({ points }: { points: DailyPoint[] }) {
  if (points.length === 0) {
    return <p className="m-0 px-[4px] py-[24px] text-center text-[12.5px] text-ink-3">No days in this range.</p>;
  }

  const peak = Math.max(...points.map((p) => p.visits));
  const top = niceCeil(peak);
  const step = PLOT_W / points.length;
  /* A gap between bars only when there is room for one. At 90 days each bar is
     under 8px wide, and a 2px gap there eats a quarter of the bar. */
  const gap = step > 6 ? 2 : step > 3 ? 1 : 0;
  const barW = Math.max(1, step - gap);
  const y = (value: number) => PAD.top + PLOT_H - (value / top) * PLOT_H;

  const busiest = points.reduce((best, p) => (p.visits > best.visits ? p : best), points[0]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-auto w-full"
      role="img"
      aria-label={
        `Page views per day over ${points.length} days. ` +
        (peak === 0
          ? "No views in this period."
          : `Busiest day ${dayLabel(busiest.day)} with ${busiest.visits} views from ${busiest.visitors} visitors.`)
      }
    >
      {/* Gridlines at 0, half and the top of the scale, each with its value. */}
      {[0, top / 2, top].map((value) => (
        <g key={value}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(value)}
            y2={y(value)}
            className={value === 0 ? "stroke-line-strong" : "stroke-line-soft"}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <text x={PAD.left - 7} y={y(value) + 3.5} textAnchor="end" className="fill-ink-3 text-[10px]">
            {value.toLocaleString("en-US")}
          </text>
        </g>
      ))}

      {points.map((point, i) => {
        const x = PAD.left + i * step + gap / 2;
        return (
          <g key={point.day}>
            {/* Total views, then the visitor count drawn over it from the same
                baseline. Visitors can never exceed views, so the dark bar is
                always inside the light one and the light remainder reads as
                "the same people coming back". */}
            {point.visits > 0 ? (
              <rect x={x} y={y(point.visits)} width={barW} height={y(0) - y(point.visits)} className="fill-accent-line" />
            ) : null}
            {point.visitors > 0 ? (
              <rect
                x={x}
                y={y(point.visitors)}
                width={barW}
                height={y(0) - y(point.visitors)}
                className="fill-accent"
              />
            ) : null}
          </g>
        );
      })}

      {/* First, middle and last day only. Ninety labels is a smudge. */}
      {axisDays(points).map(({ index, label }) => (
        <text
          key={index}
          x={PAD.left + index * step + step / 2}
          y={H - 6}
          textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
          className="fill-ink-3 text-[10px]"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

/* Multiples of a power of ten that make a readable top-of-scale. Every one of
   them is even once scaled, which matters because the chart labels the
   half-way gridline: a top of 75 would print "37.5". */
const NICE = [1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.6, 4, 4.4, 5, 6, 7, 8, 9, 10];

/**
 * The top of the vertical scale: the smallest round number at or above the
 * peak. 3 → 4, 9 → 10, 61 → 80, 305 → 320.
 *
 * Kept tight on purpose. Rounding 61 up to 100, which a coarser ladder does,
 * spends two fifths of the chart's height on empty space and flattens every bar
 * in it, which is a graph that under-reports its own subject.
 */
function niceCeil(peak: number): number {
  if (peak <= 4) return 4;
  if (peak <= 10) return Math.ceil(peak / 2) * 2;
  const magnitude = 10 ** Math.floor(Math.log10(peak));
  for (const multiple of NICE) {
    const candidate = Math.round(magnitude * multiple);
    if (candidate >= peak) return candidate;
  }
  return magnitude * 10;
}

function axisDays(points: DailyPoint[]): { index: number; label: string }[] {
  const indexes = points.length < 4 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  return [...new Set(indexes)].map((index) => ({ index, label: dayLabel(points[index].day) }));
}

/* The day arrives as "2026-09-12" and is a UTC calendar date, not an instant.
   Parsing it with `new Date()` and formatting in the reader's zone shifts it a
   day for anyone west of Greenwich, so it is split by hand instead. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayLabel(day: string): string {
  const [, month, date] = day.split("-");
  const index = Number(month) - 1;
  return MONTHS[index] ? `${Number(date)} ${MONTHS[index]}` : day;
}

/* ── the lists ─────────────────────────────────────────────────────────────── */

function TopList({
  title,
  rows,
  meta,
  unknownLabel,
}: {
  title: string;
  rows: TopRow[];
  meta?: string;
  /** What "Unknown" means for this dimension, when it means something specific. */
  unknownLabel?: string;
}) {
  const peak = Math.max(1, ...rows.map((r) => r.visits));

  return (
    <section className="flex min-w-0 flex-col gap-[9px]">
      <SectionHeading title={title} meta={meta} />
      <Card>
        {rows.length === 0 ? (
          <div className="px-[15px] py-[14px] text-[13px] text-ink-3">Nothing recorded in this period.</div>
        ) : (
          rows.map((row, i) => (
            <div
              key={row.label}
              className={cx("relative flex items-center gap-[12px] px-[15px] py-[10px]", i > 0 && "border-t border-line-soft")}
            >
              {/* The bar is behind the text rather than beside it, so a long
                  path or a long country name has the full width of the card and
                  does not have to be truncated to make room for a chart. */}
              <span
                aria-hidden="true"
                className="absolute inset-y-[4px] left-[6px] rounded-[4px] bg-accent-soft"
                style={{ width: `calc((100% - 12px) * ${(row.visits / peak).toFixed(4)})` }}
              />
              <span className="relative min-w-0 flex-1 truncate text-[13px] text-ink" title={row.label}>
                {unknownLabel && row.label === "Unknown" ? unknownLabel : row.label}
              </span>
              <span className="relative flex-none text-[13px] font-semibold text-ink tabular-nums">
                {row.visits.toLocaleString("en-US")}
              </span>
            </div>
          ))
        )}
      </Card>
    </section>
  );
}
