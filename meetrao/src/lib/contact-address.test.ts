import { describe, expect, it } from "vitest";
import { globSync, readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   One support address, and only one.

   The contact address was scattered across six places — the Support page, two
   sections each of Terms and Privacy, and two error messages — all carrying an
   address on a domain that no longer belongs to the product. Changing five of
   six is the obvious way to get this wrong, and the sixth only surfaces when
   somebody has already failed to reach us.

   So the rule is checked rather than remembered: any address on a domain we
   control has to be exactly support@meetrao.com. Fictional addresses on other
   domains — form placeholders, the mock guests on the dashboard — are left
   alone, which keeps the rule narrow enough not to need a growing allow-list.
   ───────────────────────────────────────────────────────────────────────────── */

const SUPPORT = "support@meetrao.com";

/** Domains the product owns. An address on one of these is a real address. */
const OURS = ["meetrao.com", "airlystudio.com"];

const SRC = path.join(process.cwd(), "src");

/** Everything a visitor can read: screens, components and the email templates. */
const AREAS = ["app", "components", "emails"];

const ADDRESS = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

function userFacingFiles(): string[] {
  return AREAS.flatMap((area) =>
    globSync(`${area}/**/*.{ts,tsx,html}`, { cwd: SRC })
      .filter((f) => !f.includes(".test."))
      .map((f) => path.join(SRC, f)),
  );
}

describe("the support address", () => {
  it("is the only address on our own domains anywhere a visitor can see", () => {
    const wrong: string[] = [];

    for (const file of userFacingFiles()) {
      const text = readFileSync(file, "utf8");

      for (const match of text.match(ADDRESS) ?? []) {
        const address = match.toLowerCase();
        const domain = address.slice(address.lastIndexOf("@") + 1);

        if (!OURS.some((d) => domain === d || domain.endsWith(`.${d}`))) continue;
        if (address === SUPPORT) continue;

        wrong.push(`${path.relative(SRC, file)}: ${match}`);
      }
    }

    expect(wrong).toEqual([]);
  });

  it("is actually present on the pages that promise a way to reach us", () => {
    // The inverse failure: an address removed and replaced with nothing at all
    // would pass the check above perfectly.
    const pages = [
      "components/marketing/support-body.tsx",
      "app/(marketing)/terms/page.tsx",
      "app/(marketing)/privacy/page.tsx",
    ];

    for (const page of pages) {
      expect(readFileSync(path.join(SRC, page), "utf8"), page).toContain(SUPPORT);
    }
  });
});
