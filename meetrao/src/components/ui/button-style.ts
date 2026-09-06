/**
 * Button styling, deliberately NOT in a "use client" module.
 *
 * `buttonClass` is a plain string builder, but a function exported from a
 * "use client" file is not a function once it crosses to the server — it is a
 * client reference, and calling it throws
 *
 *     Attempted to call buttonClass() from the server but buttonClass is on
 *     the client.
 *
 * at request time, not at build time. Server components legitimately need this
 * (a link styled as a button is the right markup for anything that navigates),
 * so it lives here where both sides can call it. Keep it out of button.tsx —
 * re-exporting it from there would put the trap straight back.
 *
 * The sizes below are the exact heights, paddings and label sizes used in
 * Meetrao.dc.html, which hand-writes a button style at every call site.
 */
import { cn } from "@/lib/cn";

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

export const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border border-accent bg-accent text-white hover:bg-accent-2 disabled:hover:bg-accent",
  secondary:
    "border border-line-strong bg-surface text-ink hover:bg-fill disabled:hover:bg-surface",
  ghost:
    "border border-transparent bg-transparent text-ink-2 hover:bg-fill hover:text-ink disabled:hover:bg-transparent disabled:hover:text-ink-2",
  danger:
    "border border-red bg-red text-white hover:bg-red-2 disabled:hover:bg-red",
};

export const SIZES: Record<ButtonSize, string> = {
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
export const GAPS: Record<ButtonSize, string> = {
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

/**
 * The same visual treatment as `Button`, for an anchor. Use this wherever the
 * control navigates — a `Link` nested inside a `<button>` is invalid HTML and
 * breaks keyboard and middle-click behaviour.
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
