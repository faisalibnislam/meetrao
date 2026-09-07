"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button-style";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/** Mint that reads on the hero's near-black green. */
const MINT = "#7FD8C4";

const PROOF = [
  "Connects to Google Calendar",
  "Google Meet link on every booking",
  "Guests need no account",
];

/**
 * September 2026, laid out for real: the 1st is a Tuesday, so the grid starts
 * with one leading blank. Weekends and past days are not selectable.
 */
const DAYS_IN_MONTH = 30;
const LEADING_BLANKS = 2; // Sun, Mon before Tue 1st
const TODAY = 6;
const SLOTS = [
  "09:00", "09:30", "10:00", "10:30",
  "11:00", "13:30", "14:00", "14:30",
];

function isWeekend(day: number) {
  // 1 Sept 2026 is a Tuesday (index 2 in a Sunday-first grid).
  const col = (LEADING_BLANKS + day - 1) % 7;
  return col === 0 || col === 6;
}

export function Hero() {
  const glowRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [day, setDay] = useState(9);
  const [slot, setSlot] = useState<string | null>(null);

  // The glow is written straight to the node's transform inside a rAF. Routing
  // a mousemove through state would re-render the page on every pixel.
  useEffect(() => {
    const hero = heroRef.current;
    const glow = glowRef.current;
    if (!hero || !glow) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(hover: none)").matches
    ) {
      return;
    }

    let x = 0;
    let y = 0;
    let queued = false;
    const paint = () => {
      queued = false;
      glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const onMove = (event: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
      glow.style.opacity = "1";
      if (!queued) {
        queued = true;
        requestAnimationFrame(paint);
      }
    };
    const onLeave = () => {
      glow.style.opacity = "0";
    };

    hero.addEventListener("mousemove", onMove, { passive: true });
    hero.addEventListener("mouseleave", onLeave, { passive: true });
    return () => {
      hero.removeEventListener("mousemove", onMove);
      hero.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <section
      id="top"
      ref={heroRef}
      className="relative isolate overflow-hidden bg-[#0B1714]"
    >
      {/* Three drifting colour fields. The whole group is disabled under
          prefers-reduced-motion by the global guard in globals.css. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-[18%] -left-[10%] size-[52vw] rounded-full bg-[#14554A] opacity-55 blur-[90px] motion-safe:animate-[mr-drift-a_15s_ease-in-out_infinite]" />
        <div className="absolute top-[24%] -right-[12%] size-[46vw] rounded-full bg-[#1F7A68] opacity-40 blur-[100px] motion-safe:animate-[mr-drift-b_19s_ease-in-out_infinite]" />
        <div className="absolute -bottom-[22%] left-[26%] size-[40vw] rounded-full bg-[#0E4038] opacity-60 blur-[90px] motion-safe:animate-[mr-drift-c_17s_ease-in-out_infinite]" />
      </div>

      {/* Cursor glow — opacity 0 until the pointer moves, and never mounted for
          touch or reduced motion. */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 -z-10 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 transition-opacity duration-500"
        style={{
          margin: "-260px 0 0 -260px",
          background: `radial-gradient(circle, ${MINT}22 0%, transparent 68%)`,
        }}
      />

      <div className="mx-auto grid max-w-[1200px] items-center gap-[40px] px-[18px] py-[64px] sm:px-[26px] lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:py-[86px]">
        <div className="flex min-w-0 flex-col gap-[22px]">
          <span
            className="inline-flex items-center gap-[10px] font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase"
            style={{ color: MINT }}
          >
            <span
              className="h-[2px] w-[18px] flex-none rounded-[1px]"
              style={{ background: MINT }}
            />
            Free scheduling
          </span>

          <h1 className="m-0 font-serif text-[clamp(44px,10.66vw,68px)] leading-[0.98] font-normal tracking-[-0.03em] text-white text-balance min-[641px]:text-[clamp(34px,8.2vw,52px)] min-[861px]:text-[clamp(46px,7.4vw,92px)]">
            Stop asking &ldquo;what time works for you?&rdquo;
          </h1>

          <p className="m-0 max-w-[560px] text-[15.5px] leading-[1.65] text-white/75 text-pretty">
            Share one link. Guests pick from the times you are genuinely free,
            and every booking arrives on both calendars with a Google Meet link
            already attached.
          </p>

          <div className="flex flex-wrap gap-[10px]">
            <Link
              href="/signup"
              className={buttonClass({
                size: "4xl",
                className:
                  "h-[44px] border-white bg-white text-ink hover:bg-white/90 hover:text-ink sm:h-[42px]",
              })}
            >
              Create your free booking link
            </Link>
            <Link
              href="/#how"
              className={buttonClass({
                size: "4xl",
                className:
                  "h-[44px] border-white/30 bg-white/5 text-white hover:border-white/55 hover:bg-white/10 hover:text-white sm:h-[42px]",
              })}
            >
              See how it works
            </Link>
          </div>

          <div
            className="flex w-fit items-center gap-[9px] rounded-[9px] border px-[13px] py-[9px]"
            style={{ borderColor: `${MINT}66`, background: `${MINT}14` }}
          >
            <Icon name="check" weight={900} size={11} style={{ color: MINT }} />
            <span className="text-[13px] font-medium text-white">
              Free forever. No card, no subscription.
            </span>
          </div>

          <ul className="m-0 flex list-none flex-wrap gap-[8px] p-0">
            {PROOF.map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-[8px] rounded-full border border-white/15 bg-white/[0.07] px-[12px] py-[7px]"
              >
                <Icon name="check" weight={900} size={10} style={{ color: MINT }} />
                <span className="text-[12.5px] text-white/85">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* A working booking card in browser chrome — not a screenshot. */}
        <div className="min-w-0">
          <div className="overflow-hidden rounded-[14px] border border-white/12 bg-surface shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-[8px] border-b border-line bg-fill px-[13px] py-[10px]">
              <span className="size-[9px] flex-none rounded-full bg-line-strong" />
              <span className="size-[9px] flex-none rounded-full bg-line-strong" />
              <span className="size-[9px] flex-none rounded-full bg-line-strong" />
              <span className="ml-[6px] truncate font-mono text-[11px] text-ink-3">
                meetrao.com/adam
              </span>
            </div>

            <div className="flex items-center gap-[11px] border-b border-line-soft px-[16px] py-[13px]">
              <span className="inline-flex size-[34px] flex-none items-center justify-center rounded-full bg-accent-soft text-[12.5px] font-semibold text-accent">
                AV
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[13.5px] font-semibold text-ink">
                  Adam Voigt
                </span>
                <span className="truncate text-[12px] text-ink-3">
                  Product consultant
                </span>
              </div>
            </div>

            <div className="px-[16px] pt-[13px]">
              <span className="text-[13.5px] font-semibold text-ink">
                30 Minute Consultation
              </span>
              <p className="m-0 mt-[3px] text-[12.5px] leading-[1.5] text-ink-3">
                A quick conversation to discuss your project.
              </p>
            </div>

            <div className="grid gap-[14px] px-[16px] py-[14px] min-[420px]:grid-cols-[minmax(0,1fr)_128px]">
              <div className="min-w-0">
                <div className="mb-[8px] flex items-baseline justify-between gap-[8px]">
                  <span className="text-[12px] font-semibold text-ink">
                    Select a date
                  </span>
                  <span className="font-mono text-[10.5px] text-ink-3">
                    September 2026
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-[3px]">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <span
                      key={`${d}-${i}`}
                      className="text-center text-[10px] leading-[18px] text-ink-3"
                    >
                      {d}
                    </span>
                  ))}
                  {Array.from({ length: LEADING_BLANKS }, (_, i) => (
                    <span key={`blank-${i}`} />
                  ))}
                  {Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1).map((d) => {
                    const disabled = d < TODAY || isWeekend(d);
                    const selected = d === day;
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setDay(d);
                          setSlot(null);
                        }}
                        aria-pressed={selected}
                        className={cn(
                          "h-[44px] rounded-[5px] text-[11.5px] transition-colors duration-[120ms] sm:h-[26px]",
                          disabled && "cursor-not-allowed text-ink-3/45",
                          !disabled && !selected && "cursor-pointer text-ink-2 hover:bg-fill",
                          selected && "cursor-pointer bg-accent font-semibold text-white",
                          d === TODAY && !selected && "ring-1 ring-accent-line",
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-[5px]">
                <span className="text-[12px] font-semibold text-ink">
                  Available times
                </span>
                <div className="flex max-h-[264px] flex-col gap-[5px] overflow-y-auto sm:max-h-[184px]">
                  {SLOTS.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSlot(time)}
                      aria-pressed={slot === time}
                      className={cn(
                        "h-[44px] flex-none cursor-pointer rounded-[6px] border text-[12.5px] font-medium transition-colors duration-[120ms] sm:h-[30px]",
                        slot === time
                          ? "border-accent bg-accent text-white"
                          : "border-line-strong bg-surface text-ink hover:border-accent hover:text-accent",
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p
              role="status"
              className="m-0 border-t border-line-soft bg-fill px-[16px] py-[10px] text-[11.5px] leading-[1.5] text-ink-3"
            >
              {slot
                ? `${slot} on 6–30 September is just a preview — nothing has been booked.`
                : "A live preview of a booking page. Nothing here is actually booked."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
