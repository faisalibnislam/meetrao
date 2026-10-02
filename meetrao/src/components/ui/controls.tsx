"use client";

import type { ComponentProps, ReactNode } from "react";
import { Icon } from "./icon";
import { cx } from "@/lib/cx";

/* Field label, 12.5 / 600, always ink. */
export function Label({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cx("text-[12.5px] font-semibold text-ink", className)}>
      {children}
    </label>
  );
}

/* Helper / meta, 12–12.5 / 400 on --ink-3. */
export function Help({ children, id, className }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <span id={id} className={cx("text-[12px] leading-[1.5] text-ink-3", className)}>
      {children}
    </span>
  );
}

/* Inline validation. Red text with a solid warning glyph, shown only after a
   submit attempt (touched semantics). */
export function FieldError({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-[6px] text-[12px] text-red">
      <Icon name="triangle-exclamation" weight="solid" size={10} />
      {children}
    </span>
  );
}

/** Column wrapper: label, control, then any helper or error. */
export function Field({
  label,
  htmlFor,
  children,
  help,
  error,
  className,
  labelRight,
}: {
  label?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  className?: string;
  /** Right-aligned control in the label row, e.g. The "Forgot?" link. */
  labelRight?: ReactNode;
}) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-[6px]", className)}>
      {label != null ? (
        labelRight ? (
          <span className="flex items-baseline justify-between gap-[12px] text-[12.5px] font-semibold text-ink">
            <label htmlFor={htmlFor}>{label}</label>
            {labelRight}
          </span>
        ) : (
          <Label htmlFor={htmlFor}>{label}</Label>
        )
      ) : null}
      {children}
      {error ? <FieldError>{error}</FieldError> : null}
      {help ? <Help>{help}</Help> : null}
    </div>
  );
}

const inputBase =
  "box-border w-full rounded-[6px] border bg-surface font-sans text-[13.5px] text-ink outline-none " +
  "transition-[border-color,box-shadow] duration-[120ms] ease-[ease] " +
  "focus:border-accent focus:shadow-[var(--ring)] disabled:bg-fill disabled:text-ink-3";

export type InputProps = ComponentProps<"input"> & {
  /** 34 = settings · 36 = meeting form · 38 = auth and guest details */
  height?: 34 | 36 | 38 | 42;
  invalid?: boolean;
};

export function Input({ height = 34, invalid = false, className, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cx(
        inputBase,
        "px-[12px]",
        height === 34 && "h-[34px]",
        height === 36 && "h-[36px]",
        height === 38 && "h-[38px]",
        height === 42 && "h-[42px]",
        invalid ? "border-red" : "border-line-strong",
        className,
      )}
      {...rest}
    />
  );
}

export function Textarea({
  rows = 3,
  invalid = false,
  className,
  ...rest
}: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cx(
        inputBase,
        "resize-y px-[12px] py-[9px] leading-[1.5]",
        invalid ? "border-red" : "border-line-strong",
        className,
      )}
      {...rest}
    />
  );
}

/** Search field: 32px, leading glyph, borderless input inside a bordered shell. */
export function SearchField({
  value,
  onValueChange,
  placeholder,
  width = 230,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  width?: number;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      className={cx(
        "flex h-[32px] w-[var(--search-w)] max-w-full items-center gap-[8px] rounded-[6px]",
        "border border-line-strong bg-surface px-[10px]",
        // Edge to edge on a phone. The width goes through a custom property
        // rather than an inline `style={{ width }}`: an inline width beats every
        // class, so a responsive rule could never take it back without
        // !important. As a variable it is just another utility, and the
        // narrow-screen one wins normally.
        "max-[560px]:w-full",
        className,
      )}
      style={{ "--search-w": typeof width === "number" ? `${width}px` : width } as React.CSSProperties}
    >
      <Icon name="search" size={12} className="text-ink-3" />
      <input
        type="search"
        value={value}
        aria-label={ariaLabel ?? placeholder}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent font-sans text-[13px] text-ink outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
    </div>
  );
}

/* ── Switch ───────────────────────────────────────────────────────────────────
   34×20 track, 14px thumb, 140ms spring travel. Keeps its size. The hit area
   is widened by the wrapping row, not by growing the control. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name when the control has no adjacent <label>. */
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
      className={cx(
        "relative box-border h-[20px] w-[34px] flex-none cursor-pointer rounded-[10px] border p-0",
        "transition-[background-color,border-color] duration-[140ms] ease-[ease] disabled:cursor-not-allowed disabled:opacity-45",
        checked ? "border-accent bg-accent" : "border-line-strong bg-fill-2",
      )}
    >
      <span
        aria-hidden="true"
        className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(26,25,23,0.25)]"
        style={{
          left: checked ? 16 : 2,
          transition: "left 140ms cubic-bezier(.3,1.2,.6,1)",
        }}
      />
    </button>
  );
}

/* ── Checkbox ─────────────────────────────────────────────────────────────────
   16px box, radius 4, accent fill + white check when on. Used by the
   availability day toggles, where the whole row label is the hit target. */
export function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex h-[16px] w-[16px] flex-none items-center justify-center rounded-[4px] border",
        "transition-[background-color,border-color] duration-[120ms] ease-[ease]",
        checked ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface",
      )}
    >
      {checked ? <Icon name="check" weight="solid" size={9} /> : null}
    </span>
  );
}

/** Duration chips: 32px, accent fill when selected. */
export function ChoiceChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "inline-flex h-[32px] cursor-pointer items-center rounded-[6px] border px-[13px] font-sans text-[13px]",
        "transition-[background-color,border-color] duration-[120ms] ease-[ease]",
        selected
          ? "border-accent bg-accent font-semibold text-on-accent"
          : "border-line-strong bg-surface font-medium text-ink hover:bg-fill",
      )}
    >
      {children}
    </button>
  );
}
