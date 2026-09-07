"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { Eyebrow } from "./eyebrow";

/**
 * Four stages, all live markup rather than screenshots. A vertical tracker
 * whose connector fills to the active step; auto-advance runs until the first
 * manual pick and then stops permanently.
 */
const STEPS = [
  { key: "avail", n: "01", title: "Set the hours you work", blurb: "Tick the days and set the hours in each. A day can hold more than one range, so a lunch break stays protected." },
  { key: "share", n: "02", title: "Share one link", blurb: "Your booking page lives at meetrao.com/you. Put it in a signature, a message, or a follow-up email." },
  { key: "book", n: "03", title: "They pick a time", blurb: "Guests see only what is genuinely open, converted into their own timezone. No account, no password." },
  { key: "done", n: "04", title: "It lands on both calendars", blurb: "The event is created with a Google Meet link, and the guest is invited to the same event." },
] as const;

const WEEK = [
  { day: "Monday", hours: "09:00 – 17:00" },
  { day: "Tuesday", hours: "09:00 – 17:00" },
  { day: "Wednesday", hours: "09:00 – 12:00" },
  { day: "Thursday", hours: "09:00 – 17:00" },
  { day: "Friday", hours: "09:00 – 15:00" },
];

export function Walkthrough() {
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [days, setDays] = useState<Record<string, boolean>>(
    Object.fromEntries(WEEK.map((d) => [d.day, true])),
  );

  useEffect(() => {
    if (pinned) return;
    const id = setInterval(() => setActive((i) => (i + 1) % STEPS.length), 4200);
    return () => clearInterval(id);
  }, [pinned]);

  const pick = (i: number) => {
    setActive(i);
    setPinned(true);
  };

  const openDays = WEEK.filter((d) => days[d.day]).length;
  const stage = STEPS[active].key;

  return (
    <section id="how" className="border-t border-line bg-ground">
      <div className="mx-auto max-w-[1200px] px-[18px] py-[64px] sm:px-[26px]">
        <div className="flex max-w-[640px] flex-col gap-[11px]">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="m-0 font-serif text-[clamp(28px,3.6vw,44px)] leading-[1.04] font-normal tracking-[-0.02em] text-ink text-balance">
            One link. One booking. Zero back-and-forth.
          </h2>
        </div>

        <div className="mt-[26px] grid gap-[26px] lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          {/* Tracker */}
          <ol className="m-0 flex list-none flex-col p-0">
            {STEPS.map((step, i) => {
              const isActive = i === active;
              const done = i < active;
              return (
                <li key={step.key} className="relative flex gap-[16px]">
                  {i < STEPS.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-[46px] left-[21px] w-[2px] rounded-full transition-colors duration-300",
                        "h-[calc(100%-46px)]",
                        done || isActive ? "bg-accent" : "bg-line",
                      )}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    aria-current={isActive ? "step" : undefined}
                    className="flex flex-1 cursor-pointer items-start gap-[16px] rounded-[10px] border border-transparent bg-transparent p-[8px] text-left hover:bg-white/45"
                  >
                    <span
                      className={cn(
                        "relative z-10 inline-flex flex-none items-center justify-center rounded-full border font-serif transition-all duration-300",
                        isActive
                          ? "size-[52px] border-accent bg-accent text-[22px] text-white"
                          : done
                            ? "size-[44px] border-accent bg-accent-soft text-[18px] text-accent"
                            : "size-[44px] border-line-strong bg-surface text-[18px] text-ink-3",
                      )}
                    >
                      {done ? <Icon name="check" weight={900} size={14} /> : step.n}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px] pt-[6px]">
                      <span
                        className={cn(
                          "text-[14.5px] font-semibold",
                          isActive ? "text-ink" : "text-ink-2",
                        )}
                      >
                        {step.title}
                      </span>
                      <span className="text-[13px] leading-[1.55] text-ink-3 text-pretty">
                        {step.blurb}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Stage — all four share one height so the page does not jump. */}
          <div className="flex min-h-[420px] min-w-0 flex-col rounded-[14px] border border-line bg-surface p-[18px]">
            {stage === "avail" ? (
              <div className="flex flex-col gap-[10px]">
                <div className="flex items-baseline justify-between gap-[10px]">
                  <span className="text-[13.5px] font-semibold text-ink">Availability</span>
                  <span className="font-mono text-[10.5px] text-ink-3">GMT+06:00 Dhaka</span>
                </div>
                {WEEK.map((d) => {
                  const on = days[d.day];
                  return (
                    <label
                      key={d.day}
                      className="flex h-[44px] cursor-pointer items-center gap-[11px] rounded-[8px] border border-line px-[12px]"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setDays((prev) => ({ ...prev, [d.day]: !prev[d.day] }))
                        }
                        className="size-[16px] flex-none accent-[var(--accent)]"
                      />
                      <span className="flex-1 text-[13px] font-medium text-ink">
                        {d.day}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[11.5px]",
                          on ? "text-ink-2" : "text-ink-3",
                        )}
                      >
                        {on ? d.hours : "Unavailable"}
                      </span>
                    </label>
                  );
                })}
                <span role="status" className="text-[12px] text-ink-3">
                  {openDays} {openDays === 1 ? "day" : "days"} open this week.
                </span>
              </div>
            ) : null}

            {stage === "share" ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-[14px] text-center">
                <span className="inline-flex size-[52px] items-center justify-center rounded-full bg-accent-soft">
                  <Icon name="link" size={20} className="text-accent" />
                </span>
                <span className="font-mono text-[15px] text-ink">meetrao.com/adam</span>
                <p className="m-0 max-w-[340px] text-[13px] leading-[1.6] text-ink-3 text-pretty">
                  One link covers every meeting type you offer. It never changes,
                  so it can live in a signature.
                </p>
              </div>
            ) : null}

            {stage === "book" ? (
              <div className="flex flex-col gap-[12px]">
                <span className="text-[13.5px] font-semibold text-ink">
                  Confirm your details
                </span>
                <span className="text-[12.5px] text-ink-3">
                  30 Minute Consultation · 30 min
                </span>
                {["Full name", "Email address"].map((label) => (
                  <div key={label} className="flex flex-col gap-[5px]">
                    <span className="text-[12px] font-medium text-ink-2">{label}</span>
                    <div className="h-[36px] rounded-[7px] border border-line bg-fill" />
                  </div>
                ))}
                <div className="flex flex-col gap-[5px]">
                  <span className="text-[12px] font-medium text-ink-2">
                    Anything to share?
                  </span>
                  <div className="h-[64px] rounded-[7px] border border-line bg-fill" />
                </div>
                <button
                  type="button"
                  onClick={() => pick(3)}
                  className="inline-flex h-[44px] cursor-pointer items-center justify-center rounded-[7px] border border-accent bg-accent text-[13.5px] font-semibold text-white hover:bg-accent-2"
                >
                  Schedule
                </button>
              </div>
            ) : null}

            {stage === "done" ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-[14px] text-center">
                <span className="inline-flex size-[52px] items-center justify-center rounded-full bg-accent-soft">
                  <Icon name="circleCheck" weight={900} size={22} className="text-accent" />
                </span>
                <span className="font-serif text-[26px] leading-[1.1] text-ink">
                  You&apos;re booked!
                </span>
                <p className="m-0 max-w-[360px] rounded-[8px] bg-accent-soft px-[14px] py-[10px] text-[13px] leading-[1.6] text-ink text-pretty">
                  This is already on your calendar. Adam has been invited to the
                  same event.
                </p>
                <span className="inline-flex items-center gap-[8px] font-mono text-[12px] text-ink-2">
                  <Icon name="video" size={13} className="text-accent" />
                  Join Google Meet
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
