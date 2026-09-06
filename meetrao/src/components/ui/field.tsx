"use client";

import { forwardRef, useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/* ── Shared field chrome ─────────────────────────────────────────────────── */

const FIELD_BASE =
  "field w-full box-border rounded-[6px] border bg-surface font-sans text-[13.5px] text-ink outline-none " +
  "transition-[border-color,box-shadow] duration-[120ms] ease-linear";

/** 34px is the standard select/input height; 36–38px on forms and auth. */
export type FieldSize = "sm" | "md" | "lg";
const HEIGHTS: Record<FieldSize, string> = {
  sm: "h-[34px]",
  md: "h-[36px]",
  lg: "h-[38px]",
};

export function Label({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-[12.5px] font-semibold text-ink",
        hint
          ? "flex items-baseline justify-between gap-[12px]"
          : "block",
      )}
    >
      {children}
      {hint}
    </span>
  );
}

export function Helper({ children }: { children: ReactNode }) {
  return <span className="text-[12px] text-ink-3">{children}</span>;
}

export function FieldError({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-[6px] text-[12px] text-red">
      <Icon name="triangleExclamation" weight={900} size={10} />
      {children}
    </span>
  );
}

/* ── Input ───────────────────────────────────────────────────────────────── */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  fieldSize?: FieldSize;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { fieldSize = "md", invalid = false, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        FIELD_BASE,
        HEIGHTS[fieldSize],
        "px-[12px]",
        invalid ? "border-red" : "border-line-strong",
        className,
      )}
      {...rest}
    />
  );
});

/* ── Textarea ────────────────────────────────────────────────────────────── */

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ invalid = false, className, rows = 3, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(
          FIELD_BASE,
          "resize-y px-[12px] py-[9px] leading-[1.5]",
          invalid ? "border-red" : "border-line-strong",
          className,
        )}
        {...rest}
      />
    );
  },
);

/* ── Labelled field wrapper ──────────────────────────────────────────────── */

export function Field({
  label,
  labelHint,
  helper,
  error,
  children,
  className,
}: {
  label?: ReactNode;
  labelHint?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-[6px]", className)}>
      {label ? <Label hint={labelHint}>{label}</Label> : null}
      {children}
      {error ? <FieldError>{error}</FieldError> : null}
      {helper && !error ? <Helper>{helper}</Helper> : null}
    </label>
  );
}

/* ── Search field ────────────────────────────────────────────────────────── */

export function SearchField({
  value,
  onValueChange,
  placeholder,
  className,
  label,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  label: string;
}) {
  const id = useId();
  return (
    <div
      className={cn(
        "flex h-[32px] items-center gap-[8px] rounded-[6px] border border-line-strong bg-surface px-[10px]",
        className,
      )}
    >
      <Icon name="search" size={12} className="text-ink-3" />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent font-sans text-[13px] text-ink outline-none"
      />
    </div>
  );
}
