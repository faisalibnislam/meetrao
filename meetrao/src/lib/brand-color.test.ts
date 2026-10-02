import { describe, expect, it } from "vitest";
import {
  BRAND_INK,
  BRAND_ON_DARK,
  brandTokens,
  contrast,
  darken,
  luminance,
  normaliseHex,
  onBrand,
  readableOn,
  readableOnGround,
  validateBrandColor,
} from "@/convex/lib/brand";

/* The host picks the colour and the guest has to read the page. These are the
   cases that produced an unreadable page when the rules were a guess. */

describe("normaliseHex", () => {
  it("accepts the forms a person actually types", () => {
    expect(normaliseHex("#14554A")).toBe("#14554a");
    expect(normaliseHex("14554a")).toBe("#14554a");
    expect(normaliseHex("  #14554A  ")).toBe("#14554a");
    expect(normaliseHex("#abc")).toBe("#aabbcc");
  });

  it("refuses what is not a colour", () => {
    for (const bad of ["", "#", "red", "#12345", "#1234567", "#gggggg", "rgb(1,2,3)"]) {
      expect(normaliseHex(bad)).toBeNull();
    }
  });
});

describe("contrast", () => {
  it("matches the WCAG reference values", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 1);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // The product's own accent on white, which the design is built around.
    expect(contrast("#14554a", "#ffffff")).toBeGreaterThan(7);
  });

  it("does not care which way round the pair is given", () => {
    expect(contrast("#14554a", "#ffffff")).toBeCloseTo(contrast("#ffffff", "#14554a"), 10);
  });
});

