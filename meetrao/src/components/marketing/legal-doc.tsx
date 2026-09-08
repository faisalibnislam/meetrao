import Link from "next/link";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

/* ─────────────────────────────────────────────────────────────────────────────
   The shell both legal documents share: a context strip, the draft notice, a
   sticky contents rail and the prose column.

   The rail is `box-sizing: border-box` with a max-height budget that has to
   cover the sticky offset AND the element's own padding and border, or it hangs
   off the bottom of the viewport. Below 880px it goes static and its list
   becomes a wrapping chip row.
   ───────────────────────────────────────────────────────────────────────────── */

export type TocEntry = { id: string; label: string };

export function DocContextStrip({
  title,
  otherLabel,
  otherHref,
}: {
  title: string;
  otherLabel: string;
  otherHref: string;
}) {
  return (
    <div className="border-b border-line bg-ground">
      <div className="mx-auto flex max-w-[1148px] flex-wrap items-center justify-between gap-[12px] px-[26px] py-[14px] max-[560px]:px-[18px]">
        <span className="text-[13.5px] font-semibold text-ink">{title}</span>
        <Link href={otherHref} className="unlink inline-flex items-center gap-[8px] text-[13px] text-ink-2 hover:text-accent">
          {otherLabel}
          <Icon name="chevron-right" size={9} />
        </Link>
      </div>
    </div>
  );
}

/** The whole document is a draft until a lawyer has read it, and says so. */
export function DraftNotice({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-amber-line bg-amber-soft">
      <div className="mx-auto flex max-w-[1148px] gap-[13px] px-[26px] py-[16px] max-[560px]:px-[18px]">
        <span className="inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-amber text-[12px] font-bold text-white">
          !
        </span>
        <div className="flex flex-col gap-[3px]">
          <span className="text-[13.5px] font-semibold text-amber-ink">Draft for legal review</span>
          <span className="text-[12.5px] leading-[1.55] text-pretty text-amber-ink">{children}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * An open question a lawyer or the owner has to close.
 *
 * These stay as visible callouts. Inventing legal text to fill them would look
 * finished and be worse than an honest gap.
 */
export function NeedsDecision({ label = "Needs a decision", children }: { label?: string; children: ReactNode }) {
  return (
    <div className="my-[18px] rounded-[8px] border border-amber-line bg-amber-soft px-[15px] py-[13px]">
      <span className="text-[13px] leading-[1.6] text-pretty text-amber-ink">
        <strong className="font-semibold">{label}:</strong> {children}
      </span>
    </div>
  );
}

export function DocLayout({
  toc,
  ariaLabel,
  children,
}: {
  toc: TocEntry[];
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1148px] flex-wrap items-start gap-[40px] px-[26px] pt-[36px] pb-[64px] max-[560px]:px-[18px]">
      <nav
        aria-label={ariaLabel}
        className="doc-rail box-border flex w-[230px] flex-none flex-col gap-[12px] max-[880px]:w-full"
      >
        <Eyebrow>Contents</Eyebrow>
        <div className="doc-rail-list flex flex-col gap-[2px]">
          {toc.map((entry) => (
            <a
              key={entry.id}
              href={`#${entry.id}`}
              className="unlink rounded-[6px] px-[9px] py-[6px] text-[12.5px] leading-[1.4] text-ink-2 hover:bg-accent-soft hover:text-accent"
            >
              {entry.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="min-w-[300px] flex-1">
        <article className="doc-prose max-w-[70ch]">{children}</article>
      </div>
    </div>
  );
}

export function DocHeader({
  eyebrow,
  title,
  intro,
  meta,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  meta: [string, string];
}) {
  return (
    <>
      <Eyebrow size={10.5}>{eyebrow}</Eyebrow>
      <h1 className="mt-[10px] mb-0 font-serif text-[clamp(30px,3.6vw,42px)] leading-[1.05] font-normal tracking-[-0.02em] text-balance text-ink">
        {title}
      </h1>
      <p className="mt-[14px] mb-0 text-[15px] leading-[1.65] text-pretty text-ink-2">{intro}</p>
      <div className="mt-[16px] mb-[26px] flex flex-wrap gap-x-[18px] gap-y-[6px] border-b border-line pb-[20px]">
        <span className="font-mono text-[11.5px] text-ink-3">{meta[0]}</span>
        <span className="font-mono text-[11.5px] text-ink-3">{meta[1]}</span>
      </div>
    </>
  );
}

export function DocFooterNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-[30px] flex flex-col gap-[5px] rounded-[10px] border border-line bg-fill px-[16px] py-[15px]">
      <span className="text-[13.5px] font-semibold text-ink">{title}</span>
      <span className="text-[13px] leading-[1.6] text-ink-2">{children}</span>
    </div>
  );
}
