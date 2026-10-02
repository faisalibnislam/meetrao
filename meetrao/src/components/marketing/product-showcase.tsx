"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   The product section's lead: four things it does, shown rather than listed.

   WHAT THIS REPLACED, AND WHY. Two stacked grids of sixteen identical cards,
   icon chip, bold line, sentence, sixteen times, across two headings that
   split them for no reason a reader could see. Every card had the same weight,
   so nothing led; it was a wall to scroll past rather than something to read,
   and at no point did it show the product it was describing.

   Four panels carry the features that are worth seeing move. The rest did not
   get deleted. They sit under this in one dense list, which is the right
   shape for "and all of these too". A feature a reader has to be SOLD is not
   the same as one they need to find, and the old section treated them alike.

   NO SCREENSHOTS. These are built from the same tokens as the real screens, so
   they cannot go stale the way a PNG does, they stay sharp at any density, and
   (the part that matters here) they re-colour with the rest of the page.

   The rotation stops on hover, on focus, and for anybody who has asked their
   system for less motion. A panel that keeps moving while you are reading it
   is worse than a static one.
   ───────────────────────────────────────────────────────────────────────────── */

const DWELL = 5200;

type Panel = {
  key: string;
  icon: IconName;
  title: string;
  text: string;
  render: (active: boolean) => React.ReactNode;
};

const PANELS: Panel[] = [
  {
    key: "conflicts",
    icon: "calendar",
    title: "Never double-book",
    text: "Your calendar is checked before a time is offered, so what a guest sees is what is genuinely free.",
    render: (active) => <ConflictsPanel active={active} />,
  },
  {
    key: "reminders",
    icon: "bolt",
    title: "Reminders that arrive",
    text: "The day before and an hour before, to both of you. On Pro you choose when they land.",
    render: (active) => <RemindersPanel active={active} />,
  },
  {
    key: "team",
    icon: "users",
    title: "One link for a team",
    text: "Bookings go to whoever is free and least recently booked. Everyone keeps their own hours.",
    render: (active) => <TeamPanel active={active} />,
  },
  {
    key: "brand",
    icon: "palette",
    title: "Your logo, your colours",
    text: "Your mark instead of ours, an accent and a page background. None of our palette is left.",
    render: (active) => <BrandPanel active={active} />,
  },
];

