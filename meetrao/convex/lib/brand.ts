/* ─────────────────────────────────────────────────────────────────────────────
   A host's own logo and colour.

   Pure, and in convex/ rather than src/ because the mutation that stores a
   colour has to validate it and a Convex function cannot import from src/.
   The app imports it back the other way, through the "@/convex" alias, so
   there is one implementation rather than two that drift.

   THE RULE THAT MATTERS IS CONTRAST, AND THE OBVIOUS RULE IS WRONG.

   The first version refused any colour under 3:1 against a white page, on the
   grounds that WCAG asks that of a UI component. That rejected plain orange
   (2.94:1) and yellow (1.43:1) — both of which are somebody's actual brand,
   and both of which make a perfectly readable button when it is FILLED with
   them and the text on top is chosen to suit. The 3:1 rule is about telling a
   component apart from its background, not about a solid button whose own
   label carries the contrast.

   So the choice is not restricted where it does not need to be. Instead:

   · as a FILL, any colour is allowed that is distinguishable from the page at
     all, and the text on it is picked by measurement — white or ink;
   · as TEXT, the colour is darkened until it clears 4.5:1 on white, because a
     host who picks yellow still needs their links to be readable.

   Two things are still refused, and only two:

   · the near-white — #FFF9E6, #EAF6FF, a sand or a mint taken straight out of
     a logo. Those do not make a pale button, they make something the guest
     does not recognise as a button;
   · the narrow band of mid-tones, around #7A7A7A, where NEITHER white nor ink
     clears 4.5:1 on top. There is no label that can be read on those, so the
     only honest answer is to say so.
   ───────────────────────────────────────────────────────────────────────────── */

/** The surface a brand colour is drawn on. Mirrors --surface in globals.css. */
const PAGE = "#ffffff";

/** Ink, for when a brand colour is too light to carry white text. */
export const BRAND_INK = "#1a1917";
export const BRAND_ON_DARK = "#ffffff";

/**
 * How far a fill must be from the page to read as a fill. OUR floor, not a
 * standard one: WCAG has nothing to say about a solid button whose label
 * carries the contrast. Set where it separates a visible tint (yellow, 1.43)
 * from a colour that is white with a story (#FFF9E6, 1.05).
 */
const MIN_FILL_AGAINST_PAGE = 1.25;

/** WCAG 1.4.3 for body text, which is what `accentText` is for. */
const MIN_TEXT = 4.5;

/** A filled button's own label has to clear the same bar. */
const MIN_LABEL = 4.5;

