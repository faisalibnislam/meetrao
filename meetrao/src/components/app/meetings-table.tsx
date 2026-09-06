"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { CopyLinkChip } from "./copy-link";
import { setMeetingTypeActive } from "@/lib/actions/meetings";

const TH =
  "border-b border-line bg-fill px-[14px] py-[9px] font-mono text-[10px] font-normal tracking-[0.07em] whitespace-nowrap uppercase text-ink-2";

export type MeetingRow = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  slug: string;
  link: string;
  isActive: boolean;
  /** Where "Preview" opens. */
  previewHref: string;
};

export function MeetingsTable({ meetings }: { meetings: MeetingRow[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [, startTransition] = useTransition();
  // Optimistic switch state, so the toggle does not wait on a round trip.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  function toggle(meeting: MeetingRow, next: boolean) {
    setOverrides((o) => ({ ...o, [meeting.id]: next }));
    startTransition(async () => {
      const result = await setMeetingTypeActive(meeting.id, next);
      if (!result.ok) {
        setOverrides((o) => ({ ...o, [meeting.id]: !next }));
        notify("bad", "Could not update", result.message ?? "Try again.");
        return;
      }
      notify(
        "ok",
        next ? "Meeting enabled" : "Meeting disabled",
        meeting.name,
      );
    });
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className={`${TH} w-[36%] min-w-[230px] text-left`}>
                  Meeting
                </th>
                <th className={`${TH} text-left`}>Duration</th>
                <th className={`${TH} text-left`}>Booking link</th>
                <th className={`${TH} text-left`}>Active</th>
                <th className={`${TH} text-right`} />
              </tr>
            </thead>
            <tbody>
              {meetings.map((meeting) => {
                const active = overrides[meeting.id] ?? meeting.isActive;
                return (
                  <tr
                    key={meeting.id}
                    className="border-b border-line-soft transition-colors duration-[120ms] hover:bg-fill"
                  >
                    <td className="px-[14px] py-[11px] align-middle">
                      <div className="flex max-w-[270px] flex-col gap-[2px]">
                        <span
                          className={`text-[13.5px] font-semibold ${active ? "text-ink" : "text-ink-2"}`}
                        >
                          {meeting.name}
                        </span>
                        <span className="text-[12.5px] leading-[1.45] text-pretty text-ink-3">
                          {meeting.description}
                        </span>
                      </div>
                    </td>
                    <td className="px-[14px] py-[11px] align-middle text-[13px] whitespace-nowrap text-ink">
                      {meeting.durationMinutes} min
                    </td>
                    <td className="px-[14px] py-[11px] align-middle">
                      <CopyLinkChip link={meeting.link} />
                    </td>
                    <td className="px-[14px] py-[11px] align-middle">
                      <Switch
                        label={`${meeting.name} active`}
                        checked={active}
                        onChange={(next) => toggle(meeting, next)}
                      />
                    </td>
                    <td className="px-[14px] py-[11px] text-right align-middle whitespace-nowrap">
                      <span className="mr-[4px] inline-flex">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => router.push(meeting.previewHref)}
                        >
                          Preview
                        </Button>
                      </span>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() =>
                          router.push(`/meetings/${meeting.id}/edit`)
                        }
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <span className="text-[12.5px] text-ink-3">
        Inactive meetings stay in this list but can&apos;t be booked from your
        link.
      </span>
    </div>
  );
}
