import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

/**
 * The header sits on `--ground` with a bottom hairline, and shares the same
 * 1120px centred column as the page body so titles line up with content.
 *
 * The dashboard uses `tall` for its greeting block; every other screen sits
 * tight.
 */
export function PageHeader({
  title,
  subtitle,
  crumb,
  actions,
  tall = false,
  children,
}: {
  title?: string;
  subtitle?: string;
  crumb?: { href: string; label: string; current: string };
  actions?: ReactNode;
  tall?: boolean;
  /** Replaces the title block entirely — used by the dashboard greeting. */
  children?: ReactNode;
}) {
  return (
    <header className="flex-none border-b border-line bg-ground">
      <div
        className={cn(
          "mx-auto flex max-w-[1120px] flex-wrap items-end justify-between gap-[14px]",
          tall
            ? "px-[16px] pt-[44px] pb-[14px] md:px-[26px] md:pt-[46px] md:pb-[16px]"
            : "px-[16px] py-[14px] md:px-[26px] md:py-[16px]",
        )}
      >
        {children ?? (
          <div className="flex min-w-0 flex-col gap-[2px]">
            {crumb ? (
              <div className="flex items-center gap-[7px] text-[12px] text-ink-3">
                <Link
                  href={crumb.href}
                  className="text-[12px] font-medium text-ink-2"
                >
                  {crumb.label}
                </Link>
                <Icon name="chevronRight" size={8} />
                <span>{crumb.current}</span>
              </div>
            ) : null}
            {title ? (
              <h1 className="m-0 truncate text-[19px] leading-[1.35] font-semibold tracking-[-0.012em] text-ink">
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p className="m-0 text-[12.5px] text-ink-2">{subtitle}</p>
            ) : null}
          </div>
        )}

        {actions ? (
          <div className="flex flex-wrap items-center gap-[8px]">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

/** The scrolling body beneath the header. */
export function PageBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ground">
      <div className="mx-auto max-w-[1120px] px-[16px] pt-[18px] pb-[40px] md:px-[26px] md:pt-[24px]">
        {children}
      </div>
    </div>
  );
}
