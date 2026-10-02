import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   The use-cases marquee, and the three things about it that fail quietly.

   This band replaced a carousel. The carousel had an index in component state,
   six dots, two arrows and a hover transform; the replacement has a CSS
   animation over a static list and no client state at all. Everything below
   guards a property that looks fine on screen when it is broken:

   1. The track translates -50% BECAUSE it holds the six items twice. Change
      either number alone and the marquee still animates, it just jumps.
   2. The duplicate must stay aria-hidden, or a screen reader reads the six
      words twice and the second pass is a rendering trick, not content.
   3. A 26-second infinite translate is the only continuous motion on the page.
      It stops under prefers-reduced-motion through the GLOBAL rule in
      globals.css, not a rule of its own, so this checks the global one still
      covers it. Narrow that rule and the marquee keeps running for exactly the
      people who asked it not to, with nothing else failing.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

const COMPONENT = readFileSync(path.join(SRC, "components/marketing/use-cases.tsx"), "utf8");
const CSS = readFileSync(path.join(SRC, "app/globals.css"), "utf8");
const PAGE = readFileSync(path.join(SRC, "app/(marketing)/page.tsx"), "utf8");

/** Comments describe the decision; only code is the decision. */
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const CASES = ["freelancers", "consultants", "agencies", "sales-teams", "coaches", "remote-teams"];

describe("the marquee has no client state", () => {
  it("reads the component at all", () => {
    expect(COMPONENT.length).toBeGreaterThan(500);
    expect(COMPONENT).toContain("marquee-track");
  });

  /* The whole point of the replacement. A "use client" here would ship this
     section's JavaScript to every visitor for an animation CSS already does. */
  it.each(['"use client"', "useState", "useRef", "useEffect", "onClick"])(
    "does not use %s",
    (banned) => {
      expect(code(COMPONENT)).not.toContain(banned);
    },
  );

  it("takes no props from the page", () => {
    // The carousel was fed a photo map read off disk at build time. The
    // filenames are the wiring now.
    expect(code(PAGE)).toMatch(/<UseCases\s*\/>/);
    expect(code(PAGE)).not.toContain("useCasePhotos");
  });

  it("left nothing of the photo registry behind", () => {
    expect(existsSync(path.join(SRC, "lib/use-case-photos.ts"))).toBe(false);
  });
});

describe("the loop", () => {
  /* -50% and "twice" are one decision written in two files. */
  it("translates by exactly half the track", () => {
    expect(CSS).toMatch(/@keyframes mrc-marquee[\s\S]{0,200}translateX\(-50%\)/);
  });

  it("renders the six items twice, and only the second is hidden", () => {
    const runs = code(COMPONENT).match(/<MarqueeRun\b[^/]*\/>/g) ?? [];
    expect(runs, "the track no longer holds two runs").toHaveLength(2);
    expect(runs.filter((r) => r.includes("duplicate"))).toHaveLength(1);
    expect(code(COMPONENT)).toMatch(/aria-hidden=\{duplicate/);
  });

  it("maps one array rather than listing twelve items", () => {
    const list = code(COMPONENT).match(/const CASES[\s\S]*?\];/)?.[0] ?? "";
    for (const id of CASES) expect(list, `${id} is missing`).toContain(`"${id}"`);
    // Twelve records would mean each id appears twice in the source.
    for (const id of CASES) {
      const times = code(COMPONENT).split(`"${id}"`).length - 1;
      expect(times, `${id} is written out more than once`).toBe(1);
    }
  });

  it("has a photograph on disk for every case", () => {
    for (const id of CASES) {
      const file = path.join(ROOT, "public", "use-cases", `uc-${id}.webp`);
      expect(existsSync(file), `public/use-cases/uc-${id}.webp is missing`).toBe(true);
    }
  });
});

describe("reduced motion", () => {
  /* The band deliberately carries no guard of its own. That is only safe while
     the global one still stops infinite animations, so the global one is what
     gets asserted. */
  it("is covered by the global rule in globals.css", () => {
    const at = CSS.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(at, "the global reduced-motion block is gone").toBeGreaterThan(-1);

    const global = CSS.slice(CSS.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(global, "the global block no longer targets every element").toMatch(/\*,/);
    expect(global).toMatch(/animation-duration:\s*0\.001ms\s*!important/);
    expect(global).toMatch(/animation-iteration-count:\s*1\s*!important/);
  });

  it("keeps the marquee infinite when motion is allowed", () => {
    // If this ever stops being infinite, the guard above stops mattering and
    // the comment in the component becomes a lie.
    expect(CSS).toMatch(/\.marquee-track[\s\S]{0,200}animation:\s*mrc-marquee 26s linear infinite/);
  });
});

describe("the carousel is gone", () => {
  it.each(["ArrowButton", "Previous use case", "Next use case", "aria-current", "setIndex"])(
    "has no %s",
    (leftover) => {
      expect(COMPONENT).not.toContain(leftover);
    },
  );

  it("drops the right-aligned kicker the band absorbed", () => {
    // Its copy moved into the three-up notes; the old two-line block beside the
    // heading would now say the same thing twice.
    expect(code(PAGE)).not.toContain("One link, your real availability,");
    expect(code(COMPONENT)).toContain("One link");
  });
});
