"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";

export type CopyTarget = { id: string; name: string; link: string };

const FLASH_MS = 1800;

/** Clipboard write with a fallback for non-secure contexts. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/**
 * One button when 0–1 meetings are active; a dropdown listing "All meetings"
 * plus one row per active meeting when there is more than one.
 */
export function CopyLinkButton({
  allLink,
  targets,
}: {
  /** The catch-all link, e.g. meetrao.com/faisal */
  allLink: string;
  /** One entry per ACTIVE meeting type. */
  targets: CopyTarget[];
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { notify } = useToast();

  const isMenu = targets.length > 1;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function run(key: string, link: string) {
    const ok = await copyText(link);
    if (!ok) {
      notify("bad", "Could not copy", "Copy the link from the address bar instead.");
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setCopied(key);
    notify("ok", "Copied", link);
    timer.current = setTimeout(() => setCopied(""), FLASH_MS);
  }

  const flashed = copied === "all";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={isMenu ? open : undefined}
        aria-haspopup={isMenu ? "menu" : undefined}
        onClick={() => (isMenu ? setOpen((v) => !v) : run("all", allLink))}
        className="inline-flex h-[32px] cursor-pointer items-center gap-[7px] rounded-[6px] border border-line-strong bg-surface px-[11px] text-[12.5px] font-semibold whitespace-nowrap text-ink hover:bg-fill"
      >
        <Icon
          name={flashed ? "check" : "copy"}
          weight={flashed ? 900 : 300}
          size={11}
        />
        <span>{flashed ? "Copied" : "Copy link"}</span>
        {isMenu ? (
          <Icon
            name="chevronDown"
            size={9}
            className="ml-[1px] text-ink-3 transition-transform duration-[140ms]"
            style={{ transform: `rotate(${open ? 180 : 0}deg)` }}
          />
        ) : null}
      </button>

      {isMenu && open ? (
        <div
          role="menu"
          className="animate-mu-in absolute top-[calc(100%+6px)] right-0 z-[90] min-w-[272px] rounded-[8px] border border-line bg-surface p-[6px] shadow-[var(--pop)]"
        >
          <span className="block px-[8px] pt-[6px] pb-[7px] font-mono text-[10px] tracking-[0.07em] uppercase text-ink-3">
            Copy a booking link
          </span>
          <div className="flex flex-col gap-[2px]">
            {[{ id: "all", name: "All meetings", link: allLink }, ...targets].map(
              (target) => {
                const done = copied === target.id;
                return (
                  <button
                    key={target.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      void run(target.id, target.link);
                    }}
                    className="box-border flex w-full cursor-pointer items-center gap-[10px] rounded-[6px] border-0 bg-transparent px-[8px] py-[7px] hover:bg-fill"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-[1px] text-left">
                      <span className="text-[13px] font-semibold text-ink">
                        {target.name}
                      </span>
                      <span className="truncate font-mono text-[11px] text-ink-3">
                        {target.link}
                      </span>
                    </span>
                    <Icon
                      name={done ? "check" : "copy"}
                      weight={done ? 900 : 300}
                      size={11}
                      className={cn(done ? "text-accent" : "text-ink-3")}
                    />
                  </button>
                );
              },
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** The inline copy chip used in the Meetings table's "Booking link" column. */
export function CopyLinkChip({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { notify } = useToast();

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <button
      type="button"
      title="Copy link"
      onClick={async () => {
        const ok = await copyText(link);
        if (!ok) {
          notify("bad", "Could not copy", "Copy the link manually instead.");
          return;
        }
        if (timer.current) clearTimeout(timer.current);
        setCopied(true);
        notify("ok", "Copied", link);
        timer.current = setTimeout(() => setCopied(false), FLASH_MS);
      }}
      className="inline-flex h-[26px] max-w-[168px] cursor-pointer items-center gap-[7px] rounded-[5px] border border-line bg-fill px-[8px] font-mono text-[11.5px] text-ink-2 hover:bg-fill-2 hover:text-ink"
    >
      <span className="min-w-0 truncate">{link}</span>
      <Icon
        name={copied ? "check" : "copy"}
        weight={copied ? 900 : 300}
        size={10}
      />
    </button>
  );
}
