import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Layout for the component gallery at /preview.

   Deliberately plain: the gallery's own chrome must not compete with the
   specimens, and it must never introduce a colour, size or radius that is not
   already a token, otherwise the page stops being a truthful inventory.

   Server-safe on purpose. Everything here renders on the server so the gallery
   costs one request, and the stateful controls stay quarantined in the two
   client islands beside this file.
   ───────────────────────────────────────────────────────────────────────────── */

export function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-[72px] flex-col gap-[16px]">
      <div className="flex flex-col gap-[3px] border-b border-line pb-[10px]">
        <h2 className="m-0 text-[19px] font-semibold tracking-[-0.012em] text-ink">{title}</h2>
        {note ? <p className="m-0 max-w-[70ch] text-[12.5px] leading-[1.6] text-ink-3">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * One specimen: the rendered thing, over the props that produced it.
 *
 * The caption is the point of the gallery as much as the render is. It is what
 * turns "that shade of green" into `variant="accent"`.
 */
export function Specimen({
  caption,
  children,
  align = "start",
  className,
}: {
  caption?: string;
  children: ReactNode;
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-[7px]", className)}>
      <div
        className={cx(
          "flex min-h-[52px] flex-wrap items-center gap-[10px] rounded-[8px] border border-line bg-surface px-[14px] py-[12px]",
          align === "center" && "justify-center",
        )}
      >
        {children}
      </div>
      {caption ? <code className="text-[11px] leading-[1.5] text-ink-3">{caption}</code> : null}
    </div>
  );
}

/** A row of specimens that wraps. The default arrangement for a variant set. */
export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("flex flex-wrap items-start gap-[12px]", className)}>{children}</div>;
}

/** Responsive columns for specimens that need width (panels, cards, fields). */
export function Grid({ min = 260, children }: { min?: number; children: ReactNode }) {
  return (
    <div className="grid gap-[12px]" style={{ gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))` }}>
      {children}
    </div>
  );
}

/** The bare surface a specimen sits on when it brings its own container. */
export function Bare({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("flex min-w-0 flex-col gap-[7px]", className)}>{children}</div>;
}

export function Caption({ children }: { children: string }) {
  return <code className="text-[11px] leading-[1.5] text-ink-3">{children}</code>;
}
