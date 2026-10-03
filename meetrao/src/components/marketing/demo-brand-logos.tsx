/* ─────────────────────────────────────────────────────────────────────────────
   Logos for the three invented businesses in the branding showcase.

   THE WORDMARK IS DRAWN, NOT SET. It used to be the brand's name in the site's
   own font beside a mark, which is precisely what a booking page looks like
   when nobody has uploaded a logo: the state this panel exists to say you can
   leave. A real logo has its own letterforms.

   So there is a small monoline alphabet below and each name is composed from
   it. One alphabet rather than three bespoke wordmarks because the names share
   most of their letters, and because a drawn `o` that differs between two
   logos reads as a mistake rather than as two brands.

   It is geometric and single-weight: circles for the round letters, a 10-unit
   x-height on a 20-unit baseline, 2-unit stroke, round caps and joins. That is
   a narrow enough brief to be consistent by construction, which hand-drawing
   twenty-five letters is not.

   Everything is `currentColor`, so a logo takes its brand's ink and crossfades
   with the rest of the card instead of being three fixed images.

   The businesses are invented. A real company's mark on a page selling
   somebody else's product is a trademark problem and an implied endorsement.
   ───────────────────────────────────────────────────────────────────────────── */

export type DemoBrandKey = "sunfold" | "brightwell" | "marlowe";

/* ── The alphabet ──────────────────────────────────────────────────────────
   Baseline y=20, x-height y=10, ascender y=4, cap y=5. `w` is the advance,
   which includes the right-hand sidebearing. Only the letters these three
   names need, because an alphabet nobody renders is an alphabet nobody
   checked. ── */

type Glyph = { d: string; w: number };

const GLYPHS: Record<string, Glyph> = {
  // Capitals
  S: { d: "M10 7.6a4.2 4.2 0 0 0-3.6-2H5a3.1 3.1 0 0 0 0 6.2h2.6a3.3 3.3 0 0 1 0 6.6H5.4A4.2 4.2 0 0 1 1.6 18", w: 12.6 },
  B: { d: "M1 5.6v14.4M1 5.6h5.2a3.6 3.6 0 0 1 0 7.2H1M1 12.8h5.8a3.6 3.6 0 0 1 0 7.2H1", w: 12.4 },
  M: { d: "M1 20V5.6l6.2 7.4 6.2-7.4V20", w: 15.4 },

  // Lower case
  a: { d: "M6 10.2a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8M10.9 10.2V20", w: 12.6 },
  b: { d: "M1 4v16M5.9 10.2a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8", w: 12.4 },
  d: { d: "M6 10.2a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8M10.9 4v16", w: 12.4 },
  e: { d: "M1.1 15.1h9.8a4.9 4.9 0 1 0-1.7 3.7", w: 12.4 },
  f: { d: "M9 4.4H7.2a3.2 3.2 0 0 0-3.2 3.2V20M1 11.4h6.6", w: 9.4 },
  g: { d: "M6 10.2a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8M10.9 10.2v11.6a3.2 3.2 0 0 1-3.2 3.2H4.8", w: 12.4 },
  h: { d: "M1 4v16M1 14.6a4.4 4.4 0 0 1 8.8 0V20", w: 11.4 },
  i: { d: "M1 10.4V20M1 5.8v0.2", w: 3.4 },
  l: { d: "M1 4v16", w: 3.4 },
  m: { d: "M1 10.4V20M1 14.6a4 4 0 0 1 8 0V20M9 14.6a4 4 0 0 1 8 0V20", w: 18.6 },
  n: { d: "M1 10.4V20M1 14.6a4.4 4.4 0 0 1 8.8 0V20", w: 11.4 },
  o: { d: "M6 10.2a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8", w: 12.4 },
  r: { d: "M1 10.4V20M1 14.8a4.4 4.4 0 0 1 4.4-4.4", w: 7 },
  s: { d: "M9 11.6a3.5 3.5 0 0 0-2.9-1.4H4.4a2.6 2.6 0 0 0 0 5.2h2.8a2.6 2.6 0 0 1 0 5.2H5.1A3.5 3.5 0 0 1 2.2 18.6", w: 11, },
  t: { d: "M3.2 5.6v10.6a3.8 3.8 0 0 0 3.8 3.8M1 10.6h6.2", w: 9 },
  u: { d: "M1 10.4v5.2a4.4 4.4 0 0 0 8.8 0v-5.2M9.8 15.6V20", w: 11.4 },
  w: { d: "M1 10.4l3.4 9.6 3.6-7 3.6 7 3.4-9.6", w: 17 },
};

const LETTER = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const MARK = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/* ── The three marks ─────────────────────────────────────────────────────── */

const MARKS: Record<DemoBrandKey, string[]> = {
  /* A folded corner. The first draft was a sun over two fold lines; at the
     size this is used it read as a dome over a bridge, and the three strokes
     merged. A corner keeps its silhouette down to 16px. */
  sunfold: ["M4.6 3.8h9.2l6 6v10.4H4.6z", "M13.8 3.8v6h6"],
  /* A drop. Was a dot between two arcs, which read as the letter o in
     brackets. One closed outline survives the shrink; three strokes did not. */
  brightwell: ["M12 3.4c3.8 4 6 6.9 6 9.6a6 6 0 0 1-12 0c0-2.7 2.2-5.6 6-9.6z"],
  marlowe: ["M4.2 19.4V5.6l7.8 7 7.8-7v13.8"],
};

const NAMES: Record<DemoBrandKey, string> = {
  sunfold: "Sunfold",
  brightwell: "Brightwell",
  marlowe: "Marlowe",
};

/** Lays the name out along the baseline and returns its drawn width. */
function compose(name: string): { paths: { d: string; x: number }[]; width: number } {
  const paths: { d: string; x: number }[] = [];
  let x = 0;
  for (const ch of name) {
    const glyph = GLYPHS[ch];
    if (!glyph) continue; // A name using a letter nobody drew simply loses it.
    paths.push({ d: glyph.d, x });
    x += glyph.w;
  }
  return { paths, width: x };
}

/**
 * Mark and wordmark as one lockup, scaled from a single height.
 *
 * The whole thing is one viewBox so the gap between mark and letters cannot
 * drift with font loading or text rendering, which is the failure the old
 * version had: an SVG next to a styled span, agreeing only by luck.
 */
export function DemoBrandLogo({ brand, height = 19 }: { brand: DemoBrandKey; height?: number }) {
  const word = compose(NAMES[brand]);
  const GAP = 7;
  const MARK_W = 24;
  const total = MARK_W + GAP + word.width;

  return (
    <svg
      viewBox={`0 0 ${total} 24`}
      height={height}
      width={(total / 24) * height}
      role="img"
      aria-label={NAMES[brand]}
      style={{ display: "block", flex: "none" }}
    >
      {MARKS[brand].map((d) => (
        <path key={d} d={d} {...MARK} />
      ))}
      {word.paths.map((p, i) => (
        <path key={`${p.d}-${i}`} d={p.d} transform={`translate(${MARK_W + GAP + p.x} 0)`} {...LETTER} />
      ))}
    </svg>
  );
}
