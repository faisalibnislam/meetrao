"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { brandTokens } from "@/convex/lib/brand";

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
    title: "Your brand, on your own domain",
    text: "Your logo, your colours, and a domain you own. Nothing of ours is left on the page.",
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
      {/* The four, as a list you can also just read, with the way out of the
          section under them.

          THE BUTTON IS IN THIS COLUMN ON PURPOSE. It used to sit below the
          whole grid, which left the stage's bottom edge floating well above
          it. Here the column is tabs-then-button and the grid stretches both
          columns to the same height, so the stage ends exactly where the
          button does without either height being hard-coded. */}
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

        {/* `mt-auto` on the WRAPPER, padding inside it.

            mt-auto alone pushed the button to the bottom and let the gap above
            be whatever the stage left over, which is right when the open panel
            is short and nothing at all when the last tab is open: the button
            ended up touching the panel above it.

            Padding on the wrapper is a floor for that gap. It cannot go on the
            button, whose height is fixed and border-box, so padding there
            squashes the label instead of moving it. And it cannot be a margin
            on the button, which is the property mt-auto is already using.

            The wrapper's bottom is still the column's bottom, so the stage and
            the button keep their shared edge. */}
        <div className="mt-auto w-fit pt-[22px]">
          <ButtonLink href="/pricing#compare" variant="accent" size={44}>
            See all features
            <Icon name="arrow-right" size={12} className="flex-none" />
          </ButtonLink>
        </div>
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
  /* REAL BUSINESSES, with their own logos and their own brand colours.

     Invented ones were tried first and their logotypes had to be drawn, which
     went three rounds and never stopped looking like a typeface exercise.
     These are files, which is what the feature actually takes: a host uploads
     a PNG or an SVG, and that is what these are.

     AIRLY IS HERE BY DECISION, not by oversight. Meetrao used to be published
     under that studio's name, and src/lib/contact-address.test.ts keeps every
     retired operator identity off the site: a Google verification reviewer
     compares the site against the OAuth consent screen, and the Terms say
     there is no company behind this and no team. That guard now exempts this
     one file by name, which is the narrowest shape the exception can take.

     The distinction it rests on: these are examples of what a HOST puts on
     their own page, drawn inside a mock of somebody else's booking page. The
     operator's name is not here and nothing says these businesses run
     anything. All three belong to the person this is built for, who asked for
     the third having seen the argument against it.

     The colours are sampled from the logos rather than chosen to suit them,
     and the rest of each palette comes from brandTokens, the same function the
     real booking page runs. The panel is not an illustration of the feature,
     it is the feature with three inputs. Taskeni earns its place twice over:
     its yellow is the case the contrast code exists for, and it gets a dark
     label where the other two get white. */
  const BRANDS = [
    { key: "airly", name: "Airly", logo: "/demo-brands/airly.png", ratio: 2100 / 1024, accent: "#013e88", domain: "meet.airlystudio.com/alex" },
    { key: "involets", name: "Involets", logo: "/demo-brands/involets.png", ratio: 2550 / 512, accent: "#12100c", domain: "book.involets.com/alex" },
    { key: "taskeni", name: "Taskeni", logo: "/demo-brands/taskeni.svg", ratio: 1884 / 512, accent: "#f8e77f", domain: "meet.taskeni.app/alex" },
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

  /* The same derivation the booking page runs: one colour in, a ground, a
     readable label and a tint out. Hand-picking them here would make the panel
     a drawing of the feature rather than the feature. */
  const tokens = brandTokens(brand.accent)!;
  const LOGO_H = 22;

  return (
    <div
      className="flex w-full max-w-[340px] flex-col gap-[10px] rounded-[12px] p-[14px] transition-colors duration-[500ms] ease-[ease]"
      style={{ background: tokens.ground }}
    >
      {/* The host's own file, at the size the real page shows it. Plain <img>,
          as everywhere else a host's logo is drawn. The two PNGs are stored at
          three times LOGO_H rather than as supplied (1024 and 512px tall,
          106KB between them for a 22px mark); the SVG needs nothing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={brand.logo}
        alt={brand.name}
        /* The showcase is four sections down. Without this the one logo
           rendered on the server is fetched during the initial load, ahead of
           things the reader can actually see. The other two arrive when the
           panel rotates to them, which is already after first paint. */
        loading="lazy"
        decoding="async"
        height={LOGO_H}
        width={Math.round(LOGO_H * brand.ratio)}
        style={{ height: LOGO_H, width: Math.round(LOGO_H * brand.ratio) }}
        className="block object-contain object-left"
      />

      {/* The address, which is the half of this feature a sentence cannot show. */}
      <span
        className="flex items-center gap-[7px] rounded-[7px] bg-white/70 px-[9px] py-[6px] text-[11px]"
        style={{ color: tokens.accentText }}
      >
        <Icon name="lock" size={9} className="flex-none opacity-60" />
        <span className="min-w-0 truncate font-medium">{brand.domain}</span>
      </span>

      <div className="flex flex-col gap-[9px] rounded-[9px] bg-white px-[12px] py-[11px]">
        <div className="flex items-center gap-[6px]">
          {[13, 14, 15, 16].map((day) => (
            <span
              key={day}
              className="inline-flex h-[29px] w-[29px] items-center justify-center rounded-[6px] text-[12px] font-semibold transition-colors duration-[500ms]"
              style={
                day === 14
                  ? { background: tokens.accent, color: tokens.onAccent }
                  : { background: "#ffffff", color: "#1a1917", boxShadow: "inset 0 0 0 1px #e5e5e5" }
              }
            >
              {day}
            </span>
          ))}
        </div>

        <span
          className="inline-flex h-[31px] items-center justify-center rounded-[7px] text-[12px] font-semibold transition-colors duration-[500ms]"
          style={{ background: tokens.accent, color: tokens.onAccent }}
        >
          Confirm
        </span>
      </div>
    </div>
  );
}
