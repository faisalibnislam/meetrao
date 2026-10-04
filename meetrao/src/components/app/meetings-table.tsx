"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { TableCard } from "@/components/ui/panels";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { CopyLinkChip } from "./copy-link";
import { deleteMeeting, setMeetingActive } from "@/lib/actions/meetings";
import { embedSnippet } from "@/lib/embed";
import { Modal } from "@/components/ui/modal";
import { cx } from "@/lib/cx";
import { copyText } from "@/lib/clipboard";

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
export function MeetingsTable({
  meetings,
  siteUrl,
  username,
}: {
  meetings: MeetingRow[];
  /** The origin the snippet points at, the deployed one, not the browser's. */
  siteUrl: string;
  username: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startToggle] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const isActive = (m: MeetingRow) => optimistic[m.id] ?? m.active;
  const [embedding, setEmbedding] = useState<MeetingRow | null>(null);
  const [copied, setCopied] = useState(false);
  /* The row being deleted, which is also what the dialog reads its name from.
     Holding the ROW rather than a boolean is what makes it impossible for the
     dialog to name one meeting and delete another. */
  const [deleting, setDeleting] = useState<MeetingRow | null>(null);
  const [removing, startRemove] = useTransition();

  function confirmDelete() {
    const target = deleting;
    if (!target) return;
    startRemove(async () => {
      const result = await deleteMeeting(target.id);
      if (result.error) {
        toast({ tone: "bad", title: "Could not delete", text: result.error });
        return;
      }
      setDeleting(null);
      toast({ tone: "neutral", title: "Meeting deleted", text: `${target.name} is gone from your links.` });
      router.refresh();
    });
  }

  const snippet = embedding
    ? embedSnippet({ siteUrl, username, slug: embedding.slug })
    : "";

  async function copySnippet() {
    try {
      if (!(await copyText(snippet))) throw new Error("clipboard refused");
      setCopied(true);
      toast({ tone: "ok", title: "Snippet copied", text: "Paste it where the booking form should appear." });
    } catch {
      // Clipboard permission is the host's to give; the textarea is right
      // there and selectable, so this is a nudge rather than a failure.
      toast({ tone: "warn", title: "Copy it by hand", text: "Your browser did not allow the clipboard." });
    }
  }

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
                    onClick={() => {
                      setCopied(false);
                      setEmbedding(m);
                    }}
                  >
                    Embed
                  </Button>
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
                    className="mr-[4px] hover:bg-fill-2"
                    onClick={() => router.push(`/meetings/${m.id}/edit`)}
                  >
                    Edit
                  </Button>
                  {/* Last, and ghost rather than danger-red: a red button in
                      every row turns the whole screen into a warning. The
                      dialog is where the weight belongs. */}
                  <Button
                    variant="ghost"
                    size={26}
                    className="hover:bg-red-soft hover:text-red"
                    aria-label={`Delete ${m.name}`}
                    onClick={() => setDeleting(m)}
                  >
                    Delete
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
                onClick={() => {
                  setCopied(false);
                  setEmbedding(m);
                }}
              >
                Embed
              </Button>
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
              <Button variant="ghost" size={36} aria-label={`Delete ${m.name}`} onClick={() => setDeleting(m)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <span className="text-[12.5px] text-ink-3">
        Inactive meetings stay in this list but can&rsquo;t be booked from your link.
      </span>

      {/* Names the meeting in the title, because a dialog that says "this
          meeting" is a dialog somebody confirms without reading. */}
      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete ${deleting.name}?` : "Delete this meeting?"}
        subtitle="The link stops working and the meeting goes from your list. Bookings already made stay where they are and keep their times: nobody is cancelled and no guest is told."
        primary={{ label: "Delete", variant: "danger", busy: removing, onClick: confirmDelete }}
        secondary={{ label: "Keep it", onClick: () => setDeleting(null) }}
      />

      <Modal
        open={Boolean(embedding)}
        wide
        onClose={() => setEmbedding(null)}
        title="Put this on your own site"
        subtitle={embedding ? `${embedding.name}, the booking form, inside your page.` : undefined}
        primary={{ label: copied ? "Copied" : "Copy snippet", onClick: copySnippet }}
        secondary={{ label: "Close", onClick: () => setEmbedding(null) }}
      >
        <div className="flex flex-col gap-[11px]">
          <span className="text-[13px] leading-[1.55] text-pretty text-ink-2">
            Paste this where the form should appear. It resizes itself as the guest moves through it, and it
            books exactly what your link books, the same times, the same rules.
          </span>
          {/* Read-only and selectable rather than a styled block: a host who
              cannot use the clipboard button can still select all of it. */}
          <textarea
            readOnly
            rows={8}
            value={snippet}
            aria-label="Embed snippet"
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded-[6px] border border-line bg-fill px-[12px] py-[10px] font-sans text-[12px] leading-[1.6] text-ink"
          />
          <span className="text-[12px] leading-[1.5] text-ink-3">
            Works on any site that takes HTML, Webflow, WordPress, Framer, a plain page. Inactive meetings
            show nothing, so switching one off takes it down everywhere at once.
          </span>
        </div>
      </Modal>
    </div>
  );
}
