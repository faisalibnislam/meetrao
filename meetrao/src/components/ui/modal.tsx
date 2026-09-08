"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button, type ButtonVariant } from "./button";
import { Icon } from "./icon";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Dialog shell — all seven dialogs share it.

   Scrim (click-outside dismisses) · white card · header on a bottom border ·
   body · --fill footer with a ghost secondary to the left of an emphasised
   primary. Escape closes.
   ───────────────────────────────────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  primary,
  secondary,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  primary: { label: string; onClick: () => void; variant?: ButtonVariant; busy?: boolean };
  secondary: { label: string; onClick: () => void };
  /** Booking detail is 460px; every other dialog is 400px. */
  wide?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-120 flex items-center justify-center p-[20px]"
      style={{ background: "rgba(26,25,23,0.34)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          "animate-in w-full overflow-hidden rounded-[10px] border border-line bg-surface shadow-[var(--pop)] outline-none",
          wide ? "max-w-[460px]" : "max-w-[400px]",
        )}
      >
        <div className="flex items-start justify-between gap-[14px] border-b border-line px-[20px] pt-[18px] pb-[14px]">
          <div className="flex min-w-0 flex-col gap-[3px]">
            <span className="text-[15px] font-semibold text-ink">{title}</span>
            {subtitle ? <span className="text-[12.5px] text-ink-2">{subtitle}</span> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-[26px] w-[26px] flex-none cursor-pointer items-center justify-center rounded-[5px] border border-transparent bg-transparent text-ink-3 hover:bg-fill hover:text-ink"
          >
            <Icon name="xmark" size={12} />
          </button>
        </div>

        <div className="flex flex-col gap-[14px] px-[20px] py-[18px]">{children}</div>

        <div className="flex flex-wrap items-center justify-end gap-[8px] border-t border-line bg-fill px-[20px] py-[14px]">
          <Button variant="ghost" size={32} onClick={secondary.onClick}>
            {secondary.label}
          </Button>
          <Button
            variant={primary.variant ?? "accent"}
            size={32}
            busy={primary.busy}
            onClick={primary.onClick}
          >
            {primary.label}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Key/value row used by the booking-detail dialog and the confirmation card. */
export function DetailRow({
  label,
  value,
  mono = false,
  keyWidth = 78,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  keyWidth?: number;
}) {
  return (
    <div className="flex flex-wrap gap-[12px]">
      <span className="flex-none text-[12.5px] text-ink-3" style={{ width: keyWidth }}>
        {label}
      </span>
      <span
        className={cx(
          "min-w-[140px] flex-1 break-words text-ink",
          mono ? "font-mono text-[12.5px]" : "text-[13px]",
        )}
      >
        {value}
      </span>
    </div>
  );
}
