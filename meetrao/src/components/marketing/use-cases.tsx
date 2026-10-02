import { Fragment } from "react";
import { Kicker } from "./site-chrome";

/* ─────────────────────────────────────────────────────────────────────────────
   Use cases, concept 2e, "Marquee with faces".

   A full-bleed dark band: one heading, a marquee of six named faces that never
   stops, and three notes underneath. It replaced a carousel (a featured panel,
   three strips, six dots and two arrows, all driven by an index in component
   state) and the thing worth noticing is what went with it.

   There is no client state here at all. No `useState`, no handlers, no
   `"use client"`. The motion is one CSS animation on a static list, which means
   this section ships no JavaScript and renders complete in the server's HTML.

   ── the loop ──
   The six items are rendered TWICE and the track translates by exactly -50%.
   At the end of the animation the second copy sits precisely where the first
   began, so the seam never lands on screen. That is also why the duplicate is
   `aria-hidden`: it is the same six words again, and a screen reader that reads
   them twice is reading a rendering trick out loud.

   ── reduced motion ──
   A 26-second infinite translate is the only continuous motion on this page, so
   it is the one thing that most needs to stop. It does, and without a rule of
   its own: `globals.css` already ends every animation at 0.001ms under
   `prefers-reduced-motion: reduce`, globally. A second guard here would be a
   duplicate that can rot out of step with the first, `use-cases.test.ts`
   asserts the global one still covers this band instead.
   ───────────────────────────────────────────────────────────────────────────── */

/** id is the photo filename (`public/use-cases/uc-<id>.webp`); name is the label. */
const CASES: readonly (readonly [id: string, name: string])[] = [
  ["freelancers", "Freelancers"],
  ["consultants", "Consultants"],
  ["agencies", "Agencies"],
  ["sales-teams", "Sales teams"],
  ["coaches", "Coaches"],
  ["remote-teams", "Remote teams"],
];

/** What the carousel's right-aligned kicker used to say, split three ways. */
const NOTES: readonly (readonly [string, string])[] = [
  ["One link", "Clients pick a time you are genuinely free, and it lands on both calendars."],
  ["Your real hours", "Buffers and a minimum notice period keep your day intact."],
  ["Meet attached", "Every booking arrives with a Google Meet link already on it."],
];

export function UseCases() {
  return (
    <div className="overflow-hidden bg-accent-2 pt-[52px] pb-[56px] text-on-accent">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-[13px] px-[26px] pb-[34px] max-[560px]:px-[18px]">
        {/* Default tone, which is the teal, the same #7FD8C4 as the marquee
            dots and the eyebrows below, and what "The problem" band already
            uses over a white heading on this ground. */}
        <Kicker>Use cases</Kicker>
        <h2 className="m-0 max-w-[22ch] font-serif text-[clamp(26px,3.2vw,42px)] leading-[1.05] font-normal tracking-[-0.02em] text-balance text-white">
          Every kind of work that starts with getting a time in the diary.
        </h2>
      </div>

      {/* Full-bleed: the track is deliberately outside the centred column. */}
      <div className="marquee-track">
        <MarqueeRun />
        <MarqueeRun duplicate />
      </div>

      <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-[26px] px-[26px] pt-[40px] max-[560px]:px-[18px]">
        {NOTES.map(([eyebrow, line]) => (
          <div key={eyebrow} className="flex flex-col gap-[8px]">
            {/* The handoff specifies DM Mono here. This product removed
                monospace on purpose and `no-monospace.test.ts` enforces it, so
                the eyebrow keeps every other property (10.5px, 0.12em, upper,
                #7FD8C4) in the sans it inherits. */}
            <span className="text-[10.5px] tracking-[0.12em] text-[#7FD8C4] uppercase">{eyebrow}</span>
            <span className="text-[14px] leading-[1.6] text-pretty text-white/86">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * One pass of the six. Rendered twice by the track above.
 *
 * `duplicate` hides the copy from assistive technology and is the only
 * difference between the two, one array mapped twice, never twelve records.
 */
function MarqueeRun({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div
      aria-hidden={duplicate || undefined}
      className="flex flex-none items-center gap-[30px] pr-[30px] max-[640px]:gap-[20px] max-[640px]:pr-[20px]"
    >
      {CASES.map(([id, name]) => (
        /* Item then dot, every time, including after the last one. That
           trailing dot is what separates "Remote teams" from the "Freelancers"
           of the next copy, so the joint reads as another gap rather than as
           the place the loop restarts. */
        <Fragment key={id}>
          <div className="flex flex-none items-center gap-[16px]">
            <div className="h-[72px] w-[120px] flex-none overflow-hidden rounded-[999px] border border-white/28 bg-white/10 max-[640px]:h-[52px] max-[640px]:w-[84px]">
              {/* A plain <img>, not next/image: these are pre-cut at 240×142,
                  exactly 2× the pill, so the optimiser would re-encode an
                  already-correct 10KB file for nothing. Alt="" because the name
                  sits beside it as real text. The photo is decorative. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- the
                  optimiser has nothing to do here: 240×142 is exactly 2× the
                  pill, already WebP, already ~10KB. */}
              <img
                src={`/use-cases/uc-${id}.webp`}
                alt=""
                width={240}
                height={142}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="font-serif text-[54px] leading-none whitespace-nowrap text-white max-[640px]:text-[clamp(34px,9vw,54px)]">
              {name}
            </span>
          </div>
          <span
            aria-hidden="true"
            className="h-[9px] w-[9px] flex-none rounded-full bg-[#7FD8C4] max-[640px]:h-[7px] max-[640px]:w-[7px]"
          />
        </Fragment>
      ))}
    </div>
  );
}
