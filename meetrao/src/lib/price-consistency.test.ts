import { readFileSync, globSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BUSINESS_MONTHLY,
  BUSINESS_PRICES,
  BUSINESS_YEARLY,
  PRO_MONTHLY,
  PRO_PRICES,
  PRO_YEARLY,
  savingFor,
  yearlySaving,
} from "@/lib/pricing";
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

/* Every plan the site sells, so an assertion written once covers the next one
   as well. A tier added to PRICES and forgotten here is a tier whose Polar
   amount nobody is checking. */
const PLANS = [
  { tier: "pro" as const, prices: PRO_PRICES, yearly: PRO_YEARLY, monthly: PRO_MONTHLY },
  { tier: "business" as const, prices: BUSINESS_PRICES, yearly: BUSINESS_YEARLY, monthly: BUSINESS_MONTHLY },
];

describe("the price is one number", () => {
  it("covers every tier Polar sells", () => {
    // Guards the guard: a tier missing from PLANS passes everything below.
    expect(PLANS.map((p) => p.tier).sort()).toEqual(Object.keys(PRICES).sort());
  });

  it.each(PLANS)("$tier sentences match the figures", ({ prices, yearly, monthly }) => {
    expect(yearly).toBe(`$${prices.yearly.amount} a year`);
    expect(monthly).toBe(`$${prices.monthly.amount} a month`);
  });

  it.each(PLANS)("Polar charges what the site advertises for $tier", ({ tier, prices }) => {
    // Polar works in cents; the site works in dollars. A mismatch here bills
    // somebody a different number from the one they agreed to.
    expect(PRICES[tier].yearly.amount).toBe(prices.yearly.amount * 100);
    expect(PRICES[tier].monthly.amount).toBe(prices.monthly.amount * 100);
  });

  it.each(PLANS)("$tier yearly is cheaper per month, or the toggle is a lie", ({ prices }) => {
    expect(prices.yearly.amount).toBeLessThan(prices.monthly.amount * 12);
    expect(savingFor(prices).dollars).toBeGreaterThan(0);
    expect(savingFor(prices).percent).toBeGreaterThan(0);
  });

  it("Business costs more than Pro, in both cadences", () => {
    expect(BUSINESS_PRICES.monthly.amount).toBeGreaterThan(PRO_PRICES.monthly.amount);
    expect(BUSINESS_PRICES.yearly.amount).toBeGreaterThan(PRO_PRICES.yearly.amount);
  });

  it("yearlySaving still speaks for Pro", () => {
    expect(yearlySaving()).toEqual(savingFor(PRO_PRICES));
  });

  /* Any price the site genuinely sells is allowed to appear; anything else is
     a figure somebody typed and will not come back to update. With one plan
     this could compare against a single number. With two it cannot, and the
     cost of widening it is that $9 passes in a file about Pro. The tier-level
     assertions above are what hold each number to its own plan. */
  const yearlyPrices: number[] = PLANS.map((p) => p.prices.yearly.amount);
  const monthlyPrices: number[] = PLANS.map((p) => p.prices.monthly.amount);

  it.each(files)("%s names no yearly price we do not sell", (file) => {
    const text = readFileSync(path.join(ROOT, file), "utf8");

    // "$12 a year", "$12 / year", "$12/yr" and so on.
    const found = [...text.matchAll(/\$(\d+)\s*(?:a year|\/\s*year|\/yr|per year)/g)].map((m) => Number(m[1]));
    const wrong = found.filter((n) => !yearlyPrices.includes(n));
    expect(wrong, `${file} quotes $${wrong.join(", $")} a year; we sell $${yearlyPrices.join(", $")}`).toEqual([]);
  });

  it.each(files)("%s names no monthly price we do not sell", (file) => {
    const text = readFileSync(path.join(ROOT, file), "utf8");
    const found = [...text.matchAll(/\$(\d+)\s*(?:a month|\/\s*month|\/mo|per month)/g)].map((m) => Number(m[1]));
    const wrong = found.filter((n) => !monthlyPrices.includes(n));
    expect(wrong, `${file} quotes $${wrong.join(", $")} a month; we sell $${monthlyPrices.join(", $")}`).toEqual([]);
  });
});

describe("the saving is worked out, not typed", () => {
  it("no file hard-codes the discount percentage", () => {
    /* $36 against $30 is 17% today. Write that down and it is wrong the next
       time either number moves, which is exactly what happened once already.

       `savingFor(prices)` rather than `yearlySaving()`: the component renders
       either plan now, and computing Pro's saving on Business's card would be
       a worse bug than a hard-coded one, because it would look right. */
    const price = readFileSync(path.join(ROOT, "src/components/marketing/plan-price.tsx"), "utf8");
    expect(price).toContain("savingFor(prices)");
    expect(price, "the percentage is written out").not.toMatch(/save \d+%/);
  });
});
