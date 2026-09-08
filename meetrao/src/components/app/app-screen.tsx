import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

/* ─────────────────────────────────────────────────────────────────────────────
   The page frame inside the app shell: a fixed header on a bottom border, then
   the scrolling body. Header contents sit in the same 1120px centred column as
   the body, so titles and content line up.
   ───────────────────────────────────────────────────────────────────────────── */

export type Crumb = { label: string; href: string };

export function AppScreen({
  title,
  subtitle,
  crumb,
  crumbCurrent,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  crumb?: Crumb;
  crumbCurrent?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="flex-none border-b border-line bg-ground">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-end justify-between gap-[14px] px-[26px] py-[16px] max-[820px]:px-[16px] max-[820px]:py-[14px]">
          <div className="flex min-w-0 flex-col gap-[2px]">
            {crumb ? (
              <div className="flex items-center gap-[7px] text-[12px] text-ink-3">
                <Link href={crumb.href} className="text-[12px] font-medium text-ink-2">
                  {crumb.label}
                </Link>
                <Icon name="chevron-right" size={8} />
                <span>{crumbCurrent}</span>
              </div>
            ) : null}
            <h1 className="m-0 overflow-hidden text-[19px] leading-[1.35] font-semibold tracking-[-0.012em] text-ellipsis whitespace-nowrap text-ink">
              {title}
            </h1>
            {subtitle ? <p className="m-0 text-[12.5px] text-ink-2">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-[8px]">{actions}</div> : null}
        </div>
      </header>

      <AppBody>{children}</AppBody>
    </>
  );
}

/**
 * The dashboard's header is independent of every other screen's: no page title,
 * and deliberate breathing room above the greeting.
 */
export function DashboardScreen({
  header,
  actions,
  children,
}: {
  header: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="flex-none border-b border-line bg-ground">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-end justify-between gap-[14px] px-[26px] pt-[46px] pb-[16px] max-[820px]:px-[16px] max-[820px]:pt-[44px] max-[820px]:pb-[14px]">
          {header}
          {actions ? <div className="flex flex-wrap items-center gap-[8px]">{actions}</div> : null}
        </div>
      </header>
      <AppBody>{children}</AppBody>
    </>
  );
}

function AppBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ground">
      <div className="mx-auto max-w-[1120px] px-[26px] pt-[24px] pb-[90px] max-[820px]:px-[16px] max-[820px]:pt-[18px]">
        {children}
      </div>
    </div>
  );
}
