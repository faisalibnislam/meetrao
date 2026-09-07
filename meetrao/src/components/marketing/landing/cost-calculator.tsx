"use client";

import { useState } from "react";
import { Eyebrow } from "./eyebrow";

/**
 * The cost band: general research about scheduling overhead beside a
 * calculator. Both are deliberately framed as illustrative — the research is
 * about appointment scheduling in general, not evidence about Meetrao, and the
 * calculator is arithmetic on the reader's own numbers, not a measurement.
 */
const RESEARCH = [
  {
    stat: "17 min",
    label: "per meeting",
    text: "A commonly cited figure for the time spent agreeing a single meeting time over email.",
  },
  {
    stat: "4–8",
    label: "messages",
    text: "A typical back-and-forth to settle one slot across two calendars.",
  },
  {
    stat: "2+ days",
    label: "elapsed",
    text: "How long a thread often takes to close, even when the meeting itself is 30 minutes.",
  },
];

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function CostCalculator() {
  const [meetings, setMeetings] = useState(10);
  const [minutes, setMinutes] = useState(8);
  const [rate, setRate] = useState(75);

  const hoursPerMonth = (meetings * minutes * 4.33) / 60;
  const cost = hoursPerMonth * rate;

  return (
    <section className="border-t border-line bg-fill">
      <div className="mx-auto max-w-[1200px] px-[18px] py-[64px] sm:px-[26px]">
        <div className="flex max-w-[680px] flex-col gap-[11px]">
          <Eyebrow>Why it matters</Eyebrow>
          <h2 className="m-0 font-serif text-[clamp(28px,3.6vw,44px)] leading-[1.04] font-normal tracking-[-0.02em] text-ink text-balance">
            Scheduling isn&apos;t admin. It shows up in your numbers.
          </h2>
        </div>

        <div className="mt-[26px] grid gap-[18px] lg:grid-cols-2">
          <div className="flex flex-col gap-[12px]">
            {RESEARCH.map((item) => (
              <div
                key={item.stat}
                className="flex gap-[16px] rounded-[12px] border border-line bg-surface p-[18px]"
              >
                <div className="flex flex-none flex-col">
                  <span className="font-serif text-[30px] leading-[1] text-accent">
                    {item.stat}
                  </span>
                  <span className="font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
                    {item.label}
                  </span>
                </div>
                <p className="m-0 text-[13px] leading-[1.6] text-ink-2 text-pretty">
                  {item.text}
                </p>
              </div>
            ))}
            <p className="m-0 text-[12px] leading-[1.55] text-ink-3">
              About appointment scheduling in general — not evidence about
              Meetrao.
            </p>
          </div>

          <div className="flex flex-col rounded-[12px] border border-line bg-surface p-[20px]">
            <span className="text-[14px] font-semibold text-ink">
              What the back-and-forth costs you
            </span>
            <span className="mt-[3px] text-[12.5px] text-ink-3">Example only</span>

            <div className="mt-[10px] flex flex-col">
              <Slider
                id="mr-cost-meetings"
                label="Meetings a week"
                display={String(meetings)}
                min={1}
                max={40}
                step={1}
                value={meetings}
                onChange={setMeetings}
                minLabel="1"
                maxLabel="40"
              />
              <Slider
                id="mr-cost-minutes"
                label="Minutes scheduling each"
                display={`${minutes} min`}
                min={1}
                max={30}
                step={1}
                value={minutes}
                onChange={setMinutes}
                minLabel="1 min"
                maxLabel="30 min"
              />
              <Slider
                id="mr-cost-rate"
                label="Your hourly rate"
                display={money(rate)}
                min={15}
                max={400}
                step={5}
                value={rate}
                onChange={setRate}
                minLabel="$15"
                maxLabel="$400"
              />
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-[10px] pt-[14px]">
              <div className="flex flex-col gap-[2px]">
                <span className="font-serif text-[38px] leading-[1] text-accent">
                  {money(cost)}
                </span>
                <span className="text-[12.5px] text-ink-3">
                  {hoursPerMonth.toFixed(1)} hours of your month
                </span>
              </div>
              <span className="inline-flex h-[26px] items-center rounded-[6px] border border-accent-line bg-accent-soft px-[11px] text-[12.5px] font-semibold text-accent">
                Meetrao: $0
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Slider({
  id,
  label,
  display,
  min,
  max,
  step,
  value,
  onChange,
  minLabel,
  maxLabel,
}: {
  id: string;
  label: string;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
  minLabel: string;
  maxLabel: string;
}) {
  return (
    <div className="flex flex-col gap-[10px] border-b border-line-soft py-[13px]">
      <div className="flex items-baseline justify-between gap-[12px]">
        <label htmlFor={id} className="cursor-pointer text-[13.5px] font-medium text-ink-2">
          {label}
        </label>
        <span className="font-mono text-[16px] font-medium text-accent">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-[44px] w-full cursor-pointer accent-[var(--accent)] sm:h-[24px]"
      />
      <div className="flex justify-between gap-[10px]">
        <span className="font-mono text-[10.5px] text-ink-3">{minLabel}</span>
        <span className="font-mono text-[10.5px] text-ink-3">{maxLabel}</span>
      </div>
    </div>
  );
}
