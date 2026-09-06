"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { Button, type ButtonVariant } from "./button";
import { buttonClass } from "./button-style";
import { RouteLink } from "./route-link";

/**
 * One dialog shell serves all six dialogs: scrim, header (title + optional
 * subtitle + 26px close), body, and a `--fill` footer with the ghost secondary
 * to the left of the emphasised primary. Escape and click-outside dismiss.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 400,
  primaryLabel,
  primaryVariant = "primary",
  onPrimary,
  primaryHref,
  primaryLoading,
  secondaryLabel,
  onSecondary,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  /** 400px for every dialog except booking detail, which is 460px. */
  width?: 400 | 460;
  primaryLabel: string;
  primaryVariant?: ButtonVariant;
  /** Omit when `primaryHref` is given. */
  onPrimary?: () => void;
  /**
   * Renders the primary action as a link instead of a button — for hand-offs
   * to a Route Handler that redirects off-site (the Google consent screen).
   */
  primaryHref?: string;
  primaryLoading?: boolean;
  secondaryLabel: string;
  onSecondary: () => void;
}) {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Move focus into the dialog so Escape and Tab land somewhere sensible.
    cardRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(26,25,23,0.34)] p-[20px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ maxWidth: width }}
        className={cn(
          "animate-mu-in w-full overflow-hidden rounded-[10px] border border-line bg-surface outline-none",
          "shadow-[var(--pop)]",
        )}
      >
        <div className="flex items-start justify-between gap-[14px] border-b border-line px-[20px] pt-[18px] pb-[14px]">
          <div className="flex min-w-0 flex-col gap-[3px]">
            <span id={titleId} className="text-[15px] font-semibold text-ink">
              {title}
            </span>
            {subtitle ? (
              <span className="text-[12.5px] text-ink-2">{subtitle}</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close dialog"
            className="inline-flex size-[26px] flex-none cursor-pointer items-center justify-center rounded-[5px] border border-transparent bg-transparent text-ink-3 hover:bg-fill hover:text-ink"
          >
            <Icon name="close" size={12} />
          </button>
        </div>

        {children ? (
          <div className="flex flex-col gap-[14px] px-[20px] py-[18px]">
            {children}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-[8px] border-t border-line bg-fill px-[20px] py-[14px]">
          <Button variant="ghost" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
          {primaryHref ? (
            <RouteLink
              href={primaryHref}
              className={buttonClass({
                variant: primaryVariant,
                className: "px-[13px]",
              })}
            >
              {primaryLabel}
            </RouteLink>
          ) : (
            <Button
              variant={primaryVariant}
              onClick={onPrimary}
              loading={primaryLoading}
              className="px-[13px]"
            >
              {primaryLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Key/value row used by the booking-detail and admin dialogs. */
export function DetailRow({
  k,
  v,
  mono,
  keyWidth = 78,
}: {
  k: string;
  v: ReactNode;
  mono?: boolean;
  keyWidth?: number;
}) {
  return (
    <div className="flex flex-wrap gap-[12px]">
      <span
        style={{ width: keyWidth }}
        className="flex-none text-[12.5px] text-ink-3"
      >
        {k}
      </span>
      <span
        className={cn(
          "min-w-[140px] flex-1 break-words text-ink",
          mono ? "font-mono text-[12.5px]" : "text-[13px]",
        )}
      >
        {v}
      </span>
    </div>
  );
}
