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
import { embedSnippet } from "@/lib/embed";
import { Modal } from "@/components/ui/modal";
import { cx } from "@/lib/cx";
import { copyText } from "@/lib/clipboard";
import { LOCATION_OPTIONS } from "@/lib/locations";

export type MeetingRow = {
  id: string;
  name: string;
  description: string;
  duration: number;
  slug: string;
  active: boolean;
  link: string;
  previewHref: string;
  /** "google_meet", "phone", "in_person" or "custom". */
  location: string;
};

/**
 * How the meeting happens, in the words the editor offers it under.
 *
 * "Something else" is the editor's prompt for the fourth kind, and reads as
 * nonsense on a card, so the list calls it a custom location instead.
 */
function locationLabel(kind: string): string {
  if (kind === "custom") return "Custom location";
  return LOCATION_OPTIONS.find((o) => o.value === kind)?.label ?? "Google Meet";
}

/**
 * The card's one-line summary: duration, then location.
 *
 * Built from the parts that exist and joined, rather than written as
 * "{duration} · {description}", which printed "15 min ·" with a stray dot for
 * every meeting without a description. The description has a line of its
 * own now, clamped, so a long one cannot push the rest of the card down.
 */
function summary(m: MeetingRow): string {
  return [`${m.duration} min`, locationLabel(m.location)].filter(Boolean).join(" · ");
}

/**
 * The bookable switch with its state written beside it.
 *
 * A bare switch said nothing to anybody who does not already read the
 * green-means-on convention. The visible On/Off is aria-hidden because
 * role="switch" already announces checked or not; the accessible name says
 * what the switch controls, which is the part a screen reader cannot work
 * out on its own. The label wraps both, so the word is a click target too.
 */
function BookableSwitch({
  meeting,
  checked,
  disabled,
  onToggle,
}: {
  meeting: MeetingRow;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-[8px]">
      <Switch checked={checked} disabled={disabled} onChange={onToggle} label={`Bookable: ${meeting.name}`} />
      <span
        aria-hidden="true"
        className={cx("w-[22px] text-[12.5px]", checked ? "font-semibold text-ink" : "text-ink-3")}
      >
        {checked ? "On" : "Off"}
      </span>
    </label>
  );
}

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
    /* THE SPACE THIS HAS, not the size of the screen. It switched to cards
       below a 640px VIEWPORT, but the sidebar appears at 820 and takes its
       share, so from 820 up to about 1160 the table was wider than the room
       left for it: at 860 the Edit button sat 182px past the card's edge,
       behind a sideways scroll that macOS does not even draw. A container
       query asks the question that matters, which is whether the table fits
       where it is. */
    <div className="@container flex flex-col gap-[12px]">
      <TableCard className="@max-[800px]:hidden">
        <Table minWidth={640}>
          <thead>
            <tr>
              <Th className="w-[32%] min-w-[230px]">Meeting</Th>
              <Th>Duration</Th>
              {/* A share of the width with no floor. With max-w-0 on its
                  cells the column's minimum is nothing, so it takes the room
                  that is left and the chip truncates only once there is not
                  enough of it, rather than at a fixed 168px on any screen. */}
              <Th className="w-[34%]">Booking link</Th>
              <Th>Bookable</Th>
              <Th align="right">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => (
              <Tr key={m.id}>
                <Td className="py-[11px]">
                  <div className="flex max-w-[300px] flex-col gap-[2px]">
                    <span
                      className={cx("text-[13.5px] font-semibold", isActive(m) ? "text-ink" : "text-ink-2")}
                    >
                      {m.name}
                    </span>
                    {/* Where it happens, because a phone call and a Meet
                        looked identical in this list. */}
                    <span className="text-[12px] text-ink-2">{locationLabel(m.location)}</span>
                    {/* Two lines at most. A paragraph-long description made
                        one row as tall as the rest of the list together. */}
                    {m.description ? (
                      <span className="line-clamp-2 text-[12.5px] leading-[1.45] text-pretty text-ink-3">
                        {m.description}
                      </span>
                    ) : null}
                  </div>
                </Td>
                <Td className="py-[11px] text-[13px] whitespace-nowrap text-ink">{m.duration} min</Td>
                <Td className="max-w-0 py-[11px]">
                  <CopyLinkChip link={m.link} fill />
                </Td>
                <Td className="py-[11px] whitespace-nowrap">
                  <BookableSwitch meeting={m} checked={isActive(m)} disabled={pending} onToggle={() => toggle(m)} />
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
                  {/* Deleting lives on the edit screen, not here. A fourth
                      text button pushed this column past the viewport at
                      1161px and put a horizontal scrollbar on the page, and
                      there is no trash glyph in the set to shrink it to. */}
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

      <div className="hidden flex-col gap-[10px] @max-[800px]:flex">
        {meetings.map((m) => (
          <div key={m.id} className="flex flex-col gap-[10px] rounded-[8px] border border-line bg-surface p-[14px]">
            <div className="flex items-start justify-between gap-[12px]">
              <div className="flex min-w-0 flex-col gap-[2px]">
                <span className={cx("text-[13.5px] font-semibold", isActive(m) ? "text-ink" : "text-ink-2")}>
                  {m.name}
                </span>
                <span className="text-[12.5px] leading-[1.45] text-ink-2">{summary(m)}</span>
                {m.description ? (
                  <span className="line-clamp-2 text-[12.5px] leading-[1.45] text-ink-3">{m.description}</span>
                ) : null}
              </div>
              <BookableSwitch meeting={m} checked={isActive(m)} disabled={pending} onToggle={() => toggle(m)} />
            </div>
            {/* A block wrapper, so the chip is as wide as its link (up to the
                card) rather than stretched across it by the column. */}
            <div className="min-w-0">
              <CopyLinkChip link={m.link} fill />
            </div>
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
            </div>
          </div>
        ))}
      </div>

      <span className="text-[12.5px] text-ink-3">
        Meetings switched off stay in this list, but nobody can book them until you switch them back on.
      </span>

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
