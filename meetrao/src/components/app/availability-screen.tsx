"use client";

import { useMemo, useState } from "react";
import { MenuSelect } from "@/components/ui/menu-select";
import { timezoneOptions } from "@/lib/timezones";
import { AvailabilityEditor } from "./availability-editor";

/**
 * App › Availability. The timezone select sits above the editor and feeds it,
 * so a zone change is saved by the same "Save availability" press.
 */
export function AvailabilityScreen({
  timezone,
  rules,
}: {
  timezone: string;
  rules: ReadonlyArray<{
    weekday: number;
    start_minute: number;
    end_minute: number;
  }>;
}) {
  const [zone, setZone] = useState(timezone);
  const options = useMemo(() => timezoneOptions(), []);

  return (
    <div className="mx-auto flex w-full max-w-[660px] flex-col gap-[18px]">
      <div className="flex flex-wrap items-end gap-[16px] border-b border-line pb-[18px]">
        <div className="flex min-w-[220px] flex-1 flex-col gap-[6px]">
          <span className="text-[12.5px] font-semibold text-ink">Timezone</span>
          <MenuSelect
            label="Timezone"
            searchable
            options={options}
            value={zone}
            onChange={setZone}
          />
        </div>
        <p className="m-0 min-w-[200px] flex-1 text-[12.5px] leading-[1.5] text-pretty text-ink-3">
          Guests always see these hours converted into their own timezone.
        </p>
      </div>

      <AvailabilityEditor initialRules={rules} timezone={zone} />
    </div>
  );
}
