import { describe, expect, it } from "vitest";
import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import { POSTAL_ADDRESS, SUPPORT_EMAIL } from "./contact";

/* ─────────────────────────────────────────────────────────────────────────────
   One operator, one postal address, one support inbox.

   The contact address was scattered across six places — the Support page, two
   sections each of Terms and Privacy, and two error messages — all carrying an
   address on a domain that no longer belongs to the product. Changing five of
   six is the obvious way to get this wrong, and the sixth only surfaces when
   somebody has already failed to reach us.

   The same then happened to the operator's identity: a studio's name in the
   footer, a US address on the Terms, a Bangladeshi one on the Privacy Policy,
   and a third address again in the email footers. That is not a typo. It is the
   first thing a Google verification reviewer compares against the OAuth consent
   screen, and the first thing a regulator asks about.

   So both rules are checked rather than remembered.
   ───────────────────────────────────────────────────────────────────────────── */

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
        if (address === SUPPORT_EMAIL) continue;

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
      const text = readFileSync(path.join(SRC, page), "utf8");
      // Either spelled out, or read from lib/contact — which is the point of
      // the rule in the next block.
      expect(text.includes(SUPPORT_EMAIL) || text.includes("SUPPORT_EMAIL"), page).toBe(true);
    }
  });
});

/* ── the operator's identity ───────────────────────────────────────────────── */

const ROOT = process.cwd();

/** Everything shipped or deployed: app code, SQL, scripts, email templates. */
function shippedFiles(): { file: string; text: string }[] {
  const patterns = [
    ["src", "**/*.{ts,tsx,css,html,md}"],
    ["supabase", "**/*.{sql,html}"],
    ["scripts", "**/*.mjs"],
  ] as const;

  return patterns
    .flatMap(([dir, glob]) =>
      globSync(glob, { cwd: path.join(ROOT, dir) })
        .map((f) => path.join(dir, f))
        // A test's fixtures are not shipped copy, and this file names the
        // retired strings on purpose.
        .filter((f) => !f.includes(".test.")),
    )
    .map((file) => ({ file, text: readFileSync(path.join(ROOT, file), "utf8") }));
}

const FILES = shippedFiles();

describe("one operator, one address", () => {
  it("reads the source at all", () => {
    // Guards the guard: a moved directory would make every assertion below
    // pass by finding nothing to check.
    expect(FILES.length).toBeGreaterThan(50);
  });

  /* Every name and address Meetrao has been published under and no longer is.
     Add to this list rather than removing from it — the point is that a retired
     identity can never quietly come back. */
  const RETIRED = ["Airly", "airlystudio", "Alexandria, VA", "301 King St", "22314"];

  it.each(RETIRED)("has no trace of %s", (needle) => {
    const found = FILES.filter((f) => f.text.includes(needle)).map((f) => f.file);
    expect(found).toEqual([]);
  });

  it("defines the postal address exactly once, and imports it everywhere else", () => {
    const literals = FILES.filter((f) => f.text.includes(POSTAL_ADDRESS)).map((f) => f.file);
    expect(literals).toEqual([path.join("src", "lib", "contact.ts")]);
  });

  it("shows the address on both legal documents and in the footer", () => {
    // Not by literal — by import, which is the point of the rule above.
    for (const file of [
      path.join("src", "app", "(marketing)", "privacy", "page.tsx"),
      path.join("src", "app", "(marketing)", "terms", "page.tsx"),
      path.join("src", "components", "marketing", "site-chrome.tsx"),
    ]) {
      const found = FILES.find((f) => f.file === file);
      expect(found, `${file} is missing`).toBeDefined();
      expect(found!.text, `${file} does not render the postal address`).toContain("POSTAL_ADDRESS");
    }
  });

  it("puts the address in every email, through the environment", () => {
    const send = FILES.find((f) => f.file === path.join("src", "lib", "email", "send.ts"));
    expect(send, "lib/email/send.ts is missing").toBeDefined();
    expect(send!.text).toContain("EMAIL_POSTAL_ADDRESS");

    // …and that variable's default is the real address, so a deployment that
    // never sets it still sends anti-spam-compliant mail.
    //
    // Matched loosely on purpose. The first version of this pinned the exact
    // zod spelling and broke the moment the schema was hardened against blank
    // values — a test that fails when the code gets better is testing the
    // wrong thing. The invariant is that the default comes from the shared
    // constant, not how it is wrapped; env.test.ts checks the behaviour.
    const env = FILES.find((f) => f.file === path.join("src", "lib", "env.ts"));
    expect(env!.text).toMatch(/EMAIL_POSTAL_ADDRESS:.*\bPOSTAL_ADDRESS\b/);
  });
});
