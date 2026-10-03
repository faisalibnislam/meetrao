import { readFileSync, globSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PRO_MONTHLY, PRO_PRICES, PRO_YEARLY, yearlySaving } from "@/lib/pricing";
import { PRICES } from "@/lib/polar";

/* ─────────────────────────────────────────────────────────────────────────────
   One price, named the same everywhere.

   WHY THIS EXISTS. Moving the yearly price from $10 to $30 meant editing
   eighteen separate places: the terms, the landing headline, three SEO strings,
   four in-app upsells, the auth card, the hero strip, the onboarding note, two
   FAQ answers, two comparison pages and the admin console. Every one of them
   had the figure typed out. Missing one would have published two prices at
   once, and the one a reader believes is whichever they happen to read.

   So: whatever the figure is, nothing user-facing may name a DIFFERENT one.
   The competitor pages are exempt, because the prices there are not ours.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();

/* comparisons.* quote Calendly's and Cal.com's prices, which are theirs to
   set; authCrypto names a bcrypt prefix that looks like money and is not. */
const EXEMPT = ["comparisons.ts", "comparisons.test.ts", "authCrypto.ts", "price-consistency.test.ts"];

const files = [
  ...globSync("src/**/*.{ts,tsx}", { cwd: ROOT }),
  ...globSync("convex/**/*.ts", { cwd: ROOT }),
].filter((f) => !EXEMPT.some((e) => f.replaceAll("\\", "/").endsWith(e)) && !f.includes("_generated"));

describe("the price is one number", () => {
  it("the sentences match the figures", () => {
    expect(PRO_YEARLY).toBe(`$${PRO_PRICES.yearly.amount} a year`);
    expect(PRO_MONTHLY).toBe(`$${PRO_PRICES.monthly.amount} a month`);
  });

  it("Polar charges what the site advertises", () => {
    // Polar works in cents; the site works in dollars. A mismatch here bills
    // somebody a different number from the one they agreed to.
    expect(PRICES.yearly.amount).toBe(PRO_PRICES.yearly.amount * 100);
    expect(PRICES.monthly.amount).toBe(PRO_PRICES.monthly.amount * 100);
  });

  it("yearly is cheaper per month than monthly, or the toggle is a lie", () => {
    expect(PRO_PRICES.yearly.amount).toBeLessThan(PRO_PRICES.monthly.amount * 12);
    expect(yearlySaving().dollars).toBeGreaterThan(0);
    expect(yearlySaving().percent).toBeGreaterThan(0);
  });

  it.each(files)("%s names no other yearly price", (file) => {
    const text = readFileSync(path.join(ROOT, file), "utf8");
    const ours = PRO_PRICES.yearly.amount;

    // "$12 a year", "$12 / year", "$12/yr" and so on.
    const found = [...text.matchAll(/\$(\d+)\s*(?:a year|\/\s*year|\/yr|per year)/g)].map((m) => Number(m[1]));
    const wrong = found.filter((n) => n !== ours);
    expect(wrong, `${file} quotes $${wrong.join(", $")} a year; ours is $${ours}`).toEqual([]);
  });

  it.each(files)("%s names no other monthly price", (file) => {
    const text = readFileSync(path.join(ROOT, file), "utf8");
    const ours = PRO_PRICES.monthly.amount;
    const found = [...text.matchAll(/\$(\d+)\s*(?:a month|\/\s*month|\/mo|per month)/g)].map((m) => Number(m[1]));
    const wrong = found.filter((n) => n !== ours);
    expect(wrong, `${file} quotes $${wrong.join(", $")} a month; ours is $${ours}`).toEqual([]);
  });
});

describe("the saving is worked out, not typed", () => {
  it("no file hard-codes the discount percentage", () => {
    /* $36 against $30 is 17% today. Write that down and it is wrong the next
       time either number moves, which is exactly what just happened. */
    const price = readFileSync(path.join(ROOT, "src/components/marketing/plan-price.tsx"), "utf8");
    expect(price).toContain("yearlySaving()");
    expect(price, "the percentage is written out").not.toMatch(/save \d+%/);
  });
});
