import { describe, expect, it } from "vitest";
import {
  BRAND_INK,
  BRAND_ON_DARK,
  brandTokens,
  contrast,
  darken,
  normaliseHex,
  onBrand,
  readableOn,
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

  it("keeps brand text readable on white and on its own tint — every colour", () => {
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
