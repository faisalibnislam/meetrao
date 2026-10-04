import { describe, expect, it } from "vitest";
import { globSync, readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   Nothing asks whether a plan EQUALS "pro".

   This exists because adding Business broke seven places at once, and none of
   them failed a test or a typecheck. Every one was a variation of:

       const pro = plan.plan === "pro";

   which was correct for exactly as long as there were two plans. With three,
   a Business customer reads as not-paid. Two of the seven were serious: a
   Business host's branding would have vanished from their own booking page,
   and `hostForDomain` would have stopped resolving their custom domain, so a
   paid domain would 404.

   The product will keep gaining tiers before it loses any, so the right
   question is almost never "is this plan Pro" but "does this plan pay", which
   is `isPro(profile)` or `isPaid(plan)`. Where something genuinely needs the
   top tier, `isBusiness` says so.

   TWO FILES ARE EXEMPT and both earn it: plan.ts is where the comparison is
   defined, and polar.ts matches a TIER (which product to sell), not a plan.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();

const EXEMPT = [
  "convex/lib/plan.ts",
  "src/lib/polar.ts",
  "src/lib/no-plan-equality.test.ts",
  // These assert the behaviour directly, so they name the strings on purpose.
  "src/lib/billing.test.ts",
  "src/lib/branding-invariants.test.ts",
];

const FILES = [...globSync("src/**/*.{ts,tsx}", { cwd: ROOT }), ...globSync("convex/**/*.ts", { cwd: ROOT })]
  .map((f) => f.replaceAll("\\", "/"))
  .filter((f) => !f.includes("_generated"))
  .filter((f) => !EXEMPT.includes(f));

/** `=== "pro"`, `!== "pro"`, and the same for the other two plan names. */
const EQUALITY = /[!=]==\s*["'](?:free|pro|business)["']|["'](?:free|pro|business)["']\s*[!=]==/;

describe("plan comparisons", () => {
  it("has files to check", () => {
    // Guards the guard: a glob that matched nothing would pass silently.
    expect(FILES.length).toBeGreaterThan(100);
    expect(FILES).toContain("convex/publicBooking.ts");
  });

  it.each(FILES)("%s compares plans through a predicate, not with ===", (file) => {
    const text = readFileSync(path.join(ROOT, file), "utf8");
    const offending = text
      .split("\n")
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => EQUALITY.test(line))
      /* A tier is not a plan. `tier === "business"` picks which product to
         sell or which slot to write, and has nothing to do with entitlement. */
      .filter(({ line }) => !/\btier\b/.test(line));

    expect(
      offending.map((o) => `${file}:${o.n}  ${o.line}`),
      "use isPro / isPaid / isBusiness instead",
    ).toEqual([]);
  });

  /* The two that would have cost a paying customer their product. Named
     explicitly, because a regex over every file is easy to weaken by adding
     an exemption, and these two are the ones worth failing loudly. */
  it("gates public branding on isPro, not on the plan's name", () => {
    const text = readFileSync(path.join(ROOT, "convex/publicBooking.ts"), "utf8");
    expect(text).toContain("if (!isPro(p)) return null;");
  });

  it("resolves a custom domain for every paid plan", () => {
    const text = readFileSync(path.join(ROOT, "convex/publicBooking.ts"), "utf8");
    const fn = text.slice(text.indexOf("export const hostForDomain"));
    expect(fn.slice(0, fn.indexOf("});"))).toContain("isPro(p)");
  });
});
