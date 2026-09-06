"use client";

import { useEffect, useState } from "react";
import {
  formatLongDate,
  formatTime,
  greetingInZone,
} from "@/lib/booking/time";
import { useHydrated } from "@/lib/use-hydrated";

/** Same helpers the server used to seed `initial`, so the two cannot drift. */
function read(timezone: string) {
  const now = new Date();
  return {
    greeting: greetingInZone(now, timezone),
    date: formatLongDate(now, timezone),
    time: formatTime(now, timezone),
  };
}

const TICK_MS = 30_000;

/**
 * The dashboard greeting. Renders the server-seeded value until hydration,
 * then reads the real clock and re-reads it every 30 seconds, as the design
 * specifies.
 */
export function DashboardGreeting({
  firstName,
  timezone,
  initial,
}: {
  firstName: string;
  timezone: string;
  initial: { greeting: string; date: string; time: string };
}) {
  const hydrated = useHydrated();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Recomputed on every tick; cheap, and avoids holding the clock in state.
  const clock = hydrated ? read(timezone) : initial;

  return (
    <div className="flex min-w-0 flex-col gap-[7px]">
      <h1 className="m-0 font-serif text-[clamp(30px,3.4vw,38px)] leading-[1.08] font-normal tracking-[-0.012em] text-ink">
        {clock.greeting}, {firstName}.
      </h1>
      <div className="flex flex-wrap items-center gap-[9px]">
        <span className="font-mono text-[11.5px] tracking-[0.04em] text-ink-2">
          {clock.date}
        </span>
        <span
          aria-hidden="true"
          className="size-[3px] flex-none rounded-full bg-line-strong"
        />
        <span className="font-mono text-[11.5px] tracking-[0.04em] text-ink-2">
          {clock.time}
        </span>
      </div>
    </div>
  );
}
