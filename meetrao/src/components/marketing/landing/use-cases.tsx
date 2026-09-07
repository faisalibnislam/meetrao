"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { buttonClass } from "@/components/ui/button-style";
import { cn } from "@/lib/cn";
import { Eyebrow } from "./eyebrow";

/**
 * A large featured panel beside three narrow strips; clicking a strip promotes
 * it. Six dots track the whole set.
 *
 * Every photo here is a placeholder. The design ships these as drag-and-drop
 * image slots and the handoff is explicit that they need real photography
 * before launch — so they render as labelled, obviously-empty frames rather
 * than as stock imagery pretending to be content.
 */
type UseCase = {
  id: string;
  glyph: IconName;
  tag: string;
  title: string;
  text: string;
};

const CASES: UseCase[] = [
  {
    id: "aud-freelancers",
    glyph: "userPlus",
    tag: "Freelancers",
    title: "Book discovery calls without the email thread",
    text: "One link in your signature. Clients pick a time you are genuinely free, and it lands on both calendars.",
  },
  {
    id: "aud-consultants",
    glyph: "sliders",
    tag: "Consultants",
    title: "Fill your week while you are in another meeting",
    text: "Prospects book against your live calendar. Buffers and a minimum notice period keep your day intact.",
  },
  {
    id: "aud-agencies",
    glyph: "users",
    tag: "Agencies",
    title: "Every account manager keeps their own link",
    text: "Separate hours and meeting types per person, so nobody negotiates times out of a shared inbox.",
  },
  {
    id: "aud-sales-teams",
    glyph: "bolt",
    tag: "Sales teams",
    title: "Let prospects book straight from the follow-up",
    text: "The link goes in the email. The meeting arrives with a Google Meet link already attached.",
  },
  {
    id: "aud-coaches",
    glyph: "rotateLeft",
    tag: "Coaches",
    title: "Recurring sessions without the weekly admin",
    text: "Clients rebook themselves from the same link, always in their own timezone.",
  },
  {
    id: "aud-remote-teams",
    glyph: "globe",
    tag: "Remote teams",
    title: "Nobody does timezone maths by hand",
    text: "Your hours convert to theirs automatically, and stay correct through daylight saving.",
  },
];

/** An empty photo frame, labelled so it cannot be mistaken for a finished page. */
function PhotoSlot({ id, glyph, large }: { id: string; glyph: IconName; large?: boolean }) {
  return (
    <div
      data-image-slot={id}
      aria-hidden="true"
      className="absolute inset-0 flex flex-col items-center justify-center gap-[6px] bg-fill-2"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, transparent 0 10px, rgba(26,25,23,0.035) 10px 20px)",
      }}
    >
      <Icon name={glyph} size={large ? 26 : 16} className="text-ink-3" />
      {large ? (
        <span className="font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
          Photo
        </span>
      ) : null}
    </div>
  );
}

export function UseCases() {
  const [featured, setFeatured] = useState(0);
  const strips = CASES.filter((_, i) => i !== featured).slice(0, 3);
  const feat = CASES[featured];

  return (
    <section
      id="usecases"
      className="border-y border-line bg-[#E7E3DC]"
    >
      <div className="mx-auto max-w-[1200px] px-[18px] py-[64px] sm:px-[26px]">
        <div className="flex flex-wrap items-end justify-between gap-[20px]">
          <div className="flex min-w-0 max-w-[660px] flex-col gap-[11px]">
            <Eyebrow>Use cases</Eyebrow>
            <h2 className="m-0 font-serif text-[clamp(28px,3.6vw,44px)] leading-[1.04] font-normal tracking-[-0.02em] text-ink text-balance">
              Every kind of work that starts with getting a time in the diary.
            </h2>
          </div>
          <div className="ml-auto flex max-w-[300px] flex-none flex-col gap-[2px] text-right">
            <span className="text-[14px] leading-[1.45] font-semibold text-ink">
              One link, your real availability,
            </span>
            <span className="text-[14px] leading-[1.45] text-ink-3">
              and a Google Meet link on every booking
            </span>
          </div>
        </div>

        <div className="mt-[22px] grid gap-[14px] lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
          {/* Featured panel with a bottom-weighted scrim. */}
          <div className="relative isolate min-h-[420px] overflow-hidden rounded-[16px] border border-line">
            <PhotoSlot id={feat.id} glyph={feat.glyph} large />
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(11,23,20,0.88) 0%, rgba(11,23,20,0.45) 38%, rgba(11,23,20,0.05) 70%)",
              }}
            />
            <div className="relative z-10 mt-auto flex h-full flex-col justify-end gap-[14px] p-[24px]">
              <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-[11px] py-[5px] text-[11.5px] font-semibold text-white backdrop-blur-[4px]">
                {feat.tag}
              </span>
              <h3 className="m-0 max-w-[520px] font-serif text-[clamp(22px,2.6vw,32px)] leading-[1.1] font-normal text-white text-balance">
                {feat.title}
              </h3>
              <p className="m-0 max-w-[460px] text-[13.5px] leading-[1.6] text-white/85 text-pretty">
                {feat.text}
              </p>
              <Link
                href="/signup"
                className={buttonClass({
                  size: "xl",
                  className:
                    "h-[44px] w-fit border-white bg-white text-ink hover:bg-white/90 hover:text-ink sm:h-[36px]",
                })}
              >
                Create your free link
              </Link>
            </div>
          </div>

          {/* Strips */}
          <div className="grid gap-[14px] sm:grid-cols-3 lg:grid-cols-1">
            {strips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFeatured(CASES.findIndex((x) => x.id === c.id))}
                className="relative isolate min-h-[128px] cursor-pointer overflow-hidden rounded-[14px] border border-line text-left"
              >
                <PhotoSlot id={c.id} glyph={c.glyph} />
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(11,23,20,0.85) 0%, rgba(11,23,20,0.2) 62%)",
                  }}
                />
                <div className="relative z-10 flex h-full flex-col justify-end gap-[4px] p-[14px]">
                  <span className="text-[11.5px] font-semibold text-white/80">
                    {c.tag}
                  </span>
                  <span className="text-[13.5px] leading-[1.35] font-semibold text-white text-balance">
                    {c.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Six dots, one per case. 44px hit area, 8px dot. */}
        <div className="mt-[16px] flex justify-center gap-[2px]">
          {CASES.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFeatured(i)}
              aria-label={`Show ${c.tag}`}
              aria-current={i === featured}
              className="inline-flex size-[44px] cursor-pointer items-center justify-center rounded-full border border-transparent bg-transparent"
            >
              <span
                className={cn(
                  "block size-[8px] rounded-full transition-colors duration-[140ms]",
                  i === featured ? "bg-accent" : "bg-line-strong",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
