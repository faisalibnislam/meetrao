import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   Touch targets, and the two rules that make them work.

   A measured pass over the product at 320/360/390/430 found 360 controls under
   44px. The whole design is drawn at 28–36px, which is right for a mouse and
   wrong for a thumb. Globals.css fixes that under `pointer: coarse`. This test
   guards the three things about that block that are easy to break silently:

   1. It is keyed on the POINTER, not a width breakpoint. A width query would
      give a narrow desktop window fat controls and leave a 1024px tablet with
      mouse-sized ones, exactly backwards.

   2. The slider override comes AFTER the base `.mr-range` rule. Same
      specificity, so source order decides; the first version of this sat above
      it and did nothing at all.

   3. Width is NOT raised globally. The booking calendar is seven cells across a
      320px screen; a 44px floor on width would push the grid off the edge and
      break the layout this is meant to protect.

   Grid tracks are checked too: `minmax(360px, 1fr)` is a floor a track cannot
   go below, so on a 320px screen it overflowed the viewport and the FAQ became
   unreachable. `minmax(min(360px, 100%), 1fr)` is the shape that keeps the
   multi-column intent without the floor.
   ───────────────────────────────────────────────────────────────────────────── */

const SRC = path.join(process.cwd(), "src");
const css = readFileSync(path.join(SRC, "app/globals.css"), "utf8");

describe("touch targets", () => {
  it("raises control heights on coarse pointers, not on narrow screens", () => {
    expect(css).toMatch(/@media \(pointer: coarse\)/);
    const block = css.slice(css.indexOf("@media (pointer: coarse)"));
    expect(block).toMatch(/min-height:\s*44px/);
  });

  it("does not put a 44px floor on width globally", () => {
    // Only the opt-in .tap-square may set it: seven date cells across 320px
    // cannot each be 44 wide.
    const widths = [...css.matchAll(/([^{}]*)\{[^}]*min-width:\s*44px/g)].map((m) => m[1].trim());
    for (const sel of widths) expect(sel, `min-width:44px on "${sel}"`).toContain("tap-square");
  });

  it("puts the slider override after the rule it overrides", () => {
    // Same specificity: whichever is written last wins.
    const base = css.indexOf(".mr-range {");
    const coarse = css.lastIndexOf(".mr-range {");
    expect(base).toBeGreaterThan(-1);
    expect(coarse, "the coarse .mr-range must come second").toBeGreaterThan(base);
    expect(css.slice(coarse - 400, coarse)).toContain("pointer: coarse");
  });

  it("keeps the switch's own paint and gives it a pseudo hit area", () => {
    const block = css.slice(css.indexOf("@media (pointer: coarse)"));
    expect(block).toMatch(/\[role="switch"\]::after/);
    // It must be excluded from the min-height sweep, or the pill inflates.
    expect(block).toMatch(/button:not\(\[role="switch"\]\)/);
  });
});

describe("grid tracks", () => {
  it("has no fixed track minimum wider than a 320px screen's content box", () => {
    // 320px less the widest gutter the layouts use (26px a side) leaves 268;
    // anything at or above that must be wrapped in min(…, 100%).
    const files = ["components/marketing/faq.tsx", "app/(marketing)/page.tsx",
                   "app/help/page.tsx", "components/marketing/hero.tsx"];
    const bad: string[] = [];
    for (const f of files) {
      const text = readFileSync(path.join(SRC, f), "utf8");
      for (const m of text.matchAll(/minmax\((\d+)px\s*,\s*1fr\)/g)) {
        if (Number(m[1]) >= 268) bad.push(`${f}: ${m[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
