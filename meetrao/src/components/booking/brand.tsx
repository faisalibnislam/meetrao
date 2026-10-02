import type { ReactNode } from "react";
import { brandTokens } from "@/convex/lib/brand";
import { Logo } from "@/components/ui/logo";

/* ─────────────────────────────────────────────────────────────────────────────
   A Pro host's own logo and colours on the pages their guests see.

   TWO PIECES, AND THEY ARE SEPARATE ON PURPOSE. `BrandMark` swaps the mark at
   the top of the page; `BrandScope` recolours everything else. A host may set
   either without the other — a logo and our green, or their colours and no
   logo — and each page composes the two it needs.

   HOW THE COLOURS ARE APPLIED: by rebinding the design's own CSS variables at
   `:root`, not by passing colours down through props. Every booking surface is
   already written in `bg-accent`, `text-accent-ink`, `border-line` and the
   rest, so rebinding the variables recolours the selected date, the confirm
   button, the badges, the panels, the borders and the focus rings at once —
   including parts nobody remembered to list.

   WHY `:root` AND NOT A WRAPPER. This used to be a `display: contents` div,
   which inherits its variables down to its children and no further. The page
   background is painted by `html, body` — ANCESTORS of anything a page
   renders — so the ground stayed Meetrao's warm grey no matter what the host
   chose, and so did the cookie banner, which the root layout mounts outside
   the page entirely. A `:root` rule reaches both. One host owns one page here,
   so there is nothing for a page-wide rule to collide with.

   Nothing is wrapped, so the (public) layout's column still sees the card and
   the footer as its own children — which is what a previous version of this
   file broke by introducing a box.
   ───────────────────────────────────────────────────────────────────────────── */

/** What the public queries return. Null means "use Meetrao's". */
export type PublicBrand = { logoUrl: string | null; color: string | null; background: string | null } | null;

export function BrandScope({ brand, children }: { brand: PublicBrand; children: ReactNode }) {
  const tokens = brandTokens(brand?.color ?? null, brand?.background ?? null);
  if (!tokens) return <>{children}</>;

  /* Written out rather than built from a loop so that every variable this
     overrides is greppable from the token it comes from. */
  const css = `:root{
--accent:${tokens.accent};
--accent-2:${tokens.accentHover};
--accent-ink:${tokens.accentText};
--on-accent:${tokens.onAccent};
--accent-soft:${tokens.soft};
--accent-soft-hover:${tokens.line};
--accent-line:${tokens.line};
--ground:${tokens.ground};
--on-ground:${tokens.onGround};
--surface:${tokens.surface};
--fill:${tokens.fill};
--fill-2:${tokens.fill2};
--line:${tokens.borderBase};
--line-soft:${tokens.borderSoft};
--line-strong:${tokens.borderStrong};
--sidebar:${tokens.fill};
}`;

  return (
    <>
      {/* Every value is a hex string that validateBrandColor accepted, so there
          is nothing here a host could close a declaration with. */}
      <style>{css}</style>
      {children}
    </>
  );
}

/**
 * The mark at the top of a guest-facing page: the host's, or ours.
 *
 * A host's own logo renders 35% larger than the Meetrao mark it replaces.
 * Ours is a wordmark drawn to sit quietly at 20px; theirs is usually a square
 * or near-square symbol, which at the same height reads as half the size and
 * looks like an afterthought on their own page.
 *
 * Height-constrained rather than width-constrained, and capped in width too,
 * because a host's logo can be any shape at all — a square avatar and a long
 * wordmark both have to sit on the same row without pushing the eyebrow beside
 * them off the page.
 */
export function BrandMark({
  brand,
  height = 20,
  hostName,
}: {
  brand: PublicBrand;
  /** The height OUR mark would take. A host's own is scaled up from it. */
  height?: number;
  /** For the alt text. A logo IS the host's name to a guest who knows them. */
  hostName?: string;
}) {
  if (brand?.logoUrl) {
    const own = Math.round(height * 1.35);
    return (
      // Plain <img>, as with avatars: the source is a Convex file-storage URL
      // that changes whenever the host re-uploads, and this is a ~27px-tall
      // mark — there is nothing for the optimiser to save.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.logoUrl}
        alt={hostName ? `${hostName} logo` : "Logo"}
        className="block w-auto max-w-[240px] flex-none object-contain object-left"
        style={{ height: own, maxHeight: own }}
      />
    );
  }
  return <Logo height={height} />;
}
