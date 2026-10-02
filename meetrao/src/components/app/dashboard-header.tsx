"use client";

import { useMemo } from "react";
import { greetingFor } from "@/lib/booking/time";
import { useNow } from "@/lib/use-client-value";

/* The dashboard's greeting and clock. Re-reads the time every 30 seconds, so
   the line beside the greeting is never stale by more than half a minute.

   The server's `now` is rendered first and the browser's clock takes over on
   hydration, so the markup matches and nothing flashes.

   This line was the first thing moved off DM Mono, before the family was
   dropped from the product entirely: at 11.5px with 0.04em tracking it read as
   a machine stamp under a serif greeting. The tracking went with it, mono's
   letter-spacing is wrong on a proportional face. */
export function DashboardHeader({
  firstName,
  timeZone,
  initialNow,
}: {
  firstName: string;
  timeZone: string;
  initialNow: string;
}) {
  const serverNow = useMemo(() => new Date(initialNow), [initialNow]);
  const now = useNow(30_000, serverNow);

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
        <span className="text-[12.5px] text-ink-2">{date}</span>
        <span aria-hidden="true" className="h-[3px] w-[3px] flex-none rounded-full bg-line-strong" />
        <span className="text-[12.5px] text-ink-2">{time}</span>
      </div>
    </div>
  );
}
