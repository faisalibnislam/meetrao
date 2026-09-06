"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";
import { GAPS, SIZES, VARIANTS } from "./button-style";
import type { ButtonSize, ButtonVariant } from "./button-style";

// The styles and `buttonClass` live in ./button-style, which is NOT a client
// module — server components render links styled as buttons and cannot call a
// function that lives behind a "use client" boundary. Import buttonClass from
// there, never from here.
export type { ButtonSize, ButtonVariant } from "./button-style";

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
