import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { AUDIENCES } from "./audiences";

/* ─────────────────────────────────────────────────────────────────────────────
   Four pages that must not become one page with the noun swapped.

   An audience page is the easiest thing on a site to do badly: write it once,
   change "consultants" to "coaches", publish four. Search engines have
   recognised that shape for twenty years and it is worse for the site than
   publishing nothing. These assertions are the part of "write four real pages"
   a machine can check.

   The second job here is the duplicated metadata. Each route writes its title
   and description out as literals, because seo-invariants.test.ts reads page
   metadata without executing it and cannot measure a value behind a reference.
   That duplication is deliberate and it is exactly the kind that rots, so it
   is checked.
   ───────────────────────────────────────────────────────────────────────────── */

const ROUTES = path.join(process.cwd(), "src/app/(marketing)/for");

function route(slug: string): string {
  return readFileSync(path.join(ROUTES, slug, "page.tsx"), "utf8");
}

/** Every sentence a reader actually reads, per audience. */
function prose(a: (typeof AUDIENCES)[number]): string[] {
  return [
    a.heading,
    ...a.intro,
    ...a.does.flatMap(([t, b]) => [t, b]),
    ...a.cannot.flatMap(([t, b]) => [t, b]),
    ...a.faq.flatMap(([q, ans]) => [q, ans]),
  ];
}

describe("the audience pages are four pages", () => {
  it("has four to check", () => {
    // Guards the guard: an empty array passes every assertion below.
    expect(AUDIENCES.length).toBe(4);
    expect(new Set(AUDIENCES.map((a) => a.slug)).size).toBe(4);
  });

  /* The defect this file exists for. A sentence appearing on two of these
     pages is a sentence that was templated rather than written, and two pages
     sharing a paragraph is the signal that gets a cluster discounted whole. */
  it("never repeats a sentence across two audiences", () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];

    for (const a of AUDIENCES) {
      for (const line of prose(a)) {
        const key = line.trim().toLowerCase();
        const first = seen.get(key);
        if (first) clashes.push(`${first} and ${a.slug} both say: ${line}`);
        else seen.set(key, a.slug);
      }
    }

    expect(clashes).toEqual([]);
  });

  /* Each page is supposed to be ABOUT something, and the four subjects were
     chosen so they do not overlap. If a page stops mentioning its own subject
     it has drifted into being the generic one. */
  it.each([
    ["consultants", "meeting type"],
    ["coaches", "reminder"],
    ["freelancers", "domain"],
    ["agencies", "round-robin"],
  ])("%s leans on %s", (slug, subject) => {
    const a = AUDIENCES.find((x) => x.slug === slug)!;
    const text = prose(a).join(" ").toLowerCase();
    expect(text, `${slug} never mentions ${subject}`).toContain(subject);
  });

  /* The section that makes the rest believable, and the one most likely to be
     quietly trimmed later. Three real limits, not one hedge. */
  it("tells every audience what it will not do, at length", () => {
    for (const a of AUDIENCES) {
      expect(a.cannot.length, `${a.slug} concedes too little`).toBeGreaterThanOrEqual(3);
      for (const [title, body] of a.cannot) {
        expect(body.length, `${a.slug} "${title}" is a token concession`).toBeGreaterThan(60);
      }
    }
  });

  it("gives every audience its own title and description", () => {
    expect(new Set(AUDIENCES.map((a) => a.title)).size).toBe(4);
    expect(new Set(AUDIENCES.map((a) => a.description)).size).toBe(4);
  });
});

describe("the duplicated metadata", () => {
  /* Each route repeats its title and description as literals so the length
     limits in seo-invariants.test.ts can read them. This is the assertion that
     keeps the copy and the copy's copy the same. */
  it.each(AUDIENCES)("$slug repeats the title from audiences.ts", ({ slug, title }) => {
    expect(route(slug)).toContain(`title: ${JSON.stringify(title)},`);
  });

  it.each(AUDIENCES)("$slug repeats the description from audiences.ts", ({ slug, description }) => {
    /* Written across two lines with a +, so the assertion joins the source's
       string literals back up rather than matching the formatting. */
    const source = route(slug);
    const block = source.slice(source.indexOf("  description:"), source.indexOf("  alternates:"));
    const joined = [...block.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]).join("");
    expect(joined).toBe(description);
  });
});
