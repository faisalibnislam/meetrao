"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ImageFrame } from "./image-frame";
import { DemoMonthGrid, DemoSlot, demoDayLabel } from "./demo-calendar";

/* ─────────────────────────────────────────────────────────────────────────────
   The hero. A living ground of drifting colour fields behind a real, clickable
   booking card — not a screenshot of one.
   ───────────────────────────────────────────────────────────────────────────── */

const PROOF = [
  "Completely free",
  "No double bookings",
  "On both calendars",
  "Every timezone converted",
  "Guests never sign up",
];

const SLOTS = ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "2:00 PM", "2:30 PM", "3:00 PM"];

const FACTS: { icon: "clock" | "video" | "globe"; text: string }[] = [
  { icon: "clock", text: "30 minutes" },
  { icon: "video", text: "Google Meet" },
  { icon: "globe", text: "Times shown in your timezone" },
];

export function Hero() {
  const [day, setDay] = useState(9);
  const [slot, setSlot] = useState("");
  const heroRef = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  /* The cursor glow is written straight to the node's transform on a rAF.
     A setState per mousemove would re-render the whole page. */
  useEffect(() => {
    const hero = heroRef.current;
    const glow = glowRef.current;
    if (!hero || !glow) return;
    if (
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia?.("(hover: none)").matches
    ) {
      return;
    }

    let x = 0;
    let y = 0;
    let queued = false;

    const paint = () => {
      queued = false;
      glow.style.transform = `translate3d(${x}px,${y}px,0)`;
    };

    const move = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
      if (glow.style.opacity !== "1") glow.style.opacity = "1";
      if (!queued) {
        queued = true;
        requestAnimationFrame(paint);
      }
    };
    const out = () => {
      glow.style.opacity = "0";
    };

    hero.addEventListener("mousemove", move, { passive: true });
    hero.addEventListener("mouseleave", out, { passive: true });
    return () => {
      hero.removeEventListener("mousemove", move);
      hero.removeEventListener("mouseleave", out);
    };
  }, []);

  return (
    <section
      ref={heroRef}
      id="top"
      className="relative isolate -mt-[78px] overflow-hidden bg-[#0B1714] pt-[78px]"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="drift-a absolute -top-[24%] -left-[14%] h-[104%] w-[74%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(24,105,90,1),rgba(24,105,90,0)_70%)] blur-[44px]" />
        <div className="drift-b absolute -top-[14%] -right-[18%] h-[96%] w-[66%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(52,168,146,0.95),rgba(52,168,146,0)_68%)] blur-[56px]" />
        <div className="drift-c absolute -bottom-[32%] left-[26%] h-[82%] w-[60%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(58,102,134,0.9),rgba(58,102,134,0)_72%)] blur-[58px]" />
        <div className="sweep absolute top-0 -left-[25%] h-full w-[50%] bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.14)_50%,rgba(255,255,255,0)_100%)]" />
        <div
          ref={glowRef}
          className="pointer-events-none absolute top-0 left-0 -mt-[260px] -ml-[260px] h-[520px] w-[520px] rounded-full opacity-0 blur-[18px] transition-opacity duration-[260ms] will-change-transform"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(127,216,196,0.30) 0%, rgba(90,196,170,0.16) 38%, rgba(52,168,146,0) 70%)",
            transform: "translate3d(-9999px,-9999px,0)",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,23,20,0.34)_0%,rgba(11,23,20,0)_34%,rgba(11,23,20,0.55)_100%)]" />
      </div>

      <div className="relative z-1 mx-auto flex max-w-[1200px] flex-col items-center gap-[19px] px-[26px] pt-[38px] text-center max-[560px]:px-[18px]">
        <h1 className="hero-headline m-0 font-serif font-normal text-white">
          Stop asking &ldquo;what time works for you?&rdquo;
        </h1>

        <p className="m-0 max-w-[56ch] text-[clamp(15.5px,1.5vw,18px)] leading-[1.55] text-pretty text-white/80">
          Meetrao turns your availability into one booking link, so clients and teammates pick a time that
          works — without the back-and-forth.
        </p>

        <div className="flex flex-wrap justify-center gap-[10px] pt-[2px]">
          <Link
            href="/signup"
            className="unlink inline-flex h-[50px] items-center justify-center gap-[10px] rounded-[8px] bg-white px-[24px] text-[15px] font-semibold text-accent-2 transition-opacity duration-[120ms] hover:text-accent-2 hover:opacity-90"
          >
            Create your free booking link
            <Icon name="arrow-right" size={12} />
          </Link>
          <a
            href="#how"
            className="unlink inline-flex h-[50px] items-center justify-center gap-[10px] rounded-[8px] border border-white/35 bg-white/5 px-[21px] text-[15px] font-semibold text-white transition-colors duration-[120ms] hover:bg-white/15 hover:text-white"
          >
            <Icon name="play" size={12} />
            See how it works
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center pt-[8px]">
          {PROOF.map((text, i) => (
            <span
              key={text}
              className={`inline-flex h-[22px] items-center gap-[8px] text-[13px] font-medium tracking-[-0.002em] whitespace-nowrap text-white/90 ${
                i > 0 ? "border-l border-white/25 px-[16px]" : "pr-[16px]"
              }`}
            >
              <Icon name="check" weight="solid" size={9} className="text-[#7FD8C4]" />
              {text}
            </span>
          ))}
        </div>

        <div className="mx-auto mt-[6px] flex w-full max-w-[1019px] flex-wrap items-center justify-center gap-x-[16px] gap-y-[12px] border-t border-white/20 pt-[20px]">
          <span className="inline-flex items-center gap-[9px] text-[15.5px] font-semibold tracking-[-0.008em] text-white">
            <Icon name="check" weight="solid" size={12} className="text-[#7FD8C4]" />
            Free. No card, no subscription.
          </span>
          <span aria-hidden="true" className="h-[20px] w-[1px] flex-none bg-white/20" />
          <span className="inline-flex items-baseline gap-[8px] text-[13.5px] text-white/75">
            Your link is
            <span className="font-mono text-[14.5px] font-medium text-white">meetrao.com/you</span>
          </span>
        </div>

        {/* A live booking page, not a screenshot. */}
        <div className="mt-[24px] w-full pb-[52px]">
          <div className="animate-up overflow-hidden rounded-[16px] border border-white/15 bg-surface shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-[8px] border-b border-line bg-fill px-[14px] py-[9px]">
              <span aria-hidden="true" className="flex flex-none gap-[5px]">
                <span className="h-[8px] w-[8px] rounded-full bg-line-strong" />
                <span className="h-[8px] w-[8px] rounded-full bg-line-strong" />
                <span className="h-[8px] w-[8px] rounded-full bg-line-strong" />
              </span>
              <span className="min-w-0 flex-1 overflow-hidden text-left font-mono text-[11px] text-ellipsis whitespace-nowrap text-ink-3">
                meetrao.com/adam
              </span>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(258px,1fr))] items-stretch">
              <div className="flex min-w-0 flex-col gap-[12px] border-r border-line bg-fill p-[24px] text-left">
                <div className="flex items-center gap-[11px]">
                  <ImageFrame
                    label="Host"
                    avatar
                    src="/people/host-avatar.webp"
                    sizes="38px"
                    className="h-[38px] w-[38px] flex-none"
                    rounded="rounded-[9px]"
                    ground="bg-accent-soft"
                  />
                  <div className="flex min-w-0 flex-col gap-[1px]">
                    <span className="text-[13.5px] font-semibold text-ink">Adam Voigt</span>
                    <span className="text-[12px] text-ink-3">Product consultant</span>
                  </div>
                </div>

                <h3 className="m-0 font-serif text-[clamp(24px,2.6vw,31px)] leading-[1.06] font-normal tracking-[-0.012em] text-ink">
                  30 Minute Consultation
                </h3>
                <p className="m-0 text-[13px] leading-[1.55] text-pretty text-ink-2">
                  A quick conversation to discuss your project.
                </p>

                <div className="mt-auto flex flex-col gap-[9px] pt-[6px]">
                  {FACTS.map((fact) => (
                    <div key={fact.text} className="flex items-start gap-[10px]">
                      <Icon name={fact.icon} size={12.5} className="mt-[1px] w-[15px] flex-none text-ink-3" />
                      <span className="min-w-0 flex-1 text-left text-[12.5px] leading-[1.45] text-ink">
                        {fact.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-[15px] p-[24px]">
                <div className="flex flex-col gap-[10px]">
                  <div className="flex items-center justify-between gap-[12px]">
                    <span className="font-mono text-[10px] tracking-[0.07em] text-ink-3 uppercase">
                      Select a date
                    </span>
                    <span className="text-[13px] font-semibold text-ink">September 2026</span>
                  </div>
                  <DemoMonthGrid
                    selected={day}
                    onSelect={(d) => {
                      setDay(d);
                      setSlot("");
                    }}
                  />
                </div>

                <div className="flex flex-col gap-[10px] border-t border-line pt-[15px]">
                  <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
                    <span className="font-mono text-[10px] tracking-[0.07em] text-ink-3 uppercase">
                      Available times
                    </span>
                    <span className="text-[12.5px] text-ink-2">{demoDayLabel(day)}</span>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-[6px]">
                    {SLOTS.map((label) => (
                      <DemoSlot key={label} label={label} on={slot === label} onClick={() => setSlot(label)} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
