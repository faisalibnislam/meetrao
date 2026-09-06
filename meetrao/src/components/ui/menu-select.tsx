"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export type SelectOption = { value: string; label: string };

const WANT_HEIGHT = 280;
/** Options above this count get a filter field without being asked. */
const SEARCHABLE_THRESHOLD = 12;

/**
 * The product's only dropdown — the prototype deliberately avoids the native
 * select. Ported from MenuSelect.dc.html: opens downward but flips up when the
 * nearest scrolling ancestor does not leave room, becomes searchable above 12
 * options, scrolls the current value into view on open, closes on click-outside
 * or Escape, and opens on ArrowDown.
 */
export function MenuSelect({
  options,
  value,
  onChange,
  placeholder = "Select",
  size = "md",
  placement = "auto",
  searchable,
  bottomInset = 8,
  label,
  className,
  disabled,
}: {
  options: ReadonlyArray<SelectOption | string>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "md";
  placement?: "auto" | "down" | "up";
  searchable?: boolean;
  /** Space to keep clear at the viewport bottom when measuring. */
  bottomInset?: number;
  /** Accessible name for the trigger. */
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [maxH, setMaxH] = useState(WANT_HEIGHT);
  const [query, setQuery] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const opts: SelectOption[] = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  const current = opts.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const shown = q
    ? opts.filter((o) => o.label.toLowerCase().includes(q))
    : opts;
  const isSearchable = searchable === true || opts.length > SEARCHABLE_THRESHOLD;

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  /* Measure against the nearest clipping ancestor so the panel opens where
     there is actually room. */
  const place = useCallback(() => {
    const el = rootRef.current;
    if (!el) return { up: false, maxH: WANT_HEIGHT };

    const rect = el.getBoundingClientRect();
    let top = 0;
    let bottom = window.innerHeight;

    let node: HTMLElement | null = el.parentElement;
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

    let nextUp = below < Math.min(WANT_HEIGHT, 190) && above > below;
    if (placement === "up") nextUp = true;
    if (placement === "down") nextUp = false;

    return {
      up: nextUp,
      maxH: Math.max(140, Math.min(WANT_HEIGHT, (nextUp ? above : below) - 10)),
    };
  }, [bottomInset, placement]);

  const openMenu = useCallback(() => {
    const next = place();
    setUp(next.up);
    setMaxH(next.maxH);
    setQuery("");
    setOpen(true);
  }, [place]);

  /* Close on click-outside and Escape. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
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

  /* Scroll the selected row into view once the panel has laid out. */
  useEffect(() => {
    if (!open || query) return;
    const box = listRef.current;
    if (!box) return;
    if (box.scrollHeight <= box.clientHeight + 4) return;
    const selected = box.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!selected) return;
    box.scrollTop = Math.max(
      0,
      selected.offsetTop - box.clientHeight / 2 + selected.offsetHeight / 2,
    );
  }, [open, query]);

  const sm = size === "sm";
  const listMax = Math.max(96, maxH - (isSearchable ? 46 : 10));

  return (
    <div
      ref={rootRef}
      className={cn("relative w-full font-sans", className)}
    >
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            openMenu();
          }
        }}
        className={cn(
          "box-border flex w-full cursor-pointer items-center gap-[8px] rounded-[6px] border bg-surface font-medium",
          "transition-[border-color,box-shadow] duration-[120ms] ease-linear",
          "disabled:cursor-not-allowed disabled:opacity-60",
          sm ? "h-[28px] px-[9px] text-[12.5px]" : "h-[34px] px-[11px] text-[13.5px]",
          open
            ? "border-accent shadow-[var(--ring)]"
            : "border-line-strong shadow-none",
          current ? "text-ink" : "text-ink-3",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {current ? current.label : placeholder}
        </span>
        <Icon
          name="chevronDown"
          size={10}
          className="text-ink-3 transition-transform duration-[140ms]"
          style={{ transform: `rotate(${open ? 180 : 0}deg)` }}
        />
      </button>

      {open ? (
        <div
          style={up ? { bottom: "calc(100% + 5px)" } : { top: "calc(100% + 5px)" }}
          className="animate-mu-pop absolute left-0 z-[80] w-max max-w-[320px] min-w-full overflow-hidden rounded-[8px] border border-line bg-surface shadow-[var(--pop)]"
        >
          {isSearchable ? (
            <div className="flex items-center gap-[8px] border-b border-line px-[8px] py-[7px]">
              <Icon name="search" size={12} className="text-ink-3" />
              <input
                type="text"
                value={query}
                autoFocus
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter..."
                aria-label={`Filter ${label}`}
                className="min-w-0 flex-1 border-0 bg-transparent py-[2px] font-sans text-[13px] text-ink outline-none"
              />
            </div>
          ) : null}

          <div
            id={listId}
            ref={listRef}
            role="listbox"
            aria-label={label}
            style={{ maxHeight: listMax }}
            className="flex flex-col gap-[6px] overflow-y-auto p-[8px]"
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
                  className={cn(
                    "box-border flex h-[38px] w-full cursor-pointer items-center gap-[10px] rounded-[6px] border-0 px-[12px] text-left text-[13px] text-ink",
                    selected
                      ? "bg-accent-soft font-semibold"
                      : "bg-transparent font-normal hover:bg-fill",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {selected ? (
                    <Icon
                      name="check"
                      weight={900}
                      size={11}
                      className="text-accent"
                    />
                  ) : null}
                </button>
              );
            })}
            {shown.length === 0 ? (
              <span className="block px-[12px] py-[10px] text-[13px] text-ink-3">
                No matches.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
