"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/* ── Switch ──────────────────────────────────────────────────────────────────
   34×20 track, 14px thumb, 140ms spring travel — the one place besides the
   checkbox mark where the system allows overshoot.                          */

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name — the visible label usually sits in a sibling column. */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[20px] w-[34px] flex-none cursor-pointer rounded-[10px] border p-0",
        "transition-[background-color,border-color] duration-[140ms] ease-linear",
        "disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "border-accent bg-accent" : "border-line-strong bg-fill-2",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-[2px] size-[14px] rounded-full bg-white",
          "shadow-[0_1px_2px_rgba(26,25,23,0.25)]",
          "transition-[left] duration-[140ms] [transition-timing-function:cubic-bezier(.3,1.2,.6,1)]",
          checked ? "left-[16px]" : "left-[2px]",
        )}
      />
    </button>
  );
}

/* ── Checkbox ────────────────────────────────────────────────────────────── */

export function CheckboxRow({
  checked,
  onChange,
  children,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex cursor-pointer items-center gap-[9px] border-0 bg-transparent py-[6px] text-left",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-[16px] flex-none items-center justify-center rounded-[4px] border",
          "transition-[background-color,border-color] duration-[120ms] ease-linear",
          checked ? "border-accent bg-accent" : "border-line-strong bg-surface",
        )}
      >
        {checked ? (
          <Icon name="check" weight={900} size={9} className="text-white" />
        ) : null}
      </span>
      <span className="text-[13.5px] font-medium text-ink">{children}</span>
    </button>
  );
}

/* ── Status badge ────────────────────────────────────────────────────────── */

export type Tone = "ok" | "bad" | "warn" | "off";

const BADGE_TONES: Record<Tone, string> = {
  ok: "border-accent-line bg-accent-soft text-accent",
  bad: "border-red-line bg-red-soft text-red",
  warn: "border-amber-line bg-amber-soft text-amber",
  off: "border-line bg-fill text-ink-2",
};

const DOT_TONES: Record<Tone, string> = {
  ok: "bg-accent",
  bad: "bg-red",
  warn: "bg-amber",
  off: "bg-ink-3",
};

export function Badge({
  tone = "off",
  dot = true,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[20px] flex-none items-center gap-[6px] rounded-[4px] border px-[8px]",
        "text-[11.5px] font-semibold whitespace-nowrap",
        BADGE_TONES[tone],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={cn("size-[5px] flex-none rounded-full", DOT_TONES[tone])}
        />
      ) : null}
      {children}
    </span>
  );
}

/* ── Count badge (nav items, tabs) ───────────────────────────────────────── */

export function CountBadge({
  active,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[17px] min-w-[18px] flex-none items-center justify-center rounded-[4px] px-[5px]",
        "text-[10.5px] font-semibold",
        active ? "bg-ink text-white" : "bg-fill-2 text-ink-2",
      )}
    >
      {children}
    </span>
  );
}

/* ── Avatar ──────────────────────────────────────────────────────────────── */

export function Avatar({
  initials,
  size = 26,
  tone = "accent",
}: {
  initials: string;
  size?: 26 | 28 | 38 | 42;
  tone?: "accent" | "neutral";
}) {
  const radius = size >= 38 ? "rounded-[8px]" : size === 28 ? "rounded-[6px]" : "rounded-[5px]";
  const text = size >= 42 ? 14 : size === 38 ? 13 : size === 28 ? 10.5 : 11;
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: text }}
      className={cn(
        "inline-flex flex-none items-center justify-center font-bold",
        radius,
        tone === "accent"
          ? "bg-accent-soft text-accent"
          : "bg-fill-2 text-ink-2",
      )}
    >
      {initials}
    </span>
  );
}

/* ── Eyebrow (DM Mono micro-label) ───────────────────────────────────────── */

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[10.5px] tracking-[0.08em] uppercase text-ink-3",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-[7px] rounded-[8px] border border-dashed border-line-strong bg-surface px-[20px] py-[28px]">
      <span className="text-[14px] font-semibold text-ink">{title}</span>
      <span className="text-[13px] text-ink-2">{body}</span>
      {action ? <div className="mt-[3px]">{action}</div> : null}
    </div>
  );
}
