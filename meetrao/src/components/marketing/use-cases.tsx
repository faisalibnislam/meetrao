"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { ImageFrame } from "./image-frame";
import { cx } from "@/lib/cx";

/* Six use cases: one featured panel plus the next three as strips. Each appears
   either as the feature or as a strip, never both — so one photograph per use
   case covers both roles and is cropped to fit.

   Photographs are read off disk by the page, not listed here: drop
   `public/use-cases/<id>.jpg` and that card stops being a frame. See
   src/lib/use-case-photos.ts. */

type UseCase = {
  id: string;
  glyph: IconName;
  tag: string;
  title: string;
  text: string;
  ground: string;
};

const USE: UseCase[] = [
  {
    id: "freelancers",
    glyph: "address-card",
    tag: "Freelancers",
    title: "Book discovery calls without the email thread",
    text: "One link in your signature. Clients pick a time you are genuinely free, and it lands on both calendars.",
    ground: "bg-accent-soft",
  },
  {
    id: "consultants",
    glyph: "lightbulb",
    tag: "Consultants",
    title: "Fill your week while you are in another meeting",
    text: "Prospects book against your live calendar. Buffers and a minimum notice period keep your day intact.",
    ground: "bg-fill-2",
  },
  {
    id: "agencies",
    glyph: "users",
    tag: "Agencies",
    title: "Every account manager keeps their own link",
    text: "Separate hours and meeting types per person, so nobody negotiates times out of a shared inbox.",
    ground: "bg-slate-soft",
  },
  {
    id: "sales-teams",
    glyph: "chart-line",
    tag: "Sales teams",
    title: "Let prospects book straight from the follow-up",
    text: "The link goes in the email. The meeting arrives with a Google Meet link already attached.",
    ground: "bg-fill",
  },
  {
    id: "coaches",
    glyph: "graduation-cap",
    tag: "Coaches",
    title: "Recurring sessions without the weekly admin",
    text: "Clients rebook themselves from the same link, always in their own timezone.",
    ground: "bg-accent-soft",
  },
  {
    id: "remote-teams",
    glyph: "globe",
    tag: "Remote teams",
    title: "Nobody does timezone maths by hand",
    text: "Your hours convert to theirs automatically, and stay correct through daylight saving.",
    ground: "bg-fill-2",
  },
];

export function UseCases({ photos = {} }: { photos?: Record<string, string> }) {
  const [index, setIndex] = useState(0);
  const feature = USE[index];
  const strips = [1, 2, 3].map((offset) => USE[(index + offset) % USE.length]);

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-wrap items-stretch gap-[10px]">
        <div
          className={cx(
            "animate-in relative flex min-w-0 flex-[1_1_430px] flex-col overflow-hidden rounded-[16px]",
            "min-h-[clamp(330px,38vw,410px)]",
            feature.ground,
          )}
        >
          <ImageFrame
            label={`${feature.tag} photography`}
            src={photos[feature.id]}
            sizes="(max-width: 860px) 100vw, 680px"
            className="absolute inset-0 z-1 h-full w-full"
            rounded="rounded-none"
            ground="bg-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-2"
            style={{
              background:
                "linear-gradient(to top,rgba(11,23,20,0.92) 0%,rgba(11,23,20,0.66) 34%,rgba(11,23,20,0.12) 68%,rgba(11,23,20,0.04) 100%)",
            }}
          />
          <div className="relative z-3 mt-auto flex flex-wrap items-end justify-between gap-[16px] p-[24px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[9px]">
              <span className="inline-flex h-[24px] self-start items-center gap-[8px] rounded-[6px] border border-white/30 bg-white/15 px-[10px] font-mono text-[10px] font-medium tracking-[0.1em] text-white uppercase backdrop-blur-[6px]">
                <Icon name={feature.glyph} size={10} className="text-[#7FD8C4]" />
                {feature.tag}
              </span>
              <span className="font-serif text-[clamp(21px,2.3vw,27px)] leading-[1.1] font-normal tracking-[-0.014em] text-balance text-white">
                {feature.title}
              </span>
              <span className="max-w-[44ch] text-[13.5px] leading-[1.55] text-pretty text-white/85">
                {feature.text}
              </span>
            </div>
            <Link
              href="/signup"
              className="unlink inline-flex h-[40px] flex-none items-center gap-[9px] rounded-[8px] bg-white px-[16px] text-[13.5px] font-semibold text-ink transition-opacity duration-[120ms] hover:text-ink hover:opacity-90"
            >
              Create your free link
              <Icon name="arrow-right" size={10} />
            </Link>
          </div>
        </div>

        <div className="flex min-h-[170px] min-w-0 flex-[1_1_250px] gap-[10px]">
          {strips.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Feature the ${item.tag} use case`}
              onClick={() => setIndex(USE.indexOf(item))}
              className={cx(
                "relative flex min-w-0 flex-[1_1_0] cursor-pointer flex-col overflow-hidden rounded-[14px] border-0 p-0",
                "transition-transform duration-[220ms] ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-[3px]",
                item.ground,
              )}
            >
              <ImageFrame
                label={item.tag}
                src={photos[item.id]}
                sizes="(max-width: 860px) 50vw, 340px"
                className="absolute inset-0 z-1 h-full w-full"
                rounded="rounded-none"
                ground="bg-transparent"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-2"
                style={{
                  background:
                    "linear-gradient(to top,rgba(11,23,20,0.9) 0%,rgba(11,23,20,0.5) 42%,rgba(11,23,20,0.1) 80%)",
                }}
              />
              <span className="relative z-3 mt-auto flex flex-col gap-[7px] px-[12px] py-[14px] text-left">
                <span className="inline-flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] bg-white/20 text-[#7FD8C4] backdrop-blur-[6px]">
                  <Icon name={item.glyph} size={11} />
                </span>
                <span className="text-[13px] leading-[1.3] font-semibold text-balance text-white">{item.tag}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-[14px]">
        <div className="flex flex-none gap-[6px]">
          {USE.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Feature the ${item.tag} use case`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cx(
                "h-[8px] cursor-pointer rounded-[4px] border-0 p-0",
                "transition-[width,background-color] duration-[220ms] ease-[cubic-bezier(.22,1,.36,1)]",
                i === index ? "w-[22px] bg-accent" : "w-[8px] bg-line-strong",
              )}
            />
          ))}
        </div>

        <div className="ml-auto flex flex-none items-center gap-[8px]">
          <ArrowButton dir="prev" onClick={() => setIndex((i) => (i - 1 + USE.length) % USE.length)} />
          <ArrowButton dir="next" onClick={() => setIndex((i) => (i + 1) % USE.length)} />
        </div>
      </div>
    </div>
  );
}

function ArrowButton({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === "prev" ? "Previous use case" : "Next use case"}
      onClick={onClick}
      className="inline-flex h-[40px] w-[40px] cursor-pointer items-center justify-center rounded-[10px] border border-line bg-surface text-ink-2 transition-[background-color,border-color,color] duration-[140ms] hover:border-line-strong hover:bg-fill-2 hover:text-ink"
    >
      <Icon name={dir === "prev" ? "chevron-left" : "chevron-right"} size={12} />
    </button>
  );
}
