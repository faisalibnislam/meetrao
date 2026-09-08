"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { MenuSelect } from "@/components/ui/menu-select";
import { useToast } from "@/components/ui/toast";
import { AvailabilityEditor } from "./availability-editor";
import { daysToRules, type Day } from "@/lib/availability";
import { saveAvailability } from "@/lib/actions/availability";
import type { TimezoneOption } from "@/lib/timezones";
import { cx } from "@/lib/cx";

/* Any edit marks the schedule dirty again; the status label beside Save is the
   only thing that says whether what is on screen is what guests will see. */
export function AvailabilityScreen({
  initialDays,
  initialTimezone,
  timezones,
}: {
  initialDays: Day[];
  initialTimezone: string;
  timezones: TimezoneOption[];
}) {
  const toast = useToast();
  const [days, setDays] = useState(initialDays);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [saved, setSaved] = useState(true);
  const [saving, startSave] = useTransition();

  const dirty = (next: () => void) => {
    setSaved(false);
    next();
  };

  return (
    <div className="mx-auto flex w-full max-w-[660px] flex-col gap-[18px]">
      <div className="flex flex-wrap items-end gap-[16px] border-b border-line pb-[18px]">
        <div className="flex min-w-[220px] flex-1 flex-col gap-[6px]">
          <span className="text-[12.5px] font-semibold text-ink">Timezone</span>
          <MenuSelect
            searchable
            aria-label="Timezone"
            options={timezones}
            value={timezone}
            onChange={(v) => dirty(() => setTimezone(v))}
          />
        </div>
        <p className="m-0 min-w-[200px] flex-1 text-[12.5px] leading-[1.5] text-pretty text-ink-3">
          Guests always see these hours converted into their own timezone.
        </p>
      </div>

      <AvailabilityEditor days={days} onChange={(next) => dirty(() => setDays(next))} />

      <div className="flex flex-wrap items-center gap-[12px]">
        <Button
          variant="accent"
          size={36}
          busy={saving}
          onClick={() =>
            startSave(async () => {
              const result = await saveAvailability({ timezone, rules: daysToRules(days) });
              if (result.error) {
                toast({ tone: "bad", title: "Could not save", text: result.error });
                return;
              }
              setSaved(true);
              toast({ tone: "ok", title: "Availability saved", text: "Guests see these hours from now on." });
            })
          }
        >
          {saving ? "Saving…" : "Save availability"}
        </Button>
        <span
          role="status"
          aria-live="polite"
          className={cx("inline-flex items-center gap-[7px] text-[12.5px]", saved ? "text-accent" : "text-ink-3")}
        >
          {saved ? "All changes saved" : "Unsaved changes"}
        </span>
      </div>
    </div>
  );
}
