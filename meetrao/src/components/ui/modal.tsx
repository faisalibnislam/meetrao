"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./button";
import type { ButtonVariant } from "./button-class";
import { Icon } from "./icon";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Dialog shell, all seven dialogs share it.

   Scrim (click-outside dismisses) · white card · header on a bottom border ·
   body · --fill footer with a ghost secondary to the left of an emphasised
   primary. Escape closes.
   ───────────────────────────────────────────────────────────────────────────── */

/** The last element that had focus outside every dialog. */
let lastFocusedOutside: HTMLElement | null = null;
let tracking = false;

/* Installed once, on the first dialog, and left running: it costs one
   capturing listener and is what lets a dialog know where it was opened
   from even when something inside it grabbed focus first. */
function trackFocusOutsideDialogs() {
  if (tracking || typeof document === "undefined") return;
  tracking = true;
  const now = document.activeElement as HTMLElement | null;
  // The same rule as the listener, or a dialog mounted already open would
  // seed this with its own autofocused field.
  lastFocusedOutside = now && !now.closest('[role="dialog"]') ? now : null;
  document.addEventListener(
    "focusin",
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('[role="dialog"]')) lastFocusedOutside = target;
    },
    true,
  );
}

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
  const titleId = useId();
  const subtitleId = useId();

  /* Where focus was before the dialog took it, so closing hands it back.
     Without this a keyboard user who opened a dialog from row 40 of a table
     is dropped at the top of the page when it closes.

     Read from a tracker of the last element focused OUTSIDE any dialog,
     rather than from document.activeElement when the dialog opens. A field
     inside with autoFocus is focused by React while it commits, before any
     effect runs, so activeElement is already the dialog's own input by then.

     Restored from an effect keyed on `open` ALONE. The key handler below
     depends on onClose, which callers pass inline, so it re-subscribes on
     every render; restoring from THAT cleanup snatched focus back to the
     opener after every keystroke typed into the dialog. */
  useEffect(() => {
    trackFocusOutsideDialogs();
    if (!open) return;
    const returnTo = lastFocusedOutside;
    return () => {
      if (returnTo && document.contains(returnTo)) returnTo.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      /* A TRAP, because aria-modal promises one. It told assistive tech the
         rest of the page was inert while Tab walked straight out to it. */
      if (e.key !== "Tab" || !cardRef.current) return;
      const focusable = [
        ...cardRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const here = document.activeElement;
      if (e.shiftKey && (here === first || here === cardRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && here === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  /* Focus the dialog itself only if nothing inside it has focus already. A
     field with autoFocus is focused while React commits, before this runs,
     and taking focus to the container afterwards undid it: every "type
     straight away" field in a dialog had to be clicked first. */
  useEffect(() => {
    if (!open) return;
    const card = cardRef.current;
    if (card && !card.contains(document.activeElement)) card.focus();
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
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className={cx(
          /* A ceiling, and a column, so the BODY scrolls and the header and
             the buttons stay put. With overflow-hidden and no limit, a tall
             dialog on a short screen had its buttons cut off: the one way to
             finish was below the fold and could not be scrolled to. */
          "animate-in flex max-h-[calc(100dvh-40px)] w-full flex-col overflow-hidden rounded-[10px] border border-line bg-surface shadow-[var(--pop)] outline-none",
          wide ? "max-w-[460px]" : "max-w-[400px]",
        )}
      >
        <div
          className={cx(
            "flex flex-none items-start justify-between gap-[14px] px-[20px] pt-[18px] pb-[14px]",
            /* With no body the footer's top border is the only divider
               needed; both would stack into a 2px line. */
            children ? "border-b border-line" : "pb-[18px]",
          )}
        >
          <div className="flex min-w-0 flex-col gap-[3px]">
            <h2 id={titleId} className="m-0 text-[15px] font-semibold text-ink">
              {title}
            </h2>
            {subtitle ? (
              <p id={subtitleId} className="m-0 text-[12.5px] text-ink-2">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="relative inline-flex h-[26px] w-[26px] flex-none cursor-pointer items-center justify-center rounded-[5px] border border-transparent bg-transparent text-ink-3 hover:bg-fill hover:text-ink pointer-coarse:after:absolute pointer-coarse:after:-inset-[9px] pointer-coarse:after:content-['']"
          >
            <Icon name="xmark" size={12} />
          </button>
        </div>

        {/* Only when there is something in it. A confirmation that is all
            header and buttons ("Delete this meeting?") used to render 36px of
            empty padding between the question and the answer. */}
        {children ? (
          <div className="flex min-h-0 flex-col gap-[14px] overflow-y-auto px-[20px] py-[18px]">{children}</div>
        ) : null}

        <div className="flex flex-none flex-wrap items-center justify-end gap-[8px] border-t border-line bg-fill px-[20px] py-[14px]">
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
  machine = false,
  keyWidth = 78,
}: {
  label: string;
  value: ReactNode;
  /** A machine string, an email, a Meet URL, a reference. Set a shade
      smaller than prose so it reads as data. */
  machine?: boolean;
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
          machine ? "text-[12.5px]" : "text-[13px]",
        )}
      >
        {value}
      </span>
    </div>
  );
}
