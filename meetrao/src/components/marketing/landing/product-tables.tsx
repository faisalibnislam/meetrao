"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { Eyebrow } from "./eyebrow";

/**
 * The Meetings and Bookings tables, live rather than screenshotted: the Active
 * switches toggle, the copy chips flash a check, and the Upcoming/Past tabs
 * work. A role="status" line reports what happened *and* that nothing was
 * saved — this is a marketing page, not the product.
 *
 * Below 640px each table is *replaced* by a card list rather than restyled or
 * put in a horizontal scroller. A scrolled table is usable but not good.
 */
type MeetingRow = { id: string; name: string; duration: string; slug: string };

const MEETINGS: MeetingRow[] = [
  { id: "t1", name: "30 Minute Consultation", duration: "30 min", slug: "30-minute-consultation" },
  { id: "t2", name: "Project Deep Dive", duration: "60 min", slug: "project-deep-dive" },
  { id: "t3", name: "Intro Call", duration: "15 min", slug: "intro-call" },
];

type BookingRow = {
  id: string;
  guest: string;
  initials: string;
  date: string;
  time: string;
  status: "confirmed" | "cancelled";
  past?: boolean;
};

const BOOKINGS: BookingRow[] = [
  { id: "b1", guest: "John Smith", initials: "JS", date: "Mon 7 Sept", time: "10:00 – 10:30", status: "confirmed" },
  { id: "b2", guest: "Priya Nair", initials: "PN", date: "Tue 8 Sept", time: "14:00 – 15:00", status: "confirmed" },
  { id: "b3", guest: "Tomas Rivera", initials: "TR", date: "Thu 10 Sept", time: "09:30 – 09:45", status: "confirmed" },
  { id: "b4", guest: "Amara Okafor", initials: "AO", date: "Wed 2 Sept", time: "11:00 – 11:30", status: "confirmed", past: true },
  { id: "b5", guest: "Lena Fischer", initials: "LF", date: "Mon 31 Aug", time: "16:00 – 16:30", status: "cancelled", past: true },
];

