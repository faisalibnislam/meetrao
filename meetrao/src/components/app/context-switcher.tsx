"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { setContext } from "@/lib/actions/context";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Which company you are working in, at the top of the rail.

   NOT RENDERED AT ALL for somebody with no companies, which is most accounts.
   A switcher offering one choice is a control that teaches people the product
   has a concept they do not have, every time they open it.

   Switching changes what Meetings lists and what a new meeting is filed
   under. It does not change what anybody can see: the cookie is a preference,
   checked against real memberships on every read, so a forged one selects a
   context the person is already in or none at all.
   ───────────────────────────────────────────────────────────────────────────── */

export type ContextOption = { id: string | null; name: string };

export function ContextSwitcher({
  options,
  activeId,
}: {
  options: ContextOption[];
  activeId: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, startBusy] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [open]);

  // One choice is no choice. See the note above.
  if (options.length < 2) return null;

  const active = options.find((o) => o.id === activeId) ?? options[0];

  function choose(id: string | null) {
    setOpen(false);
    if (id === activeId) return;
    startBusy(async () => {
      const result = await setContext(id);
      if (result.error) {
        toast({ tone: "bad", title: "Could not switch", text: result.error });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div ref={box} className="relative mb-[10px] max-[820px]:hidden">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Working in ${active.name}. Switch company.`}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="box-border flex w-full cursor-pointer items-center gap-[8px] rounded-[7px] border border-line bg-surface px-[10px] py-[7px] text-left hover:bg-fill"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
          <span className="text-[10px] tracking-[0.1em] text-ink-3 uppercase">Working in</span>
          <span className="overflow-hidden text-[12.5px] font-semibold text-ellipsis whitespace-nowrap text-ink">
            {active.name}
          </span>
        </span>
        <Icon
          name="chevron-down"
          size={10}
          className="flex-none text-ink-3 transition-transform duration-[140ms]"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-in absolute top-[calc(100%+5px)] right-0 left-0 z-90 rounded-[8px] border border-line bg-surface p-[5px] shadow-[var(--pop)]"
        >
          {options.map((o) => (
            <button
              key={o.id ?? "personal"}
              type="button"
              role="menuitemradio"
              aria-checked={o.id === activeId}
              onClick={() => choose(o.id)}
              className={cx(
                "box-border flex w-full cursor-pointer items-center gap-[8px] rounded-[6px] border-0 px-[9px] py-[7px] text-left text-[12.5px]",
                o.id === activeId ? "bg-accent-soft font-semibold text-accent-ink" : "bg-transparent text-ink hover:bg-fill",
              )}
            >
              <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{o.name}</span>
              {o.id === activeId ? (
                <Icon name="check" weight="solid" size={10} className="flex-none" aria-hidden="true" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
