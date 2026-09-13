import { describe, expect, it } from "vitest";
import { COMPARISONS } from "./comparisons";

/* ─────────────────────────────────────────────────────────────────────────────
   Claims about somebody else's product.

   A comparison page is the one place on this site that states facts about a
   company with lawyers, in a context where being wrong is also being
   self-serving. The rules at the top of comparisons.ts are the policy; this is
   the part of it a machine can check.

   The specific defect that prompted this file: the Calendly row read "paid
   plans published from $10/seat/month". Ten dollars is the ANNUAL rate. The
   monthly rate is twelve. Quoting the lower number bare is the classic
   comparison-page sleight of hand — technically sourced, practically
   misleading, and exactly the kind of thing that gets a page distrusted in
   whole rather than in part.
   ───────────────────────────────────────────────────────────────────────────── */

/** Every string on a comparison that a reader treats as a factual claim. */
function claims(): { where: string; text: string }[] {
  return COMPARISONS.flatMap((c) => [
    ...c.summary.map((text, i) => ({ where: `${c.slug} summary[${i}]`, text })),
    ...c.rows.flatMap((r) => [
      { where: `${c.slug} row "${r.feature}" (them)`, text: r.them },
      { where: `${c.slug} row "${r.feature}" (us)`, text: r.meetrao },
    ]),
    ...c.theirWins.map(([t, b]) => ({ where: `${c.slug} theirWins "${t}"`, text: b })),
    ...c.meetraoWins.map(([t, b]) => ({ where: `${c.slug} meetraoWins "${t}"`, text: b })),
    ...c.faq.map(([q, a]) => ({ where: `${c.slug} faq "${q}"`, text: a })),
  ]);
}

describe("competitor pricing", () => {
  it("has comparisons to check", () => {
    // Guards the guard: an empty array passes every assertion below.
    expect(COMPARISONS.length).toBeGreaterThanOrEqual(2);
    expect(claims().length).toBeGreaterThan(30);
  });

  /* A per-seat price is two numbers, not one, and which one you quote changes
     the comparison by 20%. Any figure has to say which it is. */
  it.each(claims().filter((c) => /\$\d/.test(c.text)))(
    "$where states the billing basis alongside the price",
    ({ text }) => {
      expect(text.toLowerCase(), `"${text}" quotes a price with no billing basis`).toMatch(
        /annual|monthly|a month|per month|\/month/,
      );
    },
  );

  /* Quoting only the cheaper of the two is the sleight of hand this exists for.
     If a claim names an annual rate, it names the monthly one too. */
  it.each(claims().filter((c) => /\$\d/.test(c.text) && /annual/i.test(c.text)))(
    "$where gives the monthly rate as well as the annual one",
    ({ text }) => {
      const figures = text.match(/\$\d+(?:\.\d+)?/g) ?? [];
      expect(new Set(figures).size, `"${text}" names an annual rate and no monthly one`).toBeGreaterThan(1);
    },
  );

  it("dates every set of figures, and shows the date", () => {
    for (const c of COMPARISONS) {
      expect(c.checkedOn, `${c.slug} has no checkedOn`).toMatch(/\b(19|20)\d{2}\b/);
    }
  });

  /* The reader's escape hatch. Every figure here is second-hand until somebody
     opens this link, so it has to point at the vendor and not at us. */
  it("links each competitor's own pricing page", () => {
    for (const c of COMPARISONS) {
      const host = new URL(c.competitorUrl).hostname.replace(/^www\./, "");
      expect(host, `${c.slug} does not link to the vendor`).toBe(
        c.competitor.toLowerCase().replace(/[^a-z.]/g, "") + (c.competitor.includes(".") ? "" : ".com"),
      );
      expect(c.competitorUrl).toMatch(/pricing/);
    }
  });
});

describe("the tone rules, as far as a machine can read them", () => {
  /* Rule 2 in comparisons.ts: nothing derogatory, nothing about "lock-in". A
     page that sneers reads as marketing and gets treated as marketing. */
  it.each(["lock you in", "lock-in", "rip-off", "overpriced", "scam", "bloated", "greedy"])(
    "never says %s",
    (phrase) => {
      const said = claims()
        .filter((c) => c.text.toLowerCase().includes(phrase))
        .map((c) => c.where);
      expect(said).toEqual([]);
    },
  );

  /* Rule 3: the honest section exists and is not a token gesture. It is the
     reason a reader believes the rest of the page. */
  it("says where the other product is better, at length", () => {
    for (const c of COMPARISONS) {
      expect(c.theirWins.length, `${c.slug} concedes too little`).toBeGreaterThanOrEqual(3);
      for (const [title, body] of c.theirWins) {
        expect(body.length, `${c.slug} "${title}" is a token concession`).toBeGreaterThan(60);
      }
    }
  });
});
