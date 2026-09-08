"use client";

import { useState } from "react";

/* "What the back-and-forth costs you" — an illustration, labelled as one.
   Four weeks a month reproduces the brief's worked example: 10 × 8 min is
   5.3 hrs, about $400 at $75. */

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function CostCalculator() {
  const [meetings, setMeetings] = useState(10);
  const [minutes, setMinutes] = useState(8);
  const [rate, setRate] = useState(75);

  const hours = (meetings * 4 * minutes) / 60;
  const cost = hours * rate;

  const sliders = [
    {
      id: "mr-cost-meetings",
      label: "Meetings a week",
      display: String(meetings),
      min: 1,
      max: 40,
      step: 1,
      value: meetings,
      minLabel: "1",
      maxLabel: "40",
      set: setMeetings,
    },
    {
      id: "mr-cost-minutes",
      label: "Minutes scheduling each",
      display: `${minutes} min`,
      min: 1,
      max: 30,
      step: 1,
      value: minutes,
      minLabel: "1 min",
      maxLabel: "30 min",
      set: setMinutes,
    },
    {
      id: "mr-cost-rate",
      label: "Your hourly rate",
      display: money(rate),
      min: 15,
      max: 400,
      step: 5,
      value: rate,
      minLabel: "$15",
      maxLabel: "$400",
      set: setRate,
    },
  ];

  return (
    <div className="box-border flex flex-col gap-[16px] self-start rounded-[14px] border border-line bg-surface p-[24px] shadow-[var(--pop)]">
      <div className="flex flex-wrap items-baseline justify-between gap-[10px]">
        <span className="text-[15px] font-semibold text-ink">What the back-and-forth costs you</span>
        <span className="font-mono text-[10px] tracking-[0.07em] text-ink-3 uppercase">Example only</span>
      </div>

      {sliders.map((slider) => (
        <div key={slider.id} className="flex flex-col gap-[10px] border-b border-line-soft py-[13px]">
          <div className="flex items-baseline justify-between gap-[12px]">
            <label htmlFor={slider.id} className="cursor-pointer text-[13.5px] font-medium text-ink-2">
              {slider.label}
            </label>
            <span className="font-mono text-[16px] font-medium text-accent">{slider.display}</span>
          </div>
          <input
            id={slider.id}
            type="range"
            className="mr-range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={slider.value}
            onChange={(e) => slider.set(Number(e.target.value))}
          />
          <div className="flex justify-between gap-[10px]">
            <span className="font-mono text-[10.5px] text-ink-3">{slider.minLabel}</span>
            <span className="font-mono text-[10.5px] text-ink-3">{slider.maxLabel}</span>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-baseline justify-between gap-[10px] pt-[14px]">
        <div className="flex flex-col gap-[2px]">
          <span className="font-serif text-[38px] leading-[1] text-accent">≈ {money(cost)}/mo</span>
          <span className="text-[12.5px] text-ink-3">{hours.toFixed(1)} hrs of your month</span>
        </div>
        <span className="inline-flex h-[26px] items-center rounded-[6px] border border-accent-line bg-accent-soft px-[11px] text-[12.5px] font-semibold text-accent">
          Meetrao: $0
        </span>
      </div>
    </div>
  );
}
