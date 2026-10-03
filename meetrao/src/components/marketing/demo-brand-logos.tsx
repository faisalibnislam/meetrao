/* ─────────────────────────────────────────────────────────────────────────────
   Marks for the three invented businesses in the branding showcase.

   DRAWN, NOT TYPESET. The panel was showing a brand's name set in the page's
   own font, which is what a booking page looks like when somebody has NOT
   uploaded a logo: exactly the thing the panel is there to say you can
   replace. A wordmark beside a real mark is what a host actually sees.

   Every stroke is `currentColor`, so each one takes its brand's ink and
   crossfades with the rest of the card rather than being three fixed images.
   They are also the house icon style: 24-unit grid, square caps, mitred
   joins, so they sit beside the product's own glyphs without arguing.

   The businesses are invented. A real company's mark on a page selling
   somebody else's product is a trademark problem and an implied endorsement,
   and these only have to look like somebody's.
   ───────────────────────────────────────────────────────────────────────────── */

export type DemoBrandKey = "sunfold" | "brightwell" | "marlowe";

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "square",
  strokeLinejoin: "miter",
} as const;

/**
 * A folded corner.
 *
 * The first attempt was a sun over two fold lines. At 72px it read as a dome
 * over a bridge, and at 17px the three strokes merged into a blob. A dog-ear
 * holds its shape all the way down because the fold is a corner rather than a
 * gap between parallel lines.
 */
function Sunfold() {
  return (
    <>
      <path d="M4.6 3.8h9.2l6 6v10.4H4.6z" {...STROKE} />
      <path d="M13.8 3.8v6h6" {...STROKE} />
    </>
  );
}

/**
 * A drop.
 *
 * Was a dot between two arcs, meant as a well seen from above with the ripple
 * going out. It read as the letter o in brackets, and at 17px as a smudge. One
 * closed outline survives the shrink; three separated strokes do not.
 */
function Brightwell() {
  return <path d="M12 3.4c3.8 4 6 6.9 6 9.6a6 6 0 0 1-12 0c0-2.7 2.2-5.6 6-9.6z" {...STROKE} />;
}

/** An M, cut square. */
function Marlowe() {
  return <path d="M4.2 19.4V5.6l7.8 7 7.8-7v13.8" {...STROKE} />;
}

const MARKS: Record<DemoBrandKey, () => React.ReactElement> = {
  sunfold: Sunfold,
  brightwell: Brightwell,
  marlowe: Marlowe,
};

/**
 * The mark and the name, as one lockup.
 *
 * Sized from the wordmark rather than the other way round: a mark that is
 * taller than the letters beside it reads as a sticker stuck on a word.
 */
export function DemoBrandLogo({ brand, name }: { brand: DemoBrandKey; name: string }) {
  const Mark = MARKS[brand];
  return (
    <span className="flex items-center gap-[7px]">
      <svg
        viewBox="0 0 24 24"
        width={17}
        height={17}
        aria-hidden="true"
        focusable="false"
        style={{ display: "block", flex: "none" }}
      >
        <Mark />
      </svg>
      <span className="text-[13px] font-bold tracking-[-0.012em]">{name}</span>
    </span>
  );
}
