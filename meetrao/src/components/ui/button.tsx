"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./icon";
import { Spinner } from "./spinner";
import { cx } from "@/lib/cx";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./button-class";

/* ─────────────────────────────────────────────────────────────────────────────
   Button.

   One style string shared by <button> and <a>. The UA gives <button> border-box
   and <a> content-box, so a shared height + border computes two different
   heights unless box-sizing is pinned. Three separate defects in the previous
   build were exactly this. `box-border` below is that pin; do not remove it.
   ───────────────────────────────────────────────────────────────────────────── */

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
      {/* `contents`, not a plain span. The span exists to keep a text label as
          one flex item, but an inline box also traps a block-level child, a
          <GoogleG> beside a word stacked above it instead of sitting inline.
          Dissolving the box makes each child a flex item of the button, which
          is exactly the design's shape: the mark, then the label. */}
      {children != null ? <span className="contents">{children}</span> : null}
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
  const classes = cx("unlink no-underline", buttonClass(variant, size, cx(full && "w-full", className)));
  const body = (
    <>
      <Leading icon={icon} iconWeight={iconWeight} iconSize={iconSize} variant={variant} size={size} />
      {/* `contents`, not a plain span. The span exists to keep a text label as
          one flex item, but an inline box also traps a block-level child, a
          <GoogleG> beside a word stacked above it instead of sitting inline.
          Dissolving the box makes each child a flex item of the button, which
          is exactly the design's shape: the mark, then the label. */}
      {children != null ? <span className="contents">{children}</span> : null}
      {trailingIcon ? <Icon name={trailingIcon} size={10} /> : null}
    </>
  );

  /* A route handler is not a page. <Link> prefetches whatever it points at
     as soon as it scrolls into view, and "Connect Google Calendar" points at
     /api/google/connect, which starts the OAuth flow: every view of the
     calendar settings ran a Convex query and overwrote the OAuth state cookie
     before anybody clicked. A plain anchor is fetched only when followed. */
  if (typeof rest.href === "string" && rest.href.startsWith("/api/")) {
    return (
      <a href={rest.href} className={classes} target={rest.target} rel={rest.rel}>
        {body}
      </a>
    );
  }

  return (
    <Link className={classes} {...rest}>
      {body}
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
