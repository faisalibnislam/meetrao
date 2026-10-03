/* ─────────────────────────────────────────────────────────────────────────────
   Logotypes for the three invented businesses in the branding showcase.

   WHAT THE EARLIER VERSIONS GOT WRONG. First the name was set in the site's
   own font beside a mark, which is what a booking page looks like when nobody
   has uploaded a logo: the state this panel exists to say you can leave. Then
   the letters were drawn, but at icon weight on a 24-unit grid, which reads as
   an icon font rather than a logotype. A wordmark is bold and it is built on a
   type grid.

   So: BOLD MODULAR CAPS on a 100-unit grid. Cap height 68, from y=18 to y=86.
   Stroke 16, round caps and joins, so every letter is the same weight by
   construction and the curves are circles rather than freehand. That is the
   Bauhaus-descended geometric logotype, which is a real style and, more to the
   point, one whose every coordinate can be computed instead of eyeballed.

   THE NAMES WERE CHOSEN TO FIT THE ALPHABET, not the other way round. Eleven
   letters, each of which is a circle, a straight line or both. No G, R, W or
   Q: the letters where a geometric face needs judgement rather than geometry,
   and where the previous attempts went soft.

   Each wordmark carries one deliberate departure, the way a real one does:
   Sunfold's O is folded, Halden's A has no crossbar, Lumen's E is stepped.
   Without it a geometric logotype is just a font.

   Everything is `currentColor`, so a logo takes its brand's ink and crossfades
   with the rest of the card. The businesses are invented: a real company's
   mark on a page selling somebody else's product is a trademark problem and an
   implied endorsement.
   ───────────────────────────────────────────────────────────────────────────── */

export type DemoBrandKey = "sunfold" | "halden" | "lumen";

/* ── The alphabet ──────────────────────────────────────────────────────────
   Drawn left-aligned at x=0 in a 0..w box; the composer translates them. `w`
   is the glyph width, and TRACK below is added between letters. ── */

type Glyph = { d: string; w: number };

const GLYPHS: Record<string, Glyph> = {
  S: { d: "M46 31a13 13 0 0 0-11-7H21a12 12 0 0 0 0 24h13a12 12 0 0 1 0 24H20a13 13 0 0 1-11-7", w: 54 },
  U: { d: "M9 18v42a19 19 0 0 0 38 0V18", w: 56 },
  N: { d: "M9 86V18l38 68V18", w: 56 },
  F: { d: "M9 86V18h35M9 52h27", w: 50 },
  O: { d: "M27 18a27 34 0 1 0 0 68 27 34 0 0 0 0-68", w: 56 },
  L: { d: "M9 18v68h34", w: 50 },
  D: { d: "M9 18v68h11a34 34 0 0 0 0-68z", w: 56 },
  H: { d: "M9 18v68M47 18v68M9 52h38", w: 56 },
  A: { d: "M9 86 28 18l19 68", w: 56 },
  E: { d: "M44 18H9v68h35M9 52h26", w: 50 },
  M: { d: "M9 86V18l19 36 19-36v68", w: 56 },
};

const TRACK = 8;

/**
 * The one departure each logotype makes from the grid.
 *
 * Indexed by letter position, which is the whole reason it takes `x` rather
 * than carrying coordinates: the first version put Lumen's detail at index 4
 * and drew it across the N, because L-U-M-E-N puts E at 3. A magic number in a
 * logo is wrong silently.
 */
const DETAIL: Record<DemoBrandKey, (x: (i: number) => number) => string[]> = {
  // A fold across the O. SUNFOLD puts O at index 4.
  sunfold: (x) => [`M${x(4) + 6} 52h42`],
  /* Halden's A has no crossbar, and Lumen's character is in its mark. Two of
     the three being absences is the point: a detail on every logo is a house
     style, which is what three separate businesses would not have. */
  halden: () => [],
  lumen: () => [],
};

const NAMES: Record<DemoBrandKey, string> = {
  sunfold: "SUNFOLD",
  halden: "HALDEN",
  lumen: "LUMEN",
};

/* ── The marks ─────────────────────────────────────────────────────────────
   On the same grid as the letters, so the two weights agree. Each is a closed
   outline: separated strokes turn to mush at the size these are used. ── */

const MARKS: Record<DemoBrandKey, string> = {
  /** A folded corner. */
  sunfold: "M18 18h34l22 22v46H18z M52 18v22h22",
  /** A pitched roof, open at the foot. */
  halden: "M18 86V44l28-26 28 26v42",
  /** A lamp: a half-circle over its base. */
  lumen: "M18 60a28 28 0 0 1 56 0z M32 74h28M38 86h16",
};

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 16,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function DemoBrandLogo({ brand, height = 20 }: { brand: DemoBrandKey; height?: number }) {
  const name = NAMES[brand];

  /* Where each letter starts, so the detail paths can find their own letter
     rather than carrying a magic number that breaks when a name changes. */
  const offsets: number[] = [];
  let cursor = 0;
  for (const ch of name) {
    offsets.push(cursor);
    cursor += GLYPHS[ch].w + TRACK;
  }
  const wordWidth = cursor - TRACK;

  const MARK_W = 92;
  const GAP = 30;
  const at = (i: number) => MARK_W + GAP + offsets[i];
  const total = MARK_W + GAP + wordWidth;

  return (
    <svg
      viewBox={`0 0 ${total} 104`}
      height={height}
      width={(total / 104) * height}
      role="img"
      aria-label={name.charAt(0) + name.slice(1).toLowerCase()}
      style={{ display: "block", flex: "none" }}
    >
      <path d={MARKS[brand]} {...STROKE} />
      {[...name].map((ch, i) => (
        <path key={`${ch}-${i}`} d={GLYPHS[ch].d} transform={`translate(${at(i)} 0)`} {...STROKE} />
      ))}
      {DETAIL[brand](at).map((d) => (
        <path key={d} d={d} {...STROKE} />
      ))}
    </svg>
  );
}
