"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./icon";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   MenuSelect, the custom select used for every dropdown in the product.

   Behaviour that matters: it opens downward by default but flips upward when
   there is not enough room (measured against the nearest scrolling ancestor,
   with a configurable bottom inset), becomes searchable automatically above 12
   options, scrolls the current value into view on open, closes on click-outside
   or Escape, and opens on ArrowDown.
   ───────────────────────────────────────────────────────────────────────────── */

export type Option = { value: string; label: string };

export type MenuSelectProps = {
  options: readonly (Option | string)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "md";
  placement?: "auto" | "down" | "up";
  searchable?: boolean;
  /** Space to leave clear at the bottom of the viewport when measuring. */
  bottomInset?: number;
  id?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
  disabled?: boolean;
  className?: string;
};

const ROW_HEIGHT = 38;
const WANTED_PANEL = 280;

export function MenuSelect({
  options,
  value,
  onChange,
  placeholder = "Select",
  size = "md",
  placement = "auto",
  searchable,
  bottomInset = 52,
  id,
  disabled,
  className,
  ...aria
}: MenuSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [maxH, setMaxH] = useState(WANTED_PANEL);
  const [query, setQuery] = useState("");

  const opts: Option[] = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const current = opts.find((o) => o.value === value);
  const isSearchable = searchable === true || opts.length > 12;
  const q = query.trim().toLowerCase();
  const shown = q ? opts.filter((o) => o.label.toLowerCase().includes(q)) : opts;

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  /* Measure against the nearest clipping ancestor so the panel opens where
     there is room. A panel that opens into a scroll container's overflow is
     clipped, not scrolled into view. */
  const place = useCallback(() => {
    const el = rootRef.current;
    if (!el) return { up: false, maxH: WANTED_PANEL };

    const rect = el.getBoundingClientRect();
    let top = 0;
    let bottom = window.innerHeight;

    let node = el.parentElement;
    while (node && node !== document.body) {
      const oy = getComputedStyle(node).overflowY;
      if (oy === "auto" || oy === "scroll" || oy === "hidden") {
        const b = node.getBoundingClientRect();
        top = Math.max(top, b.top);
        bottom = Math.min(bottom, b.bottom);
        break;
      }
      node = node.parentElement;
    }

    bottom = Math.min(bottom, window.innerHeight - bottomInset);
    const below = bottom - rect.bottom - 10;
    const above = rect.top - top - 10;

    let flip = below < Math.min(WANTED_PANEL, 190) && above > below;
    if (placement === "up") flip = true;
    if (placement === "down") flip = false;

    return { up: flip, maxH: Math.max(140, Math.min(WANTED_PANEL, (flip ? above : below) - 10)) };
  }, [bottomInset, placement]);

  const doOpen = useCallback(() => {
    const p = place();
    setUp(p.up);
    setMaxH(p.maxH);
    setQuery("");
    setOpen(true);
  }, [place]);

  /* Scroll the current value into view once the panel has laid out. */
  useEffect(() => {
    if (!open || query) return;
    const idx = opts.findIndex((o) => o.value === value);
    if (idx < 4) return;

    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const settle = () => {
      const box = listRef.current;
      if (box && box.scrollHeight > box.clientHeight + 4) {
        const el = box.querySelector<HTMLElement>('[aria-selected="true"]');
        box.scrollTop = el
          ? Math.max(0, el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2)
          : Math.max(0, idx * (ROW_HEIGHT - 1) - box.clientHeight / 2 + ROW_HEIGHT / 2);
        return;
      }
      if (tries++ < 8) timer = setTimeout(settle, 60);
    };
    timer = setTimeout(settle, 40);
    return () => clearTimeout(timer);
    // opts is derived from props each render; value + open are the real triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const sm = size === "sm";
  const listMax = Math.max(96, maxH - (isSearchable ? 46 : 10));

  return (
    <div ref={rootRef} className={cx("relative w-full font-sans", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        {...aria}
        onClick={() => (open ? close() : doOpen())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            doOpen();
          }
        }}
        className={cx(
          "box-border flex w-full cursor-pointer items-center gap-[8px] rounded-[6px] border bg-surface font-medium",
          "transition-[border-color,box-shadow] duration-[120ms] ease-[ease] disabled:cursor-not-allowed disabled:opacity-45",
          sm ? "h-[28px] px-[9px] text-[12.5px]" : "h-[34px] px-[11px] text-[13.5px]",
          current ? "text-ink" : "text-ink-3",
          open ? "border-accent shadow-[var(--ring)]" : "border-line-strong hover:border-ink-3/40",
        )}
      >
        <span className="min-w-0 flex-1 overflow-hidden text-left text-ellipsis whitespace-nowrap">
          {current ? current.label : placeholder}
        </span>
        <Icon
          name="chevron-down"
          size={10}
          className="flex-none text-ink-3 transition-transform duration-[140ms] ease-[ease]"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open ? (
        <div
          className={cx(
            "animate-pop absolute left-0 z-80 w-max max-w-[320px] min-w-full overflow-hidden",
            "rounded-[8px] border border-line bg-surface shadow-[var(--pop)]",
            up ? "bottom-[calc(100%+5px)]" : "top-[calc(100%+5px)]",
          )}
        >
          {isSearchable ? (
            <div className="flex items-center gap-[8px] border-b border-line px-[8px] py-[7px]">
              <Icon name="search" size={12} className="flex-none text-ink-3" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter..."
                aria-label="Filter options"
                className="min-w-0 flex-1 border-0 bg-transparent py-[2px] font-sans text-[13px] text-ink outline-none"
              />
            </div>
          ) : null}

          <div
            ref={listRef}
            role="listbox"
            className="flex flex-col gap-[6px] overflow-y-auto p-[8px]"
            style={{ maxHeight: listMax }}
          >
            {shown.map((o) => {
              const selected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    close();
                    onChange(o.value);
                  }}
                  className={cx(
                    "box-border flex h-[38px] w-full cursor-pointer items-center gap-[10px] rounded-[6px] border-0 px-[12px]",
                    "text-left font-sans text-[13px] text-ink",
                    selected ? "bg-accent-soft font-semibold" : "bg-transparent font-normal hover:bg-fill",
                  )}
                >
                  <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{o.label}</span>
                  {selected ? <Icon name="check" weight="solid" size={11} className="flex-none text-accent-ink" /> : null}
                </button>
              );
            })}
            {shown.length === 0 ? (
              <span className="block px-[12px] py-[10px] text-[13px] text-ink-3">No matches.</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
