import { readFileSync } from "node:fs";
import path from "node:path";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

/* The footer moved out of the (public) layout and into the pages, because the
   "Powered by Meetrao" badge depends on whose page it is and a layout cannot
   know. The legal links live in the same component and do NOT depend on the
   plan — a guest has no settings page to find Terms and Privacy in.
   
   So the failure this guards is a page that quietly ships with no legal
   links, which is exactly what moving a footer out of a layout invites. */

const APP = path.join(process.cwd(), "src", "app");
const pages = globSync("(public)/**/page.tsx", { cwd: APP }).filter((f) => !f.includes(".test."));

describe("every guest-facing page", () => {
  it("finds them at all", () => {
    // Guards the guard: a renamed folder passes everything below vacuously.
    expect(pages.length).toBeGreaterThanOrEqual(7);
  });

  it.each(pages)("%s renders the public footer", (file) => {
    const text = readFileSync(path.join(APP, file), "utf8");
    expect(text, `${file} has no footer, so no Terms or Privacy link`).toContain("<PublicFooter");
  });
});

describe("the layout", () => {
  /* Comments stripped first: the layout explains in prose why the footer is
     not there, and a naive search finds the explanation. */
  const layout = readFileSync(path.join(APP, "(public)", "layout.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("no longer carries the footer itself", () => {
    // Two footers is worse than none, and the layout's copy cannot be hidden
    // for a Pro host.
    expect(layout).not.toContain("Powered by");
    expect(layout).not.toContain("PublicFooter");
  });
});

describe("the badge", () => {
  const footer = readFileSync(path.join(process.cwd(), "src/components/booking/public-footer.tsx"), "utf8");

  it("is the only thing the plan hides", () => {
    expect(footer).toContain("badge ?");
    // The legal links sit outside the conditional.
    const afterConditional = footer.slice(footer.indexOf(") : null}"));
    for (const link of ["/terms", "/privacy", "/support"]) {
      expect(afterConditional, `${link} is inside the badge conditional`).toContain(link);
    }
  });

  /* The pages that know a host pass its plan; the ones reached by booking
     reference do not, and keep the badge. That is deliberate — a guest
     following a link from an email is not on anybody's branded page. */
  it("is hidden only where a host is resolved", () => {
    const withHost = ["(public)/[username]/page.tsx", "(public)/[username]/[slug]/page.tsx"];
    for (const file of withHost) {
      expect(readFileSync(path.join(APP, file), "utf8")).toContain("badge={!host.unbranded}");
    }
  });
});
