"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Eyebrow } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cx } from "@/lib/cx";
import { copyText } from "@/lib/clipboard";

/* ─────────────────────────────────────────────────────────────────────────────
   The "Copy link" control.

   A single button when exactly one meeting is active. With more than one it
   becomes a dropdown with a row per meeting, because "copy link" is ambiguous
   the moment there is more than one link to copy.

   THERE IS NO ACCOUNT LINK. meetrao.com/<username> used to list somebody's
   meetings and offering it here was the main way people found it. It 404s
   now: every link names a specific meeting.
   ───────────────────────────────────────────────────────────────────────────── */

export type CopyTarget = { id: string; name: string; link: string };

const FLASH_MS = 1800;

export function CopyLinkControl({ meetings }: { meetings: CopyTarget[] }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isMenu = meetings.length > 1;
  const rows: CopyTarget[] = meetings;
  /* With nothing active there is no link to copy at all, and a button that
     copies an address which 404s is worse than no button. */
  const only = meetings.length === 1 ? meetings[0] : null;

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [open]);

  async function copy(id: string, link: string) {
    if (!(await copyText(`https://${link}`))) {
      toast({ tone: "warn", title: "Copy it by hand", text: `https://${link}` });
      return;
    }
    clearTimeout(timer.current);
    setCopied(id);
    toast({ tone: "ok", title: "Copied", text: link });
    timer.current = setTimeout(() => setCopied(null), FLASH_MS);
  }

  const flashed = Boolean(only && copied === only.id);

  if (!isMenu && !only) return null;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={isMenu ? open : undefined}
        aria-haspopup={isMenu ? "menu" : undefined}
        onClick={() => (isMenu ? setOpen((v) => !v) : only ? copy(only.id, only.link) : undefined)}
        className="inline-flex h-[32px] cursor-pointer items-center gap-[7px] rounded-[6px] border border-line-strong bg-surface px-[11px] font-sans text-[12.5px] font-semibold whitespace-nowrap text-ink hover:bg-fill"
      >
        <Icon name={flashed ? "check" : "copy"} weight={flashed ? "solid" : "light"} size={11} />
        <span>{flashed ? "Copied" : "Copy link"}</span>
        {isMenu ? (
          <Icon
            name="chevron-down"
            size={9}
            className="ml-[1px] text-ink-3 transition-transform duration-[140ms]"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        ) : null}
      </button>

      {isMenu && open ? (
        <div
          role="menu"
          className="animate-in absolute top-[calc(100%+6px)] right-0 z-90 min-w-[272px] rounded-[8px] border border-line bg-surface p-[6px] shadow-[var(--pop)]"
        >
          <Eyebrow className="block px-[8px] pt-[6px] pb-[7px]">Copy a booking link</Eyebrow>
          <div className="flex flex-col gap-[2px]">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  void copy(row.id, row.link);
                }}
                className="box-border flex w-full cursor-pointer items-center gap-[10px] rounded-[6px] border-0 bg-transparent px-[8px] py-[7px] hover:bg-fill"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-[1px] text-left">
                  <span className="text-[13px] font-semibold text-ink">{row.name}</span>
                  <span className="overflow-hidden text-[11px] text-ellipsis whitespace-nowrap text-ink-3">
                    {row.link}
                  </span>
                </span>
                <Icon
                  name={copied === row.id ? "check" : "copy"}
                  weight={copied === row.id ? "solid" : "light"}
                  size={11}
                  className={cx("flex-none", copied === row.id ? "text-accent-ink" : "text-ink-3")}
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** The small link chip in the Meetings table. */
export function CopyLinkChip({ link }: { link: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      title="Copy link"
      onClick={async () => {
        if (!(await copyText(`https://${link}`))) {
          toast({ tone: "warn", title: "Copy it by hand", text: `https://${link}` });
          return;
        }
        clearTimeout(timer.current);
        setCopied(true);
        toast({ tone: "ok", title: "Copied", text: link });
        timer.current = setTimeout(() => setCopied(false), FLASH_MS);
      }}
      className="inline-flex h-[26px] max-w-[168px] cursor-pointer items-center gap-[7px] rounded-[5px] border border-line bg-fill px-[8px] text-[11.5px] text-ink-2 hover:bg-fill-2 hover:text-ink"
    >
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{link}</span>
      <Icon name={copied ? "check" : "copy"} weight={copied ? "solid" : "light"} size={10} className="flex-none" />
    </button>
  );
}