/** "#aabbcc" from "#abc", " #AABBCC ", "aabbcc". Null when it is not a colour. */
export function normaliseHex(value: string): string | null {
  const raw = value.trim().replace(/^#/, "").toLowerCase();
  const expanded = raw.length === 3 ? raw.replace(/./g, (c) => c + c) : raw;
  return /^[0-9a-f]{6}$/.test(expanded) ? `#${expanded}` : null;
}

function channel(part: number): number {
  const c = part / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance, WCAG 2.x. */
export function luminance(hex: string): number {
  const normalised = normaliseHex(hex);
  if (!normalised) return 0;
  const r = parseInt(normalised.slice(1, 3), 16);
  const g = parseInt(normalised.slice(3, 5), 16);
  const b = parseInt(normalised.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * The text colour to put ON a brand colour.
 *
 * Chosen by measurement, not by a lightness threshold: the thresholds people
 * reach for ("is it lighter than 50%?") get yellows and cyans wrong, which are
 * exactly the colours a brand picks.
 */
export function onBrand(hex: string): string {
  return contrast(hex, BRAND_ON_DARK) >= contrast(hex, BRAND_INK) ? BRAND_ON_DARK : BRAND_INK;
}

/** A darker shade for hover, by multiplying each channel. */
export function darken(hex: string, amount = 0.12): string {
  const normalised = normaliseHex(hex);
  if (!normalised) return hex;
  const parts = [1, 3, 5].map((i) => {
    const v = parseInt(normalised.slice(i, i + 2), 16);
    return Math.max(0, Math.round(v * (1 - amount)));
  });
  return `#${parts.map((p) => p.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Whether a colour may be used, and why not when it may not.
 *
 * Refusing is kinder than rendering it: a host who picks #FFF9E6 and sees it
 * rejected with a reason tries again, where one whose page silently becomes
 * unreadable finds out from a guest, or never.
 */
export function validateBrandColor(value: string): { color: string } | { error: string } {
  const color = normaliseHex(value);
  if (!color) return { error: "That is not a colour. Use a hex value like #14554A." };

  if (contrast(color, PAGE) < MIN_FILL_AGAINST_PAGE) {
    return {
      error: "That colour is too pale to see against a white page. Pick a deeper shade of it.",
    };
  }

  /* The thin band where a filled button has no readable label — neither white
     nor ink clears 4.5:1 on it. Roughly #6E6E6E to #808080 and its neighbours
     in other hues. Refused with the way out, not just a no. */
  if (contrast(color, onBrand(color)) < MIN_LABEL) {
    return {
      error: "No text can be read on that colour — it sits midway between light and dark. Pick a deeper or a lighter shade.",
    };
  }

  return { color };
}

/**
 * Everything a branded page needs, derived from the one colour a host gave.
 *
 * Two accents on purpose. `accent` is the colour as chosen and goes behind
 * things; `accentText` is the same colour made readable and goes on top of
 * them. Collapsing the two is what makes a yellow brand's links invisible.
 */
export type BrandTokens = {
  /** Button and badge fills. The colour as the host chose it. */
  accent: string;
  accentHover: string;
  /** Measured, not assumed: white on a dark brand, ink on a light one. */
  onAccent: string;
  /** The same colour, darkened until it is readable as text on white. */
  accentText: string;
  /** A pale wash for quiet highlights. */
  soft: string;
  /** A border that belongs to the brand without shouting. */
  line: string;
};

export function brandTokens(color: string | null): BrandTokens | null {
  const normalised = color ? normaliseHex(color) : null;
  if (!normalised) return null;

  /* Built by blending toward white rather than by lowering opacity, so it does
     not change with whatever happens to be behind it. */
  const soft = blendToWhite(normalised, 0.88);

  return {
    accent: normalised,
    accentHover: darken(normalised),
    onAccent: onBrand(normalised),
    /* Measured against the SOFT tint rather than the page, because that is the
       darker of the two backgrounds this colour is set on. Checking it against
       white passes at 4.5 and then renders at 4.1 on the tint — which is how
       the first version of this shipped a highlight that failed AA. */
    accentText: readableOn(normalised, soft),
    soft,
    line: blendToWhite(normalised, 0.62),
  };
}

/**
 * The colour, darkened just enough to be read as text on `background`.
 *
 * Steps rather than a solved equation because luminance is not linear in the
 * channel values and the loop ends in a handful of passes. A pure yellow needs
 * a lot of them; the product's own green needs none.
 */
export function readableOn(hex: string, background: string = PAGE): string {
  let current = normaliseHex(hex) ?? BRAND_INK;
  for (let i = 0; i < 40 && contrast(current, background) < MIN_TEXT; i++) {
    const next = darken(current, 0.12);
    if (next === current) break;
    current = next;
  }
  /* A colour that cannot be darkened into legibility is black, and black is
     legible. Reached only by something already near it. */
  return contrast(current, background) >= MIN_TEXT ? current : BRAND_INK;
}

function blendToWhite(hex: string, amount: number): string {
  const normalised = normaliseHex(hex);
  if (!normalised) return hex;
  const parts = [1, 3, 5].map((i) => {
    const v = parseInt(normalised.slice(i, i + 2), 16);
    return Math.round(v + (255 - v) * amount);
  });
  return `#${parts.map((p) => p.toString(16).padStart(2, "0")).join("")}`;
}
