"use client";

import { useState } from "react";
import { GoogleG } from "@/components/brand/logo";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";

const REASONS = [
  "See when you are busy, so guests are never offered a time you cannot make.",
  "Add each booking to your calendar with a Meet link, automatically.",
];

/**
 * The amber "Google Calendar isn't connected" banner and its permissions
 * dialog. Consent itself is a full navigation to /api/google/connect.
 */
export function ConnectCalendarBanner({ returnTo }: { returnTo: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-[12px] rounded-[8px] border border-amber-line bg-amber-soft px-[14px] py-[11px]">
        <Icon
          name="triangleExclamation"
          weight={900}
          size={13}
          className="text-amber"
        />
        <span className="min-w-[220px] flex-1 text-[13px] text-amber-ink">
          <strong className="font-semibold">
            Google Calendar isn&apos;t connected.
          </strong>{" "}
          Meetrao can&apos;t check for conflicts or add bookings to your
          calendar.
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-[28px] cursor-pointer items-center gap-[7px] rounded-[6px] border border-amber-line bg-white/75 px-[10px] text-[12.5px] font-semibold text-amber-ink hover:bg-white"
        >
          <GoogleG size={13} />
          Connect
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Connect Google Calendar"
        subtitle="Meetrao will ask for two permissions"
        primaryLabel="Allow access"
        primaryHref={`/api/google/connect?next=${encodeURIComponent(returnTo)}`}
        secondaryLabel="Later"
        onSecondary={() => setOpen(false)}
      >
        <div className="flex flex-col gap-[11px]">
          {REASONS.map((reason) => (
            <div key={reason} className="flex items-start gap-[10px]">
              <Icon
                name="check"
                weight={900}
                size={10}
                className="mt-[4px] text-accent"
              />
              <span className="text-[13px] leading-[1.5] text-ink-2">
                {reason}
              </span>
            </div>
          ))}
          <span className="text-[12px] text-ink-3">
            Meetrao never reads the contents of your events.
          </span>
        </div>
      </Modal>
    </>
  );
}
