import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";
import { cx } from "@/lib/cx";

/** Bordered white surface, radius 8. The default container for lists and tables. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-hidden rounded-[8px] border border-line bg-surface", className)}>{children}</div>
  );
}

/** Tables scroll horizontally inside their card rather than reflowing. */
export function TableCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <div className="scroll-x">{children}</div>
    </Card>
  );
}

/** Dashed empty state: title, explanation, optional action. */
export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-[7px] rounded-[8px] border border-dashed border-line-strong bg-surface px-[20px] py-[28px]">
      <span className="text-[14px] font-semibold text-ink">{title}</span>
      <span className="text-[13px] text-ink-2">{text}</span>
      {action ? <div className="mt-[3px]">{action}</div> : null}
    </div>
  );
}

type CalloutTone = "amber" | "red" | "accent" | "info";

const CALLOUT: Record<CalloutTone, { box: string; icon: IconName; iconClass: string; body: string }> = {
  amber: {
    box: "border-amber-line bg-amber-soft",
    icon: "triangle-exclamation",
    iconClass: "text-amber",
    body: "text-amber-ink",
  },
  red: {
    box: "border-red-line bg-red-soft",
    icon: "circle-exclamation",
    iconClass: "text-red",
    body: "text-red-ink",
  },
  accent: {
    box: "border-accent-line bg-accent-soft",
    icon: "check",
    iconClass: "text-accent-ink",
    body: "text-ink-2",
  },
  info: {
    box: "border-line bg-fill",
    icon: "circle-info",
    iconClass: "text-accent-ink",
    body: "text-ink-2",
  },
};

/**
 * Status panel. `title` renders the emphasised first line (red and amber
 * callouts use it); without one the body is the whole message.
 */
export function Callout({
  tone,
  title,
  children,
  action,
  className,
  align = "start",
}: {
  tone: CalloutTone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  /** center puts the glyph, message and action on one line, the banner form. */
  align?: "start" | "center";
}) {
  const c = CALLOUT[tone];
  return (
    <div
      className={cx(
        "flex flex-wrap gap-[11px] rounded-[8px] border px-[14px] py-[12px]",
        align === "center" ? "items-center gap-x-[12px]" : "items-start",
        c.box,
        className,
      )}
    >
      <Icon
        name={c.icon}
        weight="solid"
        size={tone === "accent" ? 11 : 13}
        className={cx("flex-none", c.iconClass, align === "start" && "mt-[2px]")}
      />
      <div className={cx("flex min-w-[190px] flex-1 flex-col gap-[3px]")}>
        {title ? (
          <span className={cx("text-[13px] font-semibold", tone === "red" ? "text-red" : "text-ink")}>{title}</span>
        ) : null}
        <span className={cx("text-[12.5px] leading-[1.55]", c.body)}>{children}</span>
      </div>
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  );
}

/** Section heading + optional meta, used across the app screens. */
export function SectionHeading({
  title,
  meta,
  right,
}: {
  title: string;
  meta?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-[12px]">
      <div className="flex items-baseline gap-[9px]">
        <h2 className="m-0 text-[14.5px] font-semibold text-ink">{title}</h2>
        {meta ? <span className="text-[12.5px] text-ink-3">{meta}</span> : null}
      </div>
      {right}
    </div>
  );
}

/** Heading + one-line explanation, the settings and meeting-form section header. */
export function PanelHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <h2 className="m-0 text-[14.5px] font-semibold text-ink">{title}</h2>
      {subtitle ? <p className="m-0 text-[12.5px] text-ink-3">{subtitle}</p> : null}
    </div>
  );
}
