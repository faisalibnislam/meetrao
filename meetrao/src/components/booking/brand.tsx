import type { CSSProperties, ReactNode } from "react";
import { brandTokens } from "@/convex/lib/brand";
import { Logo } from "@/components/ui/logo";

/* ─────────────────────────────────────────────────────────────────────────────
   A Pro host's own logo and colour on the pages their guests see.

   TWO PIECES, AND THEY ARE SEPARATE ON PURPOSE. `BrandMark` swaps the mark at
   the top of the page; `BrandScope` recolours everything inside it. A host may
   set either without the other — a logo and our green, or their colour and no
   logo — and each page composes the two it needs.

   HOW THE COLOUR IS APPLIED: by rebinding the design's own CSS variables on a
   wrapper, not by passing a colour down through props. Every booking surface
   is already written in `bg-accent`, `text-accent-ink`, `border-accent-line`
   and the rest, so rebinding the variables recolours the selected date, the
   confirm button, the badges, the avatar fallback and the focus rings at once
   — including parts nobody remembered to list. The alternative, threading a
   colour to each one, is a list that goes stale the first time somebody adds a
   component to the page.

   The wrapper is `display: contents`, so it introduces no box: custom
   properties still inherit through it, and the page's own layout — which has
   already been broken once by an extra flex container — is untouched.
   ───────────────────────────────────────────────────────────────────────────── */

/** What the public queries return. Null means "use Meetrao's". */
export type PublicBrand = { logoUrl: string | null; color: string | null } | null;

export function BrandScope({ brand, children }: { brand: PublicBrand; children: ReactNode }) {
  const tokens = brandTokens(brand?.color ?? null);
  if (!tokens) return <>{children}</>;

  const style = {
    "--accent": tokens.accent,
    "--accent-2": tokens.accentHover,
    /* Readable as text, which the raw colour of a vivid brand is not. */
    "--accent-ink": tokens.accentText,
    /* Measured against the fill, so a yellow button gets a dark label. */
    "--on-accent": tokens.onAccent,
    "--accent-soft": tokens.soft,
    "--accent-soft-hover": tokens.line,
    "--accent-line": tokens.line,
  } as CSSProperties;

  return (
    <div className="contents" style={style}>
      {children}
    </div>
  );
}

/**
 * The mark at the top of a guest-facing page: the host's, or ours.
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
  height?: number;
  /** For the alt text. A logo IS the host's name to a guest who knows them. */
  hostName?: string;
}) {
  if (brand?.logoUrl) {
    return (
      // Plain <img>, as with avatars: the source is a Convex file-storage URL
      // that changes whenever the host re-uploads, and this is a 20px-tall
      // mark — there is nothing for the optimiser to save.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.logoUrl}
        alt={hostName ? `${hostName} logo` : "Logo"}
        className="block w-auto max-w-[180px] flex-none object-contain object-left"
        style={{ height, maxHeight: height }}
      />
    );
  }
  return <Logo height={height} />;
}
