"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./icon";
import { Spinner } from "./spinner";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Button.

   One style string shared by <button> and <a>. The UA gives <button> border-box
   and <a> content-box, so a shared height + border computes two different
   heights unless box-sizing is pinned — three separate defects in the previous
   build were exactly this. `box-border` below is that pin; do not remove it.
   ───────────────────────────────────────────────────────────────────────────── */

export type ButtonVariant = "accent" | "secondary" | "ghost" | "danger" | "amber";

/** Heights the design actually uses. 26 (table row) → 50 (mobile CTA). */
export type ButtonSize = 24 | 26 | 28 | 30 | 32 | 34 | 36 | 38 | 40 | 42 | 44 | 46 | 50;

const VARIANT: Record<ButtonVariant, string> = {
  accent:
    "border border-accent bg-accent text-white hover:bg-accent-2 hover:border-accent-2 disabled:hover:bg-accent",
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

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading glyph. Rendered at the size the design uses for that control height. */
  icon?: IconName;
  iconWeight?: "light" | "solid";
  iconSize?: number;
  /** Swaps the leading glyph for a spinner and keeps the label slot. */
  busy?: boolean;
  full?: boolean;
  children?: ReactNode;
};

export type ButtonProps = Common & Omit<ComponentProps<"button">, "children">;

export function Button({
  variant = "secondary",
  size = 32,
  icon,
  iconWeight = "light",
  iconSize,
  busy = false,
  full = false,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, cx(full && "w-full", className))}
      {...rest}
    >
      <Leading
        busy={busy}
        icon={icon}
        iconWeight={iconWeight}
        iconSize={iconSize}
        variant={variant}
        size={size}
      />
      {children != null ? <span>{children}</span> : null}
    </button>
  );
}

export type ButtonLinkProps = Common &
  Omit<ComponentProps<typeof Link>, "children"> & { trailingIcon?: IconName };

export function ButtonLink({
  variant = "secondary",
  size = 32,
  icon,
  iconWeight = "light",
  iconSize,
  trailingIcon,
  full = false,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={cx("unlink no-underline", buttonClass(variant, size, cx(full && "w-full", className)))}
      {...rest}
    >
      <Leading icon={icon} iconWeight={iconWeight} iconSize={iconSize} variant={variant} size={size} />
      {children != null ? <span>{children}</span> : null}
      {trailingIcon ? <Icon name={trailingIcon} size={10} /> : null}
    </Link>
  );
}

function Leading({
  busy,
  icon,
  iconWeight,
  iconSize,
  variant,
  size,
}: {
  busy?: boolean;
  icon?: IconName;
  iconWeight?: "light" | "solid";
  iconSize?: number;
  variant: ButtonVariant;
  size: ButtonSize;
}) {
  if (busy) {
    return <Spinner tone={variant === "accent" || variant === "danger" ? "onFill" : "ink"} size={size >= 40 ? 12 : 11} />;
  }
  if (!icon) return null;
  return <Icon name={icon} weight={iconWeight} size={iconSize ?? (size >= 40 ? 13 : 11)} />;
}
