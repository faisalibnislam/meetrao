import { readFileSync } from "node:fs";
import path from "node:path";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

/* The footer moved out of the (public) layout and into the pages, because the
   "Powered by Meetrao" badge depends on whose page it is and a layout cannot
   know. The legal links live in the same component and do NOT depend on the
   plan. a guest has no settings page to find Terms and Privacy in.
   
   So the failure this guards is a page that quietly ships with no legal
   links, which is exactly what moving a footer out of a layout invites. */

const APP = path.join(process.cwd(), "src", "app");
const pages = globSync("(public)/**/page.tsx", { cwd: APP }).filter((f) => !f.includes(".test."));

describe("every guest-facing page", () => {
  it("finds them at all", () => {
    /* Guards the guard: a renamed folder passes everything below vacuously.
       Was 7 until (public)/[username]/page.tsx was removed: that page listed
       somebody's meetings and the product no longer has such a page. */
    expect(pages.length).toBeGreaterThanOrEqual(6);
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

describe("the layout stacks what the pages return", () => {
  const layout = readFileSync(path.join(APP, "(public)", "layout.tsx"), "utf8");

  /* Moving the footer into the pages made every page return TWO elements. The
     layout centred a single child in a row, so the card and the footer became
     siblings in that row: the card stopped being centred and the footer
     climbed to the top-right corner. It shipped, and it looked like a CSS
     mystery rather than a consequence of the refactor.
     
     A column stacks them. Both classes matter, flex-col to stack,
     items-center to centre each one horizontally. */
  it("is a column, because pages return a card and a footer", () => {
    expect(layout, "a row puts the footer beside the card").toContain("flex-col");
    expect(layout, "without items-center the card hugs the left edge").toContain("items-center");
  });

  it.each(pages)("%s returns its content and the footer as siblings", (file) => {
    const text = readFileSync(path.join(APP, file), "utf8");
    /* A fragment, or <BrandScope>, which is a fragment with CSS variables on
       it. BrandScope renders `display: contents`, so it introduces no box and
       the card and footer are still the layout column's own children, exactly
       as a fragment leaves them. Anything else here would wrap them in a box
       and re-break the centring this file exists to guard. */
    expect(text).toMatch(/(<>\s|<BrandScope)/);
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

  /* EVERY guest-facing page hides it for a Pro host now, including the ones
     reached by booking reference.

     This file used to say the opposite. That the reference pages keep the
     badge because "a guest following a link from an email is not on anybody's
     branded page". That was a rationalisation of a limitation: those pages had
     no username in the URL and so could not tell whose booking it was. They
     can now, because convex/publicBooking.ts returns the host's plan and brand
     on the booking itself. A guest who books through a host's own branded page
     and then lands on our green confirmation has been handed to a stranger
     halfway through, and the email link is the MOST likely way they get there. */
  it("is hidden wherever a host is known, which is everywhere", () => {
    /* `unbranded` rather than `host.unbranded`: on a company's domain the
       page wears the COMPANY's brand, so the badge follows the company's
       entitlement and not the member's. A free member of a Business company
       must not get a "Powered by Meetrao" badge on their owner's domain. */
    const byUsername = ["(public)/[username]/[slug]/page.tsx"];
    for (const file of byUsername) {
      const text = readFileSync(path.join(APP, file), "utf8");
      expect(text).toContain("badge={!unbranded}");
      expect(text, "the badge must follow the brand actually shown").toContain(
        "const unbranded = company ? company.unbranded : host.unbranded;",
      );
    }

    const byReference = globSync("(public)/booking/**/page.tsx", { cwd: APP });
    expect(byReference.length).toBeGreaterThanOrEqual(4);
    for (const file of byReference) {
      expect(
        readFileSync(path.join(APP, file), "utf8"),
        `${file} shows "Powered by Meetrao" on a Pro host's page`,
      ).toContain("badge={!booking.hostUnbranded}");
    }
  });
});
