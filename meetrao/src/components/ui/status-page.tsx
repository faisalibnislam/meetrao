import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

const TONE = {
  red: "bg-red-soft text-red",
  amber: "bg-amber-soft text-amber",
  neutral: "bg-fill text-ink-2",
} as const;

/* The supplied wordmark, 576 × 127. */
const LOGO_HEIGHT = 21;
const LOGO_WIDTH = Math.round((LOGO_HEIGHT * 576) / 127);

/**
 * A whole screen that says one thing: suspended, not found, something broke.
 *
 * The layout the Suspended page has always had, lifted out so a 404 and an
 * error read as part of the same product rather than as the framework's
 * defaults.
 *
 * KEPT LIGHT ON PURPOSE. The root error boundary and the not-found page are
 * part of every route's first load, so whatever this imports is downloaded
 * on every page of the site. With next/image for the logo and the icon set
 * for the mark it added 12KB gzipped to all of them. The logo is an SVG,
 * which next/image passes through untouched, so a plain <img> is the same
 * thing; the mark is the caller's, which on a server page costs nothing.
 */
export function StatusPage({
  mark,
  tone,
  title,
  children,
  actions,
}: {
  /** An icon, 16px. */
  mark: ReactNode;
  tone: keyof typeof TONE;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="box-border flex min-h-screen items-start justify-center p-[20px]">
      <div className="m-auto flex w-full max-w-[470px] flex-col gap-[14px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/meetrao-logo.svg"
          alt="Meetrao"
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          className="block w-auto self-start"
          style={{ height: LOGO_HEIGHT }}
        />

        <div className="flex flex-col gap-[18px] rounded-[12px] border border-line bg-surface p-[32px]">
          <span
            className={cx(
              "inline-flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px]",
              TONE[tone],
            )}
          >
            {mark}
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
