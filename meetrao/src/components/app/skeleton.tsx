import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Loading skeletons.

   Every app route is dynamic, and Next skips prefetching dynamic routes that
   have no loading boundary — so before these existed a tab click did nothing
   visible at all until the whole server response landed. Measured against a
   stand-in backend at 100ms a hop: 445ms of a completely unchanged screen.
   With a boundary, the first paint lands in single-digit milliseconds.

   Two rules these follow, both about not making the cure worse than the disease:

   1. The real header, not a grey box. Every screen's title and subtitle are
      static strings, so the loading state renders the actual <AppScreen> with
      the actual title. The header never moves when the body swaps in, and the
      user sees the name of the place they are going immediately.

   2. Roughly right, not pixel-perfect. A skeleton that mirrors every card and
      column is a second copy of the screen that silently drifts out of date.
      These match the shape — a row block, a card grid — and no more.
   ───────────────────────────────────────────────────────────────────────────── */

/** One shimmering block. `w` is any CSS width. */
export function Bar({ w = "100%", h = 13, className }: { w?: string | number; h?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("block animate-pulse rounded-[5px] bg-fill-2", className)}
      style={{ width: typeof w === "number" ? `${w}px` : w, height: h }}
    />
  );
}

/**
 * A list of rows — Bookings, Contacts, Notifications, Meetings.
 *
 * `grouped` adds the small day heading the Bookings screen puts above each
 * day's rows, so that screen's skeleton has the same rhythm as its content.
 */
export function RowsSkeleton({ rows = 6, grouped = false }: { rows?: number; grouped?: boolean }) {
  return (
    <div className="flex flex-col gap-[14px]">
      {grouped ? <Bar w={96} h={11} /> : null}
      <div className="overflow-hidden rounded-[9px] border border-line bg-surface">
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className={cx(
              "flex items-center gap-[14px] px-[15px] py-[13px]",
              i > 0 && "border-t border-line-soft",
            )}
          >
            <Bar w={78} h={12} className="flex-none" />
            <span className="flex min-w-0 flex-1 flex-col gap-[6px]">
              <Bar w={`${52 + ((i * 13) % 30)}%`} h={12} />
              <Bar w={`${28 + ((i * 17) % 22)}%`} h={10} />
            </span>
            <Bar w={64} h={20} className="flex-none max-[560px]:hidden" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The tab strip Bookings and a few other screens sit under. */
export function TabsSkeleton({ tabs = 2 }: { tabs?: number }) {
  return (
    <div className="flex gap-[18px] border-b border-line pb-[10px]">
      {Array.from({ length: tabs }, (_, i) => (
        <Bar key={i} w={i === 0 ? 84 : 62} h={13} />
      ))}
    </div>
  );
}

/** A grid of cards — the dashboard's metrics, Availability's schedules. */
export function CardsSkeleton({ count = 4, height = 96, min = 210 }: { count?: number; height?: number; min?: number }) {
  return (
    <div className="grid gap-[12px]" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` }}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex flex-col justify-between rounded-[9px] border border-line bg-surface p-[14px]"
          style={{ height }}
        >
          <Bar w={72} h={10} />
          <Bar w={`${40 + ((i * 19) % 35)}%`} h={22} />
        </div>
      ))}
    </div>
  );
}

/**
 * The whole body of a screen, wrapped so each route's loading.tsx is a couple
 * of lines. Announced politely: a screen reader should hear that something is
 * coming, once, not a stream of shimmer.
 */
export function BodySkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-[15px]">
      <span className="sr-only">Loading</span>
      {children}
    </div>
  );
}
