import { describe, expect, it } from "vitest";
import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import { DENIALS, INCLUDED, LIMITS, PRICING_FAQ, WHY } from "./pricing";

/* ─────────────────────────────────────────────────────────────────────────────
   The free claim, and the qualifier it must never be separated from.

   Terms §5 says Meetrao is free *while it is in beta* and that paid plans are
   intended later. Every "free" on the marketing side is therefore a claim about
   today, and the honest version of it needs three parts: free now, an existing
   account is never billed automatically, and you would be emailed and have to
   opt in first.

   The failure this guards is not a lie told on purpose. It is the sentence a
   future copy pass shortens — "free, forever" is two characters cheaper than
   the truth and reads better — and which then sits on the site contradicting
   the contract it links to. Nobody would notice until somebody did.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

/**
 * Everything a visitor can read, with comments stripped.
 *
 * The distinction matters more here than anywhere else in the codebase. Three
 * files explain at length why Meetrao does not say "free forever" — and the
 * first version of this test failed on all three, because a rule against a
 * phrase catches the note explaining the rule. A comment is documentation; a
 * string literal is a claim, and only the second is shipped to anybody.
 *
 * Same technique as contact-address.test.ts, for the same reason.
 */
const COPY = ["app", "components", "lib"]
  .flatMap((area) =>
    globSync(`${area}/**/*.{ts,tsx}`, { cwd: SRC })
      .filter((f) => !f.includes(".test."))
      .map((f) => ({
        file: f,
        text: readFileSync(path.join(SRC, f), "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/(^|[^:])\/\/.*$/gm, "$1"),
      })),
  );

describe("nothing promises what the Terms do not", () => {
  it("reads the source at all", () => {
    // Guards the guard: a moved directory passes every assertion below by
    // finding nothing to read.
    expect(COPY.length).toBeGreaterThan(60);
    expect(COPY.some((f) => f.file.includes("pricing"))).toBe(true);
  });

  /* "Free forever" is the one phrase that cannot be walked back. lib/faq.ts
     already refuses it in as many words — 'We cannot honestly promise
     "forever"' — and that refusal is worth nothing if another page says it. */
  it.each(["free forever", "forever free", "always be free", "always free", "free for life"])(
    "never says %s",
    (phrase) => {
      const said = COPY.filter((f) => {
        const text = f.text.toLowerCase();
        const at = text.indexOf(phrase);
        if (at < 0) return false;
        // The FAQ and the pricing page both quote the phrase in order to
        // refuse it. A refusal is not a promise.
        const around = text.slice(Math.max(0, at - 120), at + 120);
        return !/cannot|can't|will not|won't|not promise|nobody can/.test(around);
      }).map((f) => f.file);

      expect(said).toEqual([]);
    },
  );

  /* The claim and its qualifier travel together. A pricing page that says
     "free" six times and never links to the clause governing it is the shape
     of the problem, not an example of it. */
  it("sends the reader to the clause that governs the price", () => {
    /* The link lives in the comparison now, which both /pricing and the
       landing page render — so it is checked where it actually is rather
       than where it used to be. */
    const page = COPY.find((f) => f.file.endsWith("marketing/pricing-page.tsx"));
    const comparison = COPY.find((f) => f.file.endsWith("marketing/plan-comparison.tsx"));
    expect(page, "the pricing page is missing").toBeDefined();
    expect(comparison, "the plan comparison is missing").toBeDefined();
    expect(`${page!.text} ${comparison!.text}`).toContain("/terms#t-price");
  });

  it("has a §5 for that link to land on", () => {
    // A fragment pointing at nothing scrolls nowhere and nobody notices,
    // because the page still loads.
    const terms = readFileSync(path.join(SRC, "app", "(marketing)", "terms", "page.tsx"), "utf8");
    expect(terms).toContain('id="t-price"');
  });

  it("says the three things the Terms actually commit to", () => {
    const faq = PRICING_FAQ.map(([, q, a]) => `${q} ${a}`).join(" ").toLowerCase();
    expect(faq, "no mention of opting in").toMatch(/opt in/);
    expect(faq, "no mention of being told first").toMatch(/email/);
    expect(faq, "no mention of never billing automatically").toMatch(/never billed automatically/);
  });
});

describe("the pricing page argues in the right order", () => {
  /* The limits are the reason the rest is believable. Rendering them after the
     call to action turns the page into the thing it is trying not to be.

     They used to be a section of their own, headed "What it does not do". The
     page now compares Free and Pro line by line and carries the limits as one
     sentence under the table — smaller, but it must still come BEFORE the
     invitation to sign up, which is the part this has always been about. */
  it("puts what neither plan does above the sign-up invitation", () => {
    const comparison = readFileSync(
      path.join(SRC, "components", "marketing", "plan-comparison.tsx"),
      "utf8",
    );
    expect(comparison, "the limits sentence is gone").toContain("Neither plan does");

    const page = readFileSync(
      path.join(SRC, "components", "marketing", "pricing-page.tsx"),
      "utf8",
    );
    const table = page.indexOf("<PlanComparison");
    const lastCta = page.lastIndexOf("Create a free account");
    expect(table, "the comparison is not on the pricing page").toBeGreaterThan(0);
    expect(table).toBeLessThan(lastCta);
  });

  it("names limits, not just features", () => {
    // A "pricing" page for a free product with no limits section is a poster.
    expect(LIMITS.length).toBeGreaterThanOrEqual(4);
    expect(INCLUDED.length).toBeGreaterThanOrEqual(6);
    expect(DENIALS).toHaveLength(3);
    expect(WHY.length).toBeGreaterThanOrEqual(2);
  });

  /* Each limit is a sentence a reader can act on, not a one-word shrug. */
  it.each(LIMITS)("explains the limit %s", (_title, body) => {
    expect(body.length).toBeGreaterThan(40);
  });

  it("keeps the limits honest about the ones stated elsewhere", () => {
    /* These five are claimed on /vs/calendly too. If one is ever built, both
       pages have to change, and this fails until they do.

       Three of the original five went this way — rescheduling, locations and
       team scheduling were all built, and each one failed here first. */
    const all = LIMITS.map(([t]) => t.toLowerCase()).join(" | ");
    for (const missing of ["google calendar only", "no payments", "no zoom", "round-robin only", "email only"]) {
      expect(all, `${missing} is no longer listed as a limit`).toContain(missing);
    }
  });

  /* The check above, on its own, is satisfied by renaming "No rescheduling yet"
     to "Rescheduling" — the word survives while the meaning inverts, and a
     limits section quietly gains a feature. Found by mutating it. So every
     entry must also still READ as a limit. */
  it.each(LIMITS)("states %s as a restriction, not a capability", (title) => {
    expect(title.toLowerCase(), `"${title}" no longer reads as a limit`).toMatch(/\bno\b|\bonly\b/);
  });
});
