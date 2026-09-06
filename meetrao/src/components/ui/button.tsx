"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

/**
 * The prototype hand-writes a button style at every call site. Those styles
 * collapse into four variants and a control-height scale — the sizes below are
 * the exact heights, paddings and label sizes used in Meetrao.dc.html.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize =
  | "xs" // 26px — table row actions
  | "sm" // 28px — compact inline actions
  | "md" // 30px — small panel actions
  | "base" // 32px — header actions, dialog footer
  | "lg" // 34px — settings save
  | "xl" // 36px — form primary
  | "2xl" // 38px — onboarding primary
  | "3xl" // 40px — auth CTA
  | "4xl"; // 42px — public booking CTA

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border border-accent bg-accent text-white hover:bg-accent-2 disabled:hover:bg-accent",
  secondary:
    "border border-line-strong bg-surface text-ink hover:bg-fill disabled:hover:bg-surface",
  ghost:
    "border border-transparent bg-transparent text-ink-2 hover:bg-fill hover:text-ink disabled:hover:bg-transparent disabled:hover:text-ink-2",
  danger:
    "border border-red bg-red text-white hover:bg-red-2 disabled:hover:bg-red",
};

const SIZES: Record<ButtonSize, string> = {
  xs: "h-[26px] px-[9px] text-[12px]",
  sm: "h-[28px] px-[10px] text-[12.5px]",
  md: "h-[30px] px-[11px] text-[12.5px]",
  base: "h-[32px] px-[12px] text-[12.5px]",
  lg: "h-[34px] px-[14px] text-[13px]",
  xl: "h-[36px] px-[15px] text-[13.5px]",
  "2xl": "h-[38px] px-[15px] text-[13.5px]",
  "3xl": "h-[40px] px-[15px] text-[13.5px]",
  "4xl": "h-[42px] px-[15px] text-[14px]",
};

/** Gap between a leading glyph and the label, per size. */
const GAPS: Record<ButtonSize, string> = {
  xs: "gap-[6px]",
  sm: "gap-[7px]",
  md: "gap-[7px]",
  base: "gap-[7px]",
  lg: "gap-[8px]",
  xl: "gap-[8px]",
  "2xl": "gap-[9px]",
  "3xl": "gap-[9px]",
  "4xl": "gap-[9px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders the 12px inline spinner ahead of the label. */
  loading?: boolean;
  full?: boolean;
}

/**
 * The same visual treatment for an anchor. Use this wherever the control
 * navigates — a `Link` nested inside a `<button>` is invalid HTML and breaks
 * keyboard and middle-click behaviour.
 */
export function buttonClass({
  variant = "primary",
  size = "base",
  full = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-[6px] font-sans font-semibold whitespace-nowrap no-underline",
    "cursor-pointer transition-colors duration-[120ms] ease-linear",
    VARIANTS[variant],
    SIZES[size],
    GAPS[size],
    // `a:hover` in globals.css would otherwise repaint the label green.
    variant === "primary" || variant === "danger"
      ? "text-white hover:text-white"
      : variant === "secondary"
        ? "text-ink hover:text-ink"
        : "text-ink-2 hover:text-ink",
    full && "w-full",
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "base",
      loading = false,
      full = false,
      className,
      children,
      type = "button",
      disabled,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-[6px] font-sans font-semibold whitespace-nowrap",
          "cursor-pointer transition-colors duration-[120ms] ease-linear",
          "disabled:cursor-not-allowed disabled:opacity-60",
          VARIANTS[variant],
          SIZES[size],
          GAPS[size],
          full && "w-full",
          className,
        )}
        {...rest}
      >
        {loading ? <Spinner /> : null}
        {children}
      </button>
    );
  },
);
