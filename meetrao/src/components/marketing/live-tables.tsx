"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/controls";
import { ImageFrame } from "./image-frame";
import { cx } from "@/lib/cx";
import { useMediaQuery } from "@/lib/use-client-value";

/* Live replicas of the Meetings and Bookings screens. They are demonstrations —
   toggling and copying here changes nothing, and the status line says so. */

const MEET_COLS = "minmax(0,2.1fr) 68px minmax(0,1.45fr) 46px 152px";
const BOOK_COLS = "minmax(0,1.5fr) minmax(0,1.05fr) 86px 162px 116px 124px";

const TYPES = [
  ["t1", "30 Minute Consultation", "A quick conversation to discuss your project.", 30, "30-minute-consultation"],
  ["t2", "Project Deep Dive", "Review scope, timeline and budget in detail.", 60, "project-deep-dive"],
  ["t3", "Intro Call", "Fifteen minutes to see if we're a fit.", 15, "intro-call"],
] as const;

/** Guest photo path from the guest's name. The asset filenames are the slugged
    names, so the rows need no extra column — and an accent has to be stripped
    for Tomás to find tomas-rivera.webp. */
function guestPhoto(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `/people/${slug}.webp`;
}

const UPCOMING = [
  ["John Smith", "john@example.com", "30 Minute Consultation", "Today", "3:00 – 3:30 PM", 30, true],
  ["Amina Chowdhury", "amina@northbridge.io", "Project Deep Dive", "Tomorrow", "11:00 – 12:00 PM", 60, true],
  ["Dan Whitfield", "dan@whitfield.dev", "Intro Call", "Mon 7 Sep", "9:30 – 9:45 AM", 15, true],
] as const;

const PAST = [
  ["Priya Nair", "priya@nairstudio.com", "30 Minute Consultation", "2 Sep", "4:00 – 4:30 PM", 30, false],
  ["Tomás Rivera", "tomas@rivera.mx", "Intro Call", "28 Aug", "10:00 – 10:15 AM", 15, null],
] as const;


const TH = "text-[10px] tracking-[0.07em] uppercase whitespace-nowrap text-ink-2";

