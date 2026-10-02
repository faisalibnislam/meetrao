import Link from "next/link";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

/* ─────────────────────────────────────────────────────────────────────────────
   The shell both legal documents share: a context strip, a sticky contents rail
   and the prose column.

   DraftNotice and NeedsDecision used to live here, an amber banner across the
   top of each document and inline callouts for the open questions. Both are
   gone, along with the questions they held: the operator, the minimum age, the
   transfer mechanism, the liability cap and the consent banner have all been
   decided, and the documents are published rather than drafts. Do not
   reintroduce a "draft for legal review" banner on a page Google's OAuth
   verification reads. A policy that announces it is not final reads as one
   that does not apply.

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
        <Link href={otherHref} className="unlink inline-flex items-center gap-[8px] text-[13px] text-ink-2 hover:text-accent-ink">
          {otherLabel}
          <Icon name="chevron-right" size={9} />
        </Link>
      </div>
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
              className="unlink rounded-[6px] px-[9px] py-[6px] text-[12.5px] leading-[1.4] text-ink-2 hover:bg-accent-soft hover:text-accent-ink"
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
        <span className="text-[11.5px] text-ink-3">{meta[0]}</span>
        <span className="text-[11.5px] text-ink-3">{meta[1]}</span>
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
