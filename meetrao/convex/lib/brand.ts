/* ─────────────────────────────────────────────────────────────────────────────
   A host's own logo and colour.

   Pure, and in convex/ rather than src/ because the mutation that stores a
   colour has to validate it and a Convex function cannot import from src/.
   The app imports it back the other way, through the "@/convex" alias, so
   there is one implementation rather than two that drift.

   THE RULE THAT MATTERS IS CONTRAST, AND THE OBVIOUS RULE IS WRONG.

   The first version refused any colour under 3:1 against a white page, on the
   grounds that WCAG asks that of a UI component. That rejected plain orange
   (2.94:1) and yellow (1.43:1). Both of which are somebody's actual brand,
   and both of which make a perfectly readable button when it is FILLED with
   them and the text on top is chosen to suit. The 3:1 rule is about telling a
   component apart from its background, not about a solid button whose own
   label carries the contrast.

   So the choice is not restricted where it does not need to be. Instead:

   · as a FILL, any colour is allowed that is distinguishable from the page at
     all, and the text on it is picked by measurement, white or ink;
   · as TEXT, the colour is darkened until it clears 4.5:1 on white, because a
     host who picks yellow still needs their links to be readable.

   A HOST PICKS TWO COLOURS: the accent and the page background. The second
   exists because the first was not enough, a booking page with a blue brand
   still sat on Meetrao's warm grey, in Meetrao's cream panel, which read as
   our page wearing somebody's logo. So the whole neutral ramp is derived here
   too, and a branded page keeps none of our palette.

   The background is only ever a BACKGROUND. The card stays white whatever is
   chosen, because every contrast figure below is computed against white and
   because a card is what the booking form is read on. What the background does
   change is the ground behind that card, the quiet panel inside it, the
   borders, and the colour of the few pieces of text that sit directly on the
   ground, which is the part that makes a dark background safe rather than
   unreadable.

   Two things are still refused, and only two:

   · the near-white, #FFF9E6, #EAF6FF, a sand or a mint taken straight out of
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

  /* The thin band where a filled button has no readable label, neither white
     nor ink clears 4.5:1 on it. Roughly #6E6E6E to #808080 and its neighbours
     in other hues. Refused with the way out, not just a no. */
  if (contrast(color, onBrand(color)) < MIN_LABEL) {
    return {
      error: "No text can be read on that colour: it sits midway between light and dark. Pick a deeper or a lighter shade.",
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

  /* ── The page around the card, derived from the background colour ──────── */

  /** The page itself, behind everything. */
  ground: string;
  /**
   * Text that sits directly ON the ground, the footer's legal links and the
   * "Booking page" eyebrow. Derived, not fixed, because a host may choose a
   * background darker than our ink, and `--ink-3` would then be invisible.
   */
  onGround: string;
  /** The card. White, always, see the note at the top of this file. */
  surface: string;
  /** The quiet panel inside the card, a step from the card toward the ground. */
  fill: string;
  fill2: string;
  /* The NEUTRAL borders, hue-matched to the ground. Distinct from `line`
     above, which is the brand's own border. Two different jobs that were one
     word for an uncomfortable minute. */
  borderBase: string;
  borderSoft: string;
  borderStrong: string;
};

export function brandTokens(
  color: string | null,
  /**
   * The page background. Null means "derive one from the accent" rather than
   * "use Meetrao's". a host who picks one colour should not be left with our
   * warm grey around their blue card. Only a host who sets no colour at all
   * keeps our palette, and then this function returns null and nothing is
   * overridden.
   */
  background: string | null = null,
): BrandTokens | null {
  const normalised = color ? normaliseHex(color) : null;
  const bg = background ? normaliseHex(background) : null;
  if (!normalised && !bg) return null;

  /* An accent is needed for the accent half. With a background and no accent,
     the background's own readable shade stands in, so the two halves agree
     rather than leaving our green on somebody else's page. */
  const accent = normalised ?? readableOn(bg!, PAGE);

  /* Built by blending toward white rather than by lowering opacity, so it does
     not change with whatever happens to be behind it. */
  const soft = blendToWhite(accent, 0.88);

  /* The ground: the host's choice, or a pale wash of their accent. 0.86 rather
     than `soft`'s 0.88 so the card still separates from the page behind it. */
  const ground = bg ?? blendToWhite(accent, 0.86);

  return {
    accent,
    accentHover: darken(accent),
    onAccent: onBrand(accent),
    /* Measured against the SOFT tint rather than the page, because that is the
       darker of the two backgrounds this colour is set on. Checking it against
       white passes at 4.5 and then renders at 4.1 on the tint, which is how
       the first version of this shipped a highlight that failed AA. */
    accentText: readableOn(accent, soft),
    soft,
    line: blendToWhite(accent, 0.62),

    ground,
    onGround: readableOnGround(ground),
    /* NOT derived. Every contrast figure above is computed against white, and
       the booking form is read on this. A tinted card would quietly invalidate
       all of it. */
    surface: PAGE,
    /* The quiet panel and its stronger sibling. PINNED TO A LIGHT WEIGHT, not
       mixed from the ground: these sit INSIDE the white card and carry `--ink`
       text, so tracking the ground's lightness turned the booking card's left
       half into a mid-slate panel with near-black text on it the moment a host
       chose a dark background. They take the ground's hue and nothing else. */
    fill: tintFrom(ground, accent, 1.06),
    fill2: tintFrom(ground, accent, 1.14),
    /* Borders are drawn on the CARD, not on the ground, so they are pinned to
       a weight that works on white and merely take the ground's hue. Deriving
       them from the ground's lightness instead put a near-black rule around
       every input on a dark-backgrounded page. */
    borderBase: tintFrom(ground, accent, 1.25),
    borderSoft: tintFrom(ground, accent, 1.12),
    borderStrong: tintFrom(ground, accent, 1.5),
  };
}

/**
 * Text that can be read on the ground, keeping the ground's own hue.
 *
 * Darkening is tried first, because a tonal dark-on-light page is what most
 * brands want. A ground too dark to darken further. A navy, a near-black,
 * cannot reach 4.5:1 that way at all, and the first version of this returned
 * our ink for those, which is invisible on navy. So lightening is tried next,
 * and plain white or ink is the floor.
 */
export function readableOnGround(ground: string): string {
  const dark = readableOn(ground, ground);
  if (contrast(dark, ground) >= MIN_TEXT) return dark;

  let light = normaliseHex(ground) ?? PAGE;
  for (let i = 0; i < 40 && contrast(light, ground) < MIN_TEXT; i++) {
    const next = blendToWhite(light, 0.12);
    if (next === light) break;
    light = next;
  }
  if (contrast(light, ground) >= MIN_TEXT) return light;

  // A mid-tone ground, where neither direction reaches the bar. Take the
  // better of the two absolutes rather than returning something unreadable.
  return onBrand(ground);
}

/**
 * The ground's hue at a fixed weight, for everything drawn ON the white card.
 *
 * Panels and borders alike are read against the card, never against the page,
 * so what they must inherit from the background is its COLOUR and not its
 * lightness. `target` is the contrast each one should have with the card; the
 * design's own values measure 1.06 and 1.14 for the panels and 1.12, 1.25 and
 * 1.45 for the borders, so those are what is aimed at.
 *
 * BIDIRECTIONAL, because the ground can be on either side of the target. A
 * dark ground has to be lightened toward it; a white one has to be darkened,
 * and the first version only lightened, so a host who chose a white
 * background got white borders and a card with no edge at all.
 *
 * `hue` is the fallback to take colour from when the ground has none left to
 * give. Darkening white produces grey; darkening the accent instead keeps the
 * result part of the brand.
 */
function tintFrom(ground: string, hue: string, target: number): string {
  const start = normaliseHex(ground) ?? "#e0ddd4";

  // Within a whisker of white there is no hue to carry, so borrow the accent's.
  const seed = contrast(start, PAGE) < 1.02 ? blendToWhite(normaliseHex(hue) ?? start, 0.9) : start;

  let current = seed;
  if (contrast(current, PAGE) > target) {
    for (let i = 0; i < 60 && contrast(current, PAGE) > target; i++) {
      const next = blendToWhite(current, 0.1);
      if (next === current) break;
      current = next;
    }
  } else {
    for (let i = 0; i < 60 && contrast(current, PAGE) < target; i++) {
      const next = darken(current, 0.06);
      if (next === current) break;
      current = next;
    }
  }
  return current;
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