export function ProductTables() {
  const [active, setActive] = useState<Record<string, boolean>>({
    t1: true,
    t2: true,
    t3: false,
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [note, setNote] = useState("");

  const toggle = (row: MeetingRow) => {
    const next = !active[row.id];
    setActive((prev) => ({ ...prev, [row.id]: next }));
    setNote(
      `${row.name} is now ${next ? "active" : "inactive"} — preview only, nothing was saved.`,
    );
  };

  const copy = (row: MeetingRow) => {
    setCopied(row.id);
    setNote(`Copied meetrao.com/adam/${row.slug} — preview only, nothing was saved.`);
    window.setTimeout(() => setCopied(null), 1800);
  };

  const rows = BOOKINGS.filter((b) => (tab === "past" ? b.past : !b.past));

  return (
    <section id="product" className="border-t border-line bg-ground">
      <div className="mx-auto max-w-[1200px] px-[18px] py-[64px] sm:px-[26px]">
        <div className="flex max-w-[660px] flex-col gap-[11px]">
          <Eyebrow>What you get</Eyebrow>
          <h2 className="m-0 font-serif text-[clamp(28px,3.6vw,44px)] leading-[1.04] font-normal tracking-[-0.02em] text-ink text-balance">
            Scheduling that respects the calendar you already keep.
          </h2>
        </div>

        <p role="status" className="mt-[14px] min-h-[18px] text-[12.5px] text-ink-3">
          {note}
        </p>

        {/* ── Meetings ─────────────────────────────────────────────────── */}
        <div className="mt-[10px] overflow-hidden rounded-[14px] border border-line bg-surface">
          <div className="border-b border-line px-[18px] py-[14px]">
            <span className="text-[14px] font-semibold text-ink">
              Your meetings, and their links
            </span>
          </div>

          {/* Table at >=640px. role="table" on a grid, not <table>. */}
          <div role="table" className="hidden min-[640px]:block">
            <div
              role="row"
              className="grid items-center gap-[12px] border-b border-line-soft bg-fill px-[18px] py-[10px] [grid-template-columns:minmax(0,1.6fr)_84px_minmax(0,1.4fr)_74px]"
            >
              {["Meeting", "Duration", "Booking link", "Active"].map((h) => (
                <span
                  key={h}
                  role="columnheader"
                  className="font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase"
                >
                  {h}
                </span>
              ))}
            </div>
            {MEETINGS.map((row) => (
              <div
                key={row.id}
                role="row"
                className="grid items-center gap-[12px] border-b border-line-soft px-[18px] py-[12px] last:border-b-0 [grid-template-columns:minmax(0,1.6fr)_84px_minmax(0,1.4fr)_74px]"
              >
                <span role="cell" className="truncate text-[13.5px] font-medium text-ink">
                  {row.name}
                </span>
                <span role="cell" className="font-mono text-[12.5px] text-ink-2">
                  {row.duration}
                </span>
                <span role="cell" className="min-w-0">
                  <button
                    type="button"
                    onClick={() => copy(row)}
                    className="inline-flex h-[28px] max-w-full cursor-pointer items-center gap-[7px] rounded-[6px] border border-line-strong bg-surface px-[9px] hover:bg-fill"
                  >
                    <Icon
                      name={copied === row.id ? "check" : "copy"}
                      weight={copied === row.id ? 900 : 300}
                      size={11}
                      className={copied === row.id ? "text-accent" : "text-ink-3"}
                    />
                    <span className="truncate font-mono text-[11.5px] text-ink-2">
                      /{row.slug}
                    </span>
                  </button>
                </span>
                <span role="cell">
                  <Switch
                    on={active[row.id]}
                    onToggle={() => toggle(row)}
                    label={`${row.name} active`}
                  />
                </span>
              </div>
            ))}
          </div>

          {/* Card list below 640px. */}
          <div className="min-[640px]:hidden">
            {MEETINGS.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-[9px] border-b border-line-soft px-[16px] py-[13px] last:border-b-0"
              >
                <div className="flex items-start justify-between gap-[12px]">
                  <span className="text-[13.5px] font-medium text-ink">{row.name}</span>
                  <Switch
                    on={active[row.id]}
                    onToggle={() => toggle(row)}
                    label={`${row.name} active`}
                  />
                </div>
                <span className="font-mono text-[12px] text-ink-3">{row.duration}</span>
                <button
                  type="button"
                  onClick={() => copy(row)}
                  className="inline-flex h-[44px] w-full cursor-pointer items-center gap-[8px] rounded-[8px] border border-line-strong bg-surface px-[12px]"
                >
                  <Icon
                    name={copied === row.id ? "check" : "copy"}
                    weight={copied === row.id ? 900 : 300}
                    size={12}
                    className={copied === row.id ? "text-accent" : "text-ink-3"}
                  />
                  <span className="truncate font-mono text-[12px] text-ink-2">
                    /{row.slug}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bookings ─────────────────────────────────────────────────── */}
        <div className="mt-[18px] overflow-hidden rounded-[14px] border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-[12px] border-b border-line px-[18px] py-[14px]">
            <span className="text-[14px] font-semibold text-ink">
              Every booking, upcoming and past
            </span>
            <div className="flex gap-[4px]" role="tablist" aria-label="Bookings">
              {(["upcoming", "past"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "h-[44px] cursor-pointer rounded-[6px] border px-[12px] text-[12.5px] font-semibold capitalize sm:h-[30px]",
                    tab === key
                      ? "border-line bg-fill-2 text-ink"
                      : "border-transparent bg-transparent text-ink-3 hover:text-ink",
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          <div role="table" className="hidden min-[640px]:block">
            <div
              role="row"
              className="grid items-center gap-[12px] border-b border-line-soft bg-fill px-[18px] py-[10px] [grid-template-columns:minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_96px]"
            >
              {["Guest", "Date", "Time", "Status"].map((h) => (
                <span
                  key={h}
                  role="columnheader"
                  className="font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase"
                >
                  {h}
                </span>
              ))}
            </div>
            {rows.map((row) => (
              <div
                key={row.id}
                role="row"
                className="grid items-center gap-[12px] border-b border-line-soft px-[18px] py-[12px] last:border-b-0 [grid-template-columns:minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_96px]"
              >
                <span role="cell" className="flex min-w-0 items-center gap-[9px]">
                  <span className="inline-flex size-[26px] flex-none items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                    {row.initials}
                  </span>
                  <span className="truncate text-[13.5px] text-ink">{row.guest}</span>
                </span>
                <span role="cell" className="text-[12.5px] text-ink-2">{row.date}</span>
                <span role="cell" className="font-mono text-[12px] text-ink-2">{row.time}</span>
                <span role="cell">
                  <StatusBadge status={row.status} />
                </span>
              </div>
            ))}
          </div>

          <div className="min-[640px]:hidden">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-[11px] border-b border-line-soft px-[16px] py-[13px] last:border-b-0"
              >
                <span className="inline-flex size-[34px] flex-none items-center justify-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">
                  {row.initials}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="truncate text-[13.5px] text-ink">{row.guest}</span>
                  <span className="truncate text-[12px] text-ink-3">
                    {row.date} · <span className="font-mono">{row.time}</span>
                  </span>
                </div>
                <StatusBadge status={row.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: "confirmed" | "cancelled" }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] flex-none items-center rounded-[5px] border px-[8px] text-[11.5px] font-semibold capitalize",
        status === "confirmed"
          ? "border-accent-line bg-accent-soft text-accent"
          : "border-red-line bg-red-soft text-red-ink",
      )}
    >
      {status}
    </span>
  );
}

/**
 * 34x20px switch inside a 44px tap wrapper. The switch keeps its designed size;
 * the hit area is what grows for touch.
 */
function Switch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className="inline-flex size-[44px] cursor-pointer items-center justify-center rounded-[8px] border border-transparent bg-transparent"
    >
      <span
        className={cn(
          "relative block h-[20px] w-[34px] flex-none rounded-full transition-colors duration-[140ms]",
          on ? "bg-accent" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] size-[16px] rounded-full bg-white transition-[left] duration-[140ms]",
            on ? "left-[16px]" : "left-[2px]",
          )}
        />
      </span>
    </button>
  );
}