export function ProductShowcase() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const holding = useRef(false);

  useEffect(() => {
    if (paused) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setTimeout(() => setIndex((n) => (n + 1) % PANELS.length), DWELL);
    return () => window.clearTimeout(id);
    // `index` is a dependency so each panel gets its own full dwell.
  }, [index, paused]);

  return (
    <div
      className="grid grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] gap-[20px] max-[900px]:grid-cols-[1fr]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        if (!holding.current) setPaused(false);
      }}
    >
      {/* The four, as a list you can also just read. */}
      <div className="flex flex-col gap-[6px]">
        {PANELS.map((panel, i) => {
          const on = i === index;
          return (
            <button
              key={panel.key}
              type="button"
              aria-pressed={on}
              onClick={() => setIndex(i)}
              onFocus={() => {
                holding.current = true;
                setPaused(true);
                setIndex(i);
              }}
              onBlur={() => {
                holding.current = false;
                setPaused(false);
              }}
              className={cx(
                "group relative flex cursor-pointer flex-col gap-[5px] rounded-[12px] border px-[17px] pt-[14px] pb-[15px] text-left",
                "transition-[background-color,border-color] duration-[160ms]",
                on ? "border-accent-line bg-accent-soft" : "border-transparent bg-transparent hover:bg-fill",
              )}
            >
              <span className="flex items-center gap-[9px]">
                <Icon
                  name={panel.icon}
                  size={13}
                  className={cx("flex-none", on ? "text-accent-ink" : "text-ink-3")}
                />
                <span className="text-[14px] font-semibold tracking-[-0.005em] text-ink">{panel.title}</span>
              </span>

              {/* Only the open one carries its sentence: four sentences at once
                  is the wall this section exists to get rid of. */}
              <span
                className={cx(
                  "grid text-[13px] leading-[1.55] text-pretty text-ink-2",
                  "transition-[grid-template-rows,opacity] duration-[220ms] ease-[ease]",
                  on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <span className="min-h-0 overflow-hidden">{panel.text}</span>
              </span>

              {/* How long this one has left. Hidden while paused, because a bar
                  that is not counting down should not look like one. */}
              <span
                aria-hidden="true"
                className={cx(
                  "absolute right-[17px] bottom-[7px] left-[17px] h-[2px] overflow-hidden rounded-full bg-accent-line",
                  on && !paused ? "opacity-100" : "opacity-0",
                )}
              >
                <span
                  key={`${index}-${paused}`}
                  className="mr-tick block h-full w-full origin-left bg-accent"
                  style={{ animationDuration: `${DWELL}ms` }}
                />
              </span>
            </button>
          );
        })}
      </div>

      {/* The stage. Dark, so the white cards inside it read as the product
          sitting on something rather than as more page. One fixed height, so
          switching panels does not move the page under the reader's cursor.

          EVERYTHING INSIDE IS TUNED FOR THIS GROUND. The panels below use
          white surfaces and white-alpha text, not --ink and --fill, because
          those are the light-ground tokens and they vanish here. */}
      <div className="relative min-h-[320px] overflow-hidden rounded-[16px] bg-accent-2 p-[18px] max-[900px]:min-h-[290px]">
        {PANELS.map((panel, i) => (
          <div
            key={panel.key}
            aria-hidden={i !== index}
            className={cx(
              "absolute inset-0 flex items-center justify-center p-[18px]",
              "transition-opacity duration-[320ms] ease-[ease]",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {panel.render(i === index)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── The four stages ──────────────────────────────────────────────────────── */

/** A week of slots, with the ones your calendar already owns falling away. */
function ConflictsPanel({ active }: { active: boolean }) {
  const SLOTS = [
    { time: "09:00", busy: false },
    { time: "09:45", busy: true },
    { time: "10:30", busy: true },
    { time: "11:15", busy: false },
    { time: "13:00", busy: false },
    { time: "13:45", busy: true },
    { time: "14:30", busy: false },
    { time: "15:15", busy: false },
  ];

  return (
    <div className="flex w-full max-w-[330px] flex-col gap-[11px]">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-semibold tracking-[0.08em] text-white/55 uppercase">
          Thursday
        </span>
        <span className="inline-flex items-center gap-[6px] text-[11px] text-white/55">
          <span className="h-[7px] w-[7px] rounded-[2px] bg-white/25" />
          Busy in your calendar
        </span>
      </div>

      <div className="grid grid-cols-2 gap-[7px]">
        {SLOTS.map((slot, i) => (
          <span
            key={slot.time}
            className={cx(
              "mr-rise flex h-[36px] items-center justify-center rounded-[7px] border text-[12.5px] font-medium",
              slot.busy
                ? "border-white/12 bg-white/8 text-white/40 line-through decoration-white/30"
                : "border-transparent bg-surface text-ink",
            )}
            style={{ animationDelay: active ? `${i * 55}ms` : "0ms" }}
          >
            {slot.time}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Two emails landing, at the two moments that matter. */
function RemindersPanel({ active }: { active: boolean }) {
  const MAIL = [
    { when: "A day before", subject: "Tomorrow: Intro call with Dana", at: "09:00" },
    { when: "An hour before", subject: "In an hour: Intro call with Dana", at: "13:00" },
  ];

  return (
    <div className="flex w-full max-w-[330px] flex-col gap-[9px]">
      {MAIL.map((mail, i) => (
        <div
          key={mail.when}
          className="mr-slide flex items-start gap-[11px] rounded-[10px] bg-surface px-[13px] py-[11px]"
          style={{ animationDelay: active ? `${300 + i * 420}ms` : "0ms" }}
        >
          <span className="mt-[1px] inline-flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[7px] bg-accent-soft text-accent-ink">
            <Icon name="envelope" size={12} />
          </span>
          <span className="flex min-w-0 flex-col gap-[2px]">
            <span className="text-[10px] font-semibold tracking-[0.07em] text-ink-3 uppercase">
              {mail.when}
            </span>
            <span className="text-[12.5px] leading-[1.4] font-semibold text-ink">{mail.subject}</span>
            <span className="text-[11.5px] text-ink-3">Delivered {mail.at} · to both of you</span>
          </span>
        </div>
      ))}

      <span className="pl-[2px] text-[11.5px] text-white/55">Pro picks its own two times.</span>
    </div>
  );
}

/** The link that rotates. The marker moves to whoever is up next. */
function TeamPanel({ active }: { active: boolean }) {
  const PEOPLE = [
    { name: "Dana", initials: "DA", last: "booked 6 days ago" },
    { name: "Ravi", initials: "RA", last: "booked 2 days ago" },
    { name: "Mei", initials: "ME", last: "booked yesterday" },
  ];
  const [up, setUp] = useState(0);

  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => setUp((n) => (n + 1) % PEOPLE.length), 1500);
    return () => window.clearInterval(id);
  }, [active, PEOPLE.length]);

  return (
    <div className="flex w-full max-w-[330px] flex-col gap-[10px]">
      <span className="rounded-[7px] bg-surface px-[12px] py-[9px] text-[12.5px] text-ink-2">
        meetrao.com/<span className="font-semibold text-ink">acme</span>
      </span>

      <div className="flex flex-col gap-[7px]">
        {PEOPLE.map((person, i) => {
          const on = i === up;
          return (
            <div
              key={person.name}
              className={cx(
                "flex items-center gap-[11px] rounded-[9px] border px-[12px] py-[10px]",
                "transition-[background-color,border-color] duration-[260ms] ease-[ease]",
                on ? "border-accent bg-accent-soft" : "border-transparent bg-surface",
              )}
            >
              <span
                className={cx(
                  "inline-flex h-[28px] w-[28px] flex-none items-center justify-center rounded-[8px] text-[11px] font-bold",
                  "transition-colors duration-[260ms]",
                  on ? "bg-accent text-on-accent" : "bg-fill-2 text-ink-2",
                )}
              >
                {person.initials}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[12.5px] font-semibold text-ink">{person.name}</span>
                <span className="text-[11px] text-ink-3">{person.last}</span>
              </span>
              <span
                className={cx(
                  "text-[10px] font-semibold tracking-[0.07em] text-accent-ink uppercase",
                  "transition-opacity duration-[260ms]",
                  on ? "opacity-100" : "opacity-0",
                )}
              >
                Next up
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The same booking page, wearing three different businesses. */
function BrandPanel({ active }: { active: boolean }) {
  const BRANDS = [
    { name: "Meetrao", accent: "#14554a", ground: "#e7e4dc", ink: "#14554a", on: "#ffffff" },
    { name: "airly", accent: "#003e88", ground: "#dbe4ee", ink: "#1e3a63", on: "#ffffff" },
    { name: "Sunfold", accent: "#b4521e", ground: "#f6e7dc", ink: "#8a3f17", on: "#ffffff" },
  ];
  const [which, setWhich] = useState(0);

  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => setWhich((n) => (n + 1) % BRANDS.length), 1700);
    return () => window.clearInterval(id);
  }, [active, BRANDS.length]);

  const brand = BRANDS[which];

  return (
    <div
      className="flex w-full max-w-[330px] flex-col gap-[10px] rounded-[12px] p-[14px] transition-colors duration-[500ms] ease-[ease]"
      style={{ background: brand.ground }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[13px] font-bold tracking-[-0.01em] transition-colors duration-[500ms]"
          style={{ color: brand.ink }}
        >
          {brand.name}
        </span>
        <span
          className="text-[9px] font-semibold tracking-[0.08em] uppercase transition-colors duration-[500ms]"
          style={{ color: brand.ink, opacity: 0.6 }}
        >
          Booking page
        </span>
      </div>

      <div className="flex flex-col gap-[9px] rounded-[9px] bg-white px-[12px] py-[11px]">
        <div className="flex items-center gap-[6px]">
          {[13, 14, 15, 16].map((day) => (
            <span
              key={day}
              className="inline-flex h-[29px] w-[29px] items-center justify-center rounded-[6px] text-[12px] font-semibold transition-colors duration-[500ms]"
              style={
                day === 14
                  ? { background: brand.accent, color: brand.on }
                  : { background: "#ffffff", color: "#1a1917", boxShadow: "inset 0 0 0 1px #e5e5e5" }
              }
            >
              {day}
            </span>
          ))}
        </div>

        <span
          className="inline-flex h-[31px] items-center justify-center rounded-[7px] text-[12px] font-semibold transition-colors duration-[500ms]"
          style={{ background: brand.accent, color: brand.on }}
        >
          Confirm
        </span>
      </div>
    </div>
  );
}