export function LiveMeetingsTable() {
  const phone = useMediaQuery("(max-width: 640px)");
  const [active, setActive] = useState<Record<string, boolean>>({ t1: true, t2: true, t3: false });
  const [copied, setCopied] = useState("");
  const [hint, setHint] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (id: string, message: string) => {
    clearTimeout(timer.current);
    setCopied(id);
    setHint(message);
    timer.current = setTimeout(() => setCopied(""), 1800);
  };

  return (
    <div className="flex flex-col gap-[8px] pt-[24px]">
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="text-[16px] font-semibold tracking-[-0.008em] text-ink">
          Your meetings, and their links
        </span>
      </div>

      {!phone ? (
        <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
          <div className="scroll-x">
            <div role="table" aria-label="Your meetings" className="min-w-[640px]">
              <div
                role="row"
                className="grid items-center gap-[14px] border-b border-line bg-fill px-[14px] py-[9px]"
                style={{ gridTemplateColumns: MEET_COLS }}
              >
                <span role="columnheader" className={TH}>Meeting</span>
                <span role="columnheader" className={TH}>Duration</span>
                <span role="columnheader" className={TH}>Booking link</span>
                <span role="columnheader" className={TH}>Active</span>
                <span role="columnheader" className={cx(TH, "text-right")} />
              </div>

              {TYPES.map(([id, name, desc, duration, slug], i) => {
                const on = active[id];
                const link = `meetrao.com/adam/${slug}`;
                return (
                  <div
                    key={id}
                    role="row"
                    className={cx(
                      "grid items-center gap-[14px] px-[14px] py-[11px] transition-colors duration-[120ms] hover:bg-fill",
                      i > 0 && "border-t border-line-soft",
                    )}
                    style={{ gridTemplateColumns: MEET_COLS }}
                  >
                    <span role="cell" className="flex min-w-0 flex-col gap-[2px]">
                      <span className={cx("text-[13.5px] font-semibold", on ? "text-ink" : "text-ink-2")}>
                        {name}
                      </span>
                      <span className="text-[12.5px] leading-[1.45] text-pretty text-ink-3">{desc}</span>
                    </span>
                    <span role="cell" className="text-[13px] whitespace-nowrap text-ink">
                      {duration} min
                    </span>
                    <span role="cell" className="min-w-0">
                      <button
                        type="button"
                        title="Copy this link"
                        onClick={() => flash(id, `Copied ${link}`)}
                        className="inline-flex h-[27px] max-w-full cursor-pointer items-center gap-[7px] rounded-[5px] border border-line bg-fill px-[9px] text-[11.5px] text-ink-2 hover:bg-fill-2 hover:text-ink"
                      >
                        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{link}</span>
                        <Icon
                          name={copied === id ? "check" : "copy"}
                          weight={copied === id ? "solid" : "light"}
                          size={10.5}
                          className={cx("flex-none", copied === id ? "text-accent" : "text-ink-3")}
                        />
                      </button>
                    </span>
                    <span role="cell">
                      <Switch
                        checked={on}
                        label={`${on ? "Disable" : "Enable"} ${name}`}
                        onChange={(next) => {
                          setActive((s) => ({ ...s, [id]: next }));
                          flash("", `${next ? "Enabled" : "Disabled"} — ${name}. Nothing was saved; this is a demo.`);
                        }}
                      />
                    </span>
                    <span role="cell" className="flex justify-end gap-[4px] whitespace-nowrap">
                      <Link
                        href="/signup"
                        className="unlink inline-flex h-[27px] items-center rounded-[5px] border border-transparent px-[10px] text-[12px] font-semibold text-ink-2 hover:bg-fill-2 hover:text-ink"
                      >
                        Preview
                      </Link>
                      <Link
                        href="/signup"
                        className="unlink inline-flex h-[27px] items-center rounded-[5px] border border-line-strong bg-surface px-[10px] text-[12px] font-semibold text-ink hover:bg-fill-2 hover:text-ink"
                      >
                        Edit
                      </Link>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {TYPES.map(([id, name, desc, duration, slug]) => {
            const on = active[id];
            const link = `meetrao.com/adam/${slug}`;
            return (
              <div
                key={id}
                className="flex flex-col gap-[11px] rounded-[12px] border border-line bg-surface px-[15px] pt-[14px] pb-[15px]"
              >
                <div className="flex items-start gap-[12px]">
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className={cx("text-[13.5px] font-semibold", on ? "text-ink" : "text-ink-2")}>
                      {name}
                    </span>
                    <span className="text-[12.5px] leading-[1.5] text-pretty text-ink-3">{desc}</span>
                  </div>
                  <Switch
                    checked={on}
                    label={`${on ? "Disable" : "Enable"} ${name}`}
                    onChange={(next) => {
                      setActive((s) => ({ ...s, [id]: next }));
                      flash("", `${next ? "Enabled" : "Disabled"} — ${name}. Nothing was saved; this is a demo.`);
                    }}
                  />
                </div>
                <div className="flex items-center gap-[8px]">
                  <span className="flex-none text-[10px] tracking-[0.07em] text-ink-3 uppercase">
                    Duration
                  </span>
                  <span className="text-[13px] text-ink">{duration} min</span>
                </div>
                <button
                  type="button"
                  onClick={() => flash(id, `Copied ${link}`)}
                  className="box-border flex min-h-[44px] w-full cursor-pointer items-center gap-[9px] rounded-[8px] border border-line bg-fill px-[12px] text-left text-[12px] text-ink-2 hover:bg-fill-2 hover:text-ink"
                >
                  <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{link}</span>
                  <Icon
                    name={copied === id ? "check" : "copy"}
                    weight={copied === id ? "solid" : "light"}
                    size={11}
                    className={cx("flex-none", copied === id ? "text-accent" : "text-ink-3")}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <span
        role="status"
        aria-live="polite"
        className={cx("block min-h-[18px] text-[12px] leading-[1.5]", hint ? "text-accent" : "text-ink-3")}
      >
        {hint || "Toggle a meeting or copy a link — the table is live. Nothing is saved."}
      </span>
    </div>
  );
}

export function LiveBookingsTable() {
  const phone = useMediaQuery("(max-width: 640px)");
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const rows = tab === "upcoming" ? UPCOMING : PAST;

  return (
    <div className="flex flex-col gap-[8px] pt-[24px]">
      <span className="text-[16px] font-semibold tracking-[-0.008em] text-ink">
        Every booking, upcoming and past
      </span>

      <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
        <div className="flex flex-wrap items-end gap-[12px] border-b border-line bg-fill px-[14px]">
          {(
            [
              ["upcoming", "Upcoming", 3],
              ["past", "Past", 2],
            ] as const
          ).map(([key, label, count]) => {
            const on = tab === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => setTab(key)}
                className={cx(
                  "-mb-[1px] inline-flex h-[36px] cursor-pointer items-center gap-[7px] border-0 border-b-2 bg-transparent px-[4px] font-sans text-[13px] font-semibold",
                  on ? "border-ink text-ink" : "border-transparent text-ink-2",
                )}
              >
                <span>{label}</span>
                <span
                  className={cx(
                    "inline-flex h-[17px] min-w-[18px] items-center justify-center rounded-[4px] px-[5px] text-[10.5px] font-semibold",
                    on ? "bg-ink text-white" : "bg-fill-2 text-ink-2",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {!phone ? (
          <div className="scroll-x">
            <div role="table" aria-label="Your bookings" className="min-w-[660px]">
              <div
                role="row"
                className="grid items-center gap-[14px] border-b border-line bg-fill px-[14px] py-[9px]"
                style={{ gridTemplateColumns: BOOK_COLS }}
              >
                <span role="columnheader" className={TH}>Guest</span>
                <span role="columnheader" className={TH}>Meeting</span>
                <span role="columnheader" className={TH}>Date</span>
                <span role="columnheader" className={TH}>Time</span>
                <span role="columnheader" className={TH}>Status</span>
                <span role="columnheader" className={cx(TH, "text-right")} />
              </div>

              {rows.map(([guest, email, type, date, time, duration, joinable], i) => {
                const cancelled = joinable === null;
                return (
                  <div
                    key={guest}
                    role="row"
                    className={cx(
                      "grid items-center gap-[14px] px-[14px] py-[11px] transition-colors duration-[120ms] hover:bg-fill",
                      i > 0 && "border-t border-line-soft",
                    )}
                    style={{ gridTemplateColumns: BOOK_COLS }}
                  >
                    <span role="cell" className="flex min-w-0 items-center gap-[10px]">
                      <ImageFrame
                      label="Guest"
                      avatar
                      src={guestPhoto(guest)}
                      sizes="28px"
                      className="h-[28px] w-[28px] flex-none"
                      rounded="rounded-[7px]"
                    />
                      <span className="flex min-w-0 flex-col gap-[1px]">
                        <span className="overflow-hidden text-[13.5px] font-semibold text-ellipsis whitespace-nowrap text-ink">
                          {guest}
                        </span>
                        <span className="overflow-hidden text-[12px] text-ellipsis whitespace-nowrap text-ink-3">
                          {email}
                        </span>
                      </span>
                    </span>
                    <span role="cell" className="min-w-0 overflow-hidden text-[13px] text-ellipsis whitespace-nowrap text-ink-2">
                      {type}
                    </span>
                    <span role="cell" className="text-[13px] whitespace-nowrap text-ink">
                      {date}
                    </span>
                    <span role="cell" className="text-[13px] whitespace-nowrap text-ink">
                      {time} · {duration}m
                    </span>
                    <span role="cell">
                      <span
                        className={cx(
                          "inline-flex h-[20px] items-center gap-[6px] rounded-[4px] border px-[8px] text-[11.5px] font-semibold whitespace-nowrap",
                          cancelled
                            ? "border-red-line bg-red-soft text-red"
                            : "border-accent-line bg-accent-soft text-accent",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cx("h-[5px] w-[5px] flex-none rounded-full", cancelled ? "bg-red" : "bg-accent")}
                        />
                        {cancelled ? "Cancelled" : "Confirmed"}
                      </span>
                    </span>
                    <span role="cell" className="flex justify-end gap-[4px] whitespace-nowrap">
                      {joinable === true ? (
                        <Link
                          href="/signup"
                          className="unlink inline-flex h-[27px] items-center gap-[6px] rounded-[5px] border border-accent bg-accent px-[10px] text-[12px] font-semibold text-white hover:bg-accent-2 hover:text-white"
                        >
                          <Icon name="video" size={10} />
                          Join
                        </Link>
                      ) : null}
                      <Link
                        href="/signup"
                        className="unlink inline-flex h-[27px] items-center rounded-[5px] border border-transparent px-[10px] text-[12px] font-semibold text-ink-2 hover:bg-fill-2 hover:text-ink"
                      >
                        Details
                      </Link>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {rows.map(([guest, email, type, date, time, , joinable]) => {
              const cancelled = joinable === null;
              return (
                <div key={guest} className="flex flex-col gap-[11px] border-t border-line-soft px-[15px] py-[14px]">
                  <div className="flex items-center gap-[11px]">
                    <ImageFrame
                      label="Guest"
                      avatar
                      src={guestPhoto(guest)}
                      sizes="28px"
                      className="h-[28px] w-[28px] flex-none"
                      rounded="rounded-[7px]"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
                      <span className="overflow-hidden text-[14px] font-semibold text-ellipsis whitespace-nowrap text-ink">
                        {guest}
                      </span>
                      <span className="overflow-hidden text-[12px] text-ellipsis whitespace-nowrap text-ink-3">
                        {email}
                      </span>
                    </span>
                    <span
                      className={cx(
                        "inline-flex h-[20px] items-center gap-[6px] rounded-[4px] border px-[8px] text-[11.5px] font-semibold whitespace-nowrap",
                        cancelled ? "border-red-line bg-red-soft text-red" : "border-accent-line bg-accent-soft text-accent",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cx("h-[5px] w-[5px] flex-none rounded-full", cancelled ? "bg-red" : "bg-accent")}
                      />
                      {cancelled ? "Cancelled" : "Confirmed"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-[5px] rounded-[9px] bg-fill px-[12px] py-[11px]">
                    <span className="text-[13px] font-semibold text-ink">{type}</span>
                    <span className="text-[12.5px] text-ink-2">
                      {date} · {time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
