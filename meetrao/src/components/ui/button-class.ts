import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   The button's style string, and the tokens behind it.

   Separate from button.tsx because that file is a client component, and a
   Server Component that styles an anchor or a plain <button> needs this string
   too — the guest cancellation page does exactly that. Importing a function
   from a "use client" module and calling it on the server throws at request
   time, so anything both sides use lives here, where neither directive applies.

   One style string shared by <button> and <a>. The UA gives <button>
   border-box and <a> content-box, so a shared height + border computes two
   different heights unless box-sizing is pinned — three separate defects in the
   previous build were exactly this. `box-border` below is that pin; do not
   remove it.
   ───────────────────────────────────────────────────────────────────────────── */

export type ButtonVariant = "accent" | "secondary" | "ghost" | "danger" | "amber";

/** Heights the design actually uses. 26 (table row) → 50 (mobile CTA). */
export type ButtonSize = 24 | 26 | 28 | 30 | 32 | 34 | 36 | 38 | 40 | 42 | 44 | 46 | 50;

const VARIANT: Record<ButtonVariant, string> = {
  accent:
    "border border-accent bg-accent text-on-accent hover:bg-accent-2 hover:border-accent-2 disabled:hover:bg-accent",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-fill",
  ghost: "border border-transparent bg-transparent text-ink-2 hover:bg-fill hover:text-ink",
  danger: "border border-red bg-red text-white hover:bg-red-hover hover:border-red-hover",
  amber:
    "border border-amber-line bg-white/75 text-amber-ink hover:bg-white",
};

const SIZE: Record<ButtonSize, string> = {
  24: "h-[24px] px-[7px] text-[12.5px] gap-[6px] rounded-[5px]",
  26: "h-[26px] px-[9px] text-[12px] gap-[6px] rounded-[5px]",
  28: "h-[28px] px-[10px] text-[12.5px] gap-[7px] rounded-[6px]",
  30: "h-[30px] px-[11px] text-[12.5px] gap-[7px] rounded-[6px]",
  32: "h-[32px] px-[12px] text-[12.5px] gap-[7px] rounded-[6px]",
  34: "h-[34px] px-[14px] text-[13px] gap-[8px] rounded-[6px]",
  36: "h-[36px] px-[15px] text-[13.5px] gap-[8px] rounded-[6px]",
  38: "h-[38px] px-[15px] text-[13.5px] gap-[9px] rounded-[6px]",
  40: "h-[40px] px-[15px] text-[13.5px] gap-[9px] rounded-[6px]",
  42: "h-[42px] px-[16px] text-[14px] gap-[9px] rounded-[6px]",
  44: "h-[44px] px-[16px] text-[14px] gap-[9px] rounded-[6px]",
  46: "h-[46px] px-[18px] text-[14.5px] gap-[9px] rounded-[7px]",
  50: "h-[50px] px-[20px] text-[15px] gap-[10px] rounded-[7px]",
};

export function buttonClass(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = 32,
  extra?: string,
) {
  return cx(
    "inline-flex box-border items-center justify-center whitespace-nowrap font-sans font-semibold",
    "cursor-pointer transition-[background-color,border-color,color,box-shadow] duration-[120ms] ease-[ease]",
    "disabled:cursor-not-allowed disabled:opacity-45",
    SIZE[size],
    VARIANT[variant],
    extra,
  );
}

/* Enumerated from the records above, not re-listed, so /preview cannot show a
   stale matrix after a variant or height is added. */
export const BUTTON_VARIANTS = Object.keys(VARIANT) as ButtonVariant[];
export const BUTTON_SIZES = Object.keys(SIZE).map(Number) as ButtonSize[];