describe("onBrand", () => {
  it("puts white on dark colours and ink on light ones", () => {
    expect(onBrand("#14554a")).toBe(BRAND_ON_DARK);
    expect(onBrand("#000000")).toBe(BRAND_ON_DARK);
    expect(onBrand("#ffd400")).toBe(BRAND_INK);
    expect(onBrand("#f5f5f5")).toBe(BRAND_INK);
  });

  it("always picks the more readable of the two", () => {
    // The property, rather than a list of colours: whatever it returns must be
    // the better choice. A lightness threshold fails this on yellow and cyan.
    for (const color of ["#ffd400", "#00ffff", "#7f7f7f", "#808080", "#14554a", "#ff6600", "#123456"]) {
      const chosen = onBrand(color);
      const other = chosen === BRAND_ON_DARK ? BRAND_INK : BRAND_ON_DARK;
      expect(contrast(color, chosen)).toBeGreaterThanOrEqual(contrast(color, other));
    }
  });

  it("gives readable text on every colour it accepts", () => {
    // Accepting a colour is a promise that the button filled with it can be read.
    for (const color of ["#ffd400", "#00ffff", "#ff6600", "#14554a", "#003366"]) {
      const result = validateBrandColor(color);
      expect(result).toHaveProperty("color");
      const { color: ok } = result as { color: string };
      expect(contrast(ok, onBrand(ok))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("readableOn", () => {
  it("leaves a colour that is already readable alone", () => {
    expect(readableOn("#14554a")).toBe("#14554a");
  });

  it("darkens the ones that are not, including the hard cases", () => {
    // Yellow is the case that proves it: as a fill it is fine, as text on
    // white it is invisible, and 1.43:1 has to become 4.5:1.
    for (const color of ["#ffd400", "#00ffff", "#ff6600", "#7a7a7a", "#90ee90"]) {
      const text = readableOn(color);
      expect(normaliseHex(text)).toBe(text);
      expect(contrast(text, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("terminates on black and on white", () => {
    expect(contrast(readableOn("#000000"), "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(readableOn("#ffffff"), "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("validateBrandColor", () => {
  it("accepts a colour that can be seen on a white page", () => {
    expect(validateBrandColor("#14554a")).toEqual({ color: "#14554a" });
    expect(validateBrandColor("ff6600")).toEqual({ color: "#ff6600" });
  });

  it("accepts the vivid colours a flat 3:1 rule used to refuse", () => {
    // Orange is 2.94:1 on white and yellow is 1.43:1. Both are somebody's
    // brand, and both make a readable button when the label is chosen to suit.
    for (const vivid of ["#ff6600", "#ffd400", "#00ffff", "#ff0099"]) {
      expect(validateBrandColor(vivid)).toEqual({ color: vivid });
    }
  });

  it("refuses the pale colours people pick out of a logo", () => {
    // Each of these renders a button that is not visibly a button.
    for (const pale of ["#fff9e6", "#eaf6ff", "#f0fff0", "#ffffff", "#fffbcc"]) {
      const result = validateBrandColor(pale);
      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toMatch(/pale/i);
    }
  });

  it("refuses the mid-tones that no label can be read on", () => {
    // 4.23:1 against white and 4.15:1 against ink. There is no third option.
    const result = validateBrandColor("#7a7a7a");
    expect((result as { error: string }).error).toMatch(/midway/i);
  });

  it("explains itself rather than just failing", () => {
    const result = validateBrandColor("not a colour");
    expect((result as { error: string }).error).toMatch(/hex/i);
  });
});

describe("darken", () => {
  it("returns a darker colour of the same hue", () => {
    const hover = darken("#14554a");
    expect(normaliseHex(hover)).toBe(hover);
    expect(contrast(hover, "#ffffff")).toBeGreaterThan(contrast("#14554a", "#ffffff"));
  });

  it("stays a colour at the extremes", () => {
    expect(darken("#000000")).toBe("#000000");
    expect(normaliseHex(darken("#ffffff"))).not.toBeNull();
  });
});

describe("brandTokens", () => {
  it("is null when there is no colour, so callers fall back to the product's", () => {
    expect(brandTokens(null)).toBeNull();
    expect(brandTokens("")).toBeNull();
    expect(brandTokens("nonsense")).toBeNull();
  });

  it("derives a full set from one colour", () => {
    const tokens = brandTokens("#14554a");
    expect(tokens).not.toBeNull();
    expect(tokens!.accent).toBe("#14554a");
    expect(tokens!.onAccent).toBe("#ffffff");
    // The soft tint is a pale version, for a highlight behind small text.
    expect(contrast(tokens!.soft, "#ffffff")).toBeLessThan(1.5);
  });

  it("keeps brand text readable on white and on its own tint, every colour", () => {
    // The invariant the whole feature rests on: whatever the host picked, a
    // guest can read the page. Yellow and cyan are in here because they are
    // what break a naive implementation.
    for (const color of ["#ff6600", "#ffd400", "#00ffff", "#003366", "#8b0000", "#90ee90", "#14554a"]) {
      const result = validateBrandColor(color);
      expect(result).toHaveProperty("color");
      const tokens = brandTokens((result as { color: string }).color)!;

      expect(contrast(tokens.accentText, "#ffffff")).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens.accentText, tokens.soft)).toBeGreaterThanOrEqual(4.5);
      // Text on a filled button, which is the other place the colour appears.
      expect(contrast(tokens.accent, tokens.onAccent)).toBeGreaterThanOrEqual(4.5);
      // And the brand's border is visible against the page it is drawn on.
      expect(contrast(tokens.line, "#ffffff")).toBeGreaterThan(1.1);
    }
  });
});


/* ─────────────────────────────────────────────────────────────────────────────
   The second colour: the page background.

   Its whole job is to stop a branded page from sitting on Meetrao's warm grey,
   so what is checked here is that nothing of ours survives and that the few
   pieces of text drawn directly on it stay readable, including on the dark
   backgrounds that break a naive implementation.
   ───────────────────────────────────────────────────────────────────────────── */

const MEETRAO = {
  ground: "#e7e4dc",
  fill: "#f4f3ee",
  fill2: "#eae8e1",
  line: "#e0ddd4",
  lineSoft: "#edebe4",
  lineStrong: "#cfcbc0",
  accent: "#14554a",
};

describe("readableOnGround", () => {
  it("darkens a light ground, keeping its hue", () => {
    for (const ground of ["#eaf2ff", "#fff6e5", "#e7e4dc", "#ffffff"]) {
      const text = readableOnGround(ground);
      expect(normaliseHex(text)).toBe(text);
      expect(contrast(text, ground), ground).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("LIGHTENS a dark ground, which darkening can never solve", () => {
    /* The case the first version got wrong: it only ever darkened, so a navy
       ground bottomed out at black and fell back to our ink, invisible. */
    for (const ground of ["#001a3d", "#0b0b0b", "#14554a", "#3b0a2a"]) {
      const text = readableOnGround(ground);
      expect(contrast(text, ground), ground).toBeGreaterThanOrEqual(4.5);
      expect(luminance(text), `${ground} should get LIGHT text`).toBeGreaterThan(luminance(ground));
    }
  });

  it("is readable on a mid-tone, where neither direction reaches the bar", () => {
    for (const ground of ["#7a7a7a", "#808080", "#6e6e6e"]) {
      const text = readableOnGround(ground);
      // Not 4.5 (no colour achieves that here) but the better of the two.
      expect(contrast(text, ground)).toBeGreaterThan(3.5);
    }
  });
});

describe("a branded page keeps none of Meetrao's palette", () => {
  it("replaces the whole neutral ramp when only an accent is given", () => {
    // One colour has to be enough: a host who sets blue and nothing else must
    // not be left with our warm grey around their card.
    const t = brandTokens("#003e88")!;
    expect(t.ground).not.toBe(MEETRAO.ground);
    expect(t.fill).not.toBe(MEETRAO.fill);
    expect(t.fill2).not.toBe(MEETRAO.fill2);
    expect(t.borderBase).not.toBe(MEETRAO.line);
    expect(t.borderSoft).not.toBe(MEETRAO.lineSoft);
    expect(t.borderStrong).not.toBe(MEETRAO.lineStrong);
    expect(t.accent).not.toBe(MEETRAO.accent);
  });

  it("uses the chosen background when there is one", () => {
    const t = brandTokens("#003e88", "#f2f6ff")!;
    expect(t.ground).toBe("#f2f6ff");
  });

  it("works from a background alone, without falling back to our green", () => {
    const t = brandTokens(null, "#f2f6ff")!;
    expect(t).not.toBeNull();
    expect(t.accent).not.toBe(MEETRAO.accent);
    expect(t.ground).toBe("#f2f6ff");
  });

  it("is null only when the host has chosen nothing at all", () => {
    expect(brandTokens(null, null)).toBeNull();
    expect(brandTokens("", "")).toBeNull();
  });
});

describe("the card and its borders survive any background", () => {
  const grounds = ["#f2f6ff", "#001a3d", "#ffffff", "#0b0b0b", "#fff6e5", "#14554a", "#7a7a7a"];

  it.each(grounds)("%s keeps the card white, so the contrast maths still holds", (ground) => {
    expect(brandTokens("#003e88", ground)!.surface).toBe("#ffffff");
  });

  it.each(grounds)("%s gives borders that read on the card without shouting", (ground) => {
    const t = brandTokens("#003e88", ground)!;
    for (const [name, border] of [
      ["borderSoft", t.borderSoft],
      ["borderBase", t.borderBase],
      ["borderStrong", t.borderStrong],
    ] as const) {
      const c = contrast(border, "#ffffff");
      expect(c, `${name} on ${ground} is invisible`).toBeGreaterThan(1.05);
      expect(c, `${name} on ${ground} is a near-black rule`).toBeLessThan(3);
    }
  });

  it.each(grounds)("%s keeps the card's own text readable on the quiet panel", (ground) => {
    /* THE BUG THIS CAUGHT, on screen rather than in a test: the panel was
       mixed from the ground, so a dark background turned the booking card's
       left half into a mid-slate block with near-black `--ink` text on it.
       The panel lives inside the white card and carries that ink, so it has
       to stay light whatever the page behind the card is doing. */
    const t = brandTokens("#003e88", ground)!;
    expect(contrast(BRAND_INK, t.fill), `ink on fill (${ground})`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(BRAND_INK, t.fill2), `ink on fill2 (${ground})`).toBeGreaterThanOrEqual(4.5);
  });

  it.each(grounds)("%s keeps the quiet panel distinguishable from the card", (ground) => {
    const t = brandTokens("#003e88", ground)!;
    // Visible as a panel, but never so strong it reads as a second card.
    const c = contrast(t.fill, t.surface);
    expect(c, `fill on surface (${ground})`).toBeGreaterThan(1.02);
    expect(c, `fill on surface (${ground})`).toBeLessThan(1.35);
  });

  it.each(grounds)("%s keeps text on the ground readable", (ground) => {
    const t = brandTokens("#003e88", ground)!;
    expect(contrast(t.onGround, t.ground)).toBeGreaterThan(3.5);
  });
});
