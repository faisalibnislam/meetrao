"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { TableCard } from "@/components/ui/panels";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { CopyLinkChip } from "./copy-link";
import { setMeetingActive } from "@/lib/actions/meetings";
import { cx } from "@/lib/cx";

export type MeetingRow = {
  id: string;
  name: string;
  description: string;
  duration: number;
  slug: string;
  active: boolean;
  link: string;
  previewHref: string;
};

/* Inactive meetings stay in the list but cannot be booked, so the name drops to
   --ink-2 rather than the row disappearing. */
export function MeetingsTable({ meetings }: { meetings: MeetingRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startToggle] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const isActive = (m: MeetingRow) => optimistic[m.id] ?? m.active;

  const toggle = (m: MeetingRow) => {
    const next = !isActive(m);
    setOptimistic((o) => ({ ...o, [m.id]: next }));
    startToggle(async () => {
      const result = await setMeetingActive(m.id, next);
      if (result.error) {
        setOptimistic((o) => ({ ...o, [m.id]: !next }));
        toast({ tone: "bad", title: "Could not save", text: result.error });
        return;
      }
      toast({ tone: "ok", title: next ? "Meeting enabled" : "Meeting disabled", text: m.name });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-[12px]">
      <TableCard className="max-[640px]:hidden">
        <Table minWidth={640}>
          <thead>
            <tr>
              <Th className="w-[36%] min-w-[230px]">Meeting</Th>
              <Th>Duration</Th>
              <Th>Booking link</Th>
              <Th>Active</Th>
              <Th align="right">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => (
              <Tr key={m.id}>
                <Td className="py-[11px]">
                  <div className="flex max-w-[270px] flex-col gap-[2px]">
                    <span
                      className={cx("text-[13.5px] font-semibold", isActive(m) ? "text-ink" : "text-ink-2")}
                    >
                      {m.name}
                    </span>
                    <span className="text-[12.5px] leading-[1.45] text-pretty text-ink-3">{m.description}</span>
                  </div>
                </Td>
                <Td className="py-[11px] text-[13px] whitespace-nowrap text-ink">{m.duration} min</Td>
                <Td className="py-[11px]">
                  <CopyLinkChip link={m.link} />
                </Td>
                <Td className="py-[11px]">
                  <Switch
                    checked={isActive(m)}
                    disabled={pending}
                    onChange={() => toggle(m)}
                    label={`${m.name} bookable`}
                  />
                </Td>
                <Td className="py-[11px] text-right whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size={26}
                    className="mr-[4px] hover:bg-fill-2"
                    onClick={() => window.open(m.previewHref, "_blank", "noopener,noreferrer")}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="secondary"
                    size={26}
                    className="hover:bg-fill-2"
                    onClick={() => router.push(`/meetings/${m.id}/edit`)}
                  >
                    Edit
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableCard>

      <div className="hidden flex-col gap-[10px] max-[640px]:flex">
        {meetings.map((m) => (
          <div key={m.id} className="flex flex-col gap-[10px] rounded-[8px] border border-line bg-surface p-[14px]">
            <div className="flex items-start justify-between gap-[12px]">
              <div className="flex flex-col gap-[2px]">
                <span className={cx("text-[13.5px] font-semibold", isActive(m) ? "text-ink" : "text-ink-2")}>
                  {m.name}
                </span>
                <span className="text-[12.5px] leading-[1.45] text-ink-3">
                  {m.duration} min · {m.description}
                </span>
              </div>
              <Switch
                checked={isActive(m)}
                disabled={pending}
                onChange={() => toggle(m)}
                label={`${m.name} bookable`}
              />
            </div>
            <CopyLinkChip link={m.link} />
            <div className="flex flex-wrap gap-[8px]">
              <Button
                variant="ghost"
                size={36}
                onClick={() => window.open(m.previewHref, "_blank", "noopener,noreferrer")}
              >
                Preview
              </Button>
              <Button variant="secondary" size={36} onClick={() => router.push(`/meetings/${m.id}/edit`)}>
                Edit
              </Button>
            </div>
          </div>
        ))}
      </div>

      <span className="text-[12.5px] text-ink-3">
        Inactive meetings stay in this list but can&rsquo;t be booked from your link.
      </span>
    </div>
  );
}
