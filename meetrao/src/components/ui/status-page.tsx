import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { cx } from "@/lib/cx";

const TONE = {
  red: "bg-red-soft text-red",
  amber: "bg-amber-soft text-amber",
  neutral: "bg-fill text-ink-2",
} as const;

/**
 * A whole screen that says one thing: suspended, not found, something broke.
 *
 * The layout the Suspended page has always had, lifted out so a 404 and an
 * error read as part of the same product rather than as the framework's
 * defaults. No data and no hooks, so an error boundary can render it.
 */
export function StatusPage({
  icon,
  tone,
  title,
  children,
  actions,
}: {
  icon: IconName;
  tone: keyof typeof TONE;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="box-border flex min-h-screen items-start justify-center p-[20px]">
      <div className="m-auto flex w-full max-w-[470px] flex-col gap-[14px]">
        <Logo height={21} className="self-start" />

        <div className="flex flex-col gap-[18px] rounded-[12px] border border-line bg-surface p-[32px]">
          <span
            className={cx(
              "inline-flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px]",
              TONE[tone],
            )}
          >
            <Icon name={icon} size={16} />
          </span>

          <div className="flex flex-col gap-[9px]">
            <h1 className="m-0 font-serif text-[32px] leading-[1.08] font-normal tracking-[-0.012em] text-ink">
              {title}
            </h1>
            <p className="m-0 text-[14px] leading-[1.6] text-pretty text-ink-2">{children}</p>
          </div>

          {actions ? <div className="flex flex-wrap gap-[9px]">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
