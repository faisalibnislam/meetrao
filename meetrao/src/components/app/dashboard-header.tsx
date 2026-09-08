"use client";

import { useEffect, useState } from "react";
import { greetingFor } from "@/lib/booking/time";

/* The dashboard's greeting and clock. Re-renders every 30 seconds, so the time
   beside the greeting is never stale by more than half a minute.

   Rendered from the server's `now` on the first paint and only then handed to
   the browser's clock, so the markup matches and hydration stays quiet. */
export function DashboardHeader({
  firstName,
  timeZone,
  initialNow,
}: {
  firstName: string;
  timeZone: string;
  initialNow: string;
}) {
  const [now, setNow] = useState(() => new Date(initialNow));

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(now);

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(now);

  return (
    <div className="flex min-w-0 flex-col gap-[7px]">
      <h1 className="m-0 font-serif text-[clamp(30px,3.4vw,38px)] leading-[1.08] font-normal tracking-[-0.012em] text-ink">
        {greetingFor(now, timeZone)}, {firstName}.
      </h1>
      <div className="flex flex-wrap items-center gap-[9px]">
        <span className="font-mono text-[11.5px] tracking-[0.04em] text-ink-2">{date}</span>
        <span aria-hidden="true" className="h-[3px] w-[3px] flex-none rounded-full bg-line-strong" />
        <span className="font-mono text-[11.5px] tracking-[0.04em] text-ink-2">{time}</span>
      </div>
    </div>
  );
}
