import { describe, expect, it } from "vitest";
import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import { DESCRIPTION } from "@/lib/seo";

/* ─────────────────────────────────────────────────────────────────────────────
   The SEO rules that fail silently.

   None of these break a page. A missing noindex renders perfectly; a missing
   og:image renders perfectly; a disallow left off a new route renders
   perfectly. They are found weeks later, by someone else, in search results —
   which is exactly the shape of thing worth pinning in a test rather than
   remembering.

   Two of them were real defects when this file was written: every page in the
   app inherited a canonical pointing at the home page, and five pages that set
   their own openGraph shipped without an image because Next replaces the
   parent object instead of merging into it.
   ───────────────────────────────────────────────────────────────────────────── */

const APP = path.join(process.cwd(), "src/app");

function read(rel: string): string {
  return readFileSync(path.join(APP, rel), "utf8");
}

function pages(glob: string): { file: string; text: string }[] {
  return globSync(glob, { cwd: APP })
    .filter((f) => !f.includes(".test."))
    .map((file) => ({ file, text: read(file) }));
}

describe("pages that must never be indexed", () => {
  /* /booking/<reference> shows a named guest, a named host and a time. The
     reference is unguessable, which is not the same as private — one shared
     link, one crawler, and a stranger's meeting is a search result. */
  const bookingPages = pages("(public)/booking/**/page.tsx");

  it("finds the guest booking pages at all", () => {
    expect(bookingPages.map((p) => p.file).sort()).toEqual([
      "(public)/booking/[reference]/cancel/page.tsx",
      "(public)/booking/[reference]/cancelled/page.tsx",
      "(public)/booking/[reference]/page.tsx",
    ]);
  });

  it.each(bookingPages.map((p) => p.file))("%s is noindex", (file) => {
    const text = read(file);
    expect(text, `${file} does not set robots`).toMatch(/robots:\s*(PRIVATE_PAGE|\{[^}]*index:\s*false)/);
  });
});

describe("the signed-in product stays out of the index", () => {
  const robots = read("robots.ts");

  /* Every top-level route group under (app) is a screen behind a session. A new
     one added later inherits nothing from this list, so the list has to be
     checked against the filesystem rather than trusted. */
  const appSegments = [
    ...new Set(globSync("(app)/*/page.tsx", { cwd: APP }).map((f) => f.split("/")[1])),
    ...new Set(globSync("(app)/*/**/page.tsx", { cwd: APP }).map((f) => f.split("/")[1])),
  ].sort();

  it("finds the app routes at all", () => {
    expect(appSegments.length).toBeGreaterThan(4);
  });

  it.each(appSegments)("robots.txt disallows /%s", (segment) => {
    expect(robots, `add "/${segment}" to the disallow list in src/app/robots.ts`).toContain(`"/${segment}"`);
  });

  it("disallows the admin console and the component gallery too", () => {
    for (const segment of ["/admin", "/preview", "/onboarding", "/api/", "/auth/"]) {
      expect(robots).toContain(`"${segment}"`);
    }
  });
});

/**
 * The text between `openGraph: {` and its matching brace.
 *
 * Brace counting rather than a regex, and not because it is elegant: the
 * obvious `/openGraph[\s\S]*?images/` test passes on a file that merely
 * *imports* OG_IMAGE at the top and never uses it — which is exactly the defect
 * it is supposed to catch, and which it duly failed to catch when tried.
 */
function openGraphBlocks(source: string): string[] {
  const blocks: string[] = [];
  const marker = /openGraph:\s*\{/g;
  for (let hit = marker.exec(source); hit; hit = marker.exec(source)) {
    let depth = 1;
    let i = hit.index + hit[0].length;
    for (; i < source.length && depth > 0; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") depth--;
    }
    blocks.push(source.slice(hit.index, i));
  }
  return blocks;
}

describe("social cards", () => {
  /* Next REPLACES a parent's openGraph object rather than merging into it. A
     page that sets og:title and leaves the image to be inherited ships without
     one, and unfurls as a grey rectangle. */
  const withOwnOg = pages("**/page.tsx").filter((p) => openGraphBlocks(p.text).length > 0);

  it("finds pages that declare their own openGraph", () => {
    expect(withOwnOg.length).toBeGreaterThan(2);
  });

  it.each(withOwnOg.map((p) => p.file))("%s carries an image", (file) => {
    for (const block of openGraphBlocks(read(file))) {
      expect(block, `${file} sets openGraph without an image`).toMatch(/images:\s*\[/);
    }
  });
});

describe("the root metadata", () => {
  const layout = read("layout.tsx");

  it("sets metadataBase, without which every canonical is relative to nothing", () => {
    expect(layout).toMatch(/metadataBase:\s*new URL\(/);
  });

  /* A canonical at the root is inherited by every page that does not set one —
     which pointed the whole signed-in app, and the guest booking pages, at the
     home page. Each public page declares its own instead. */
  it("does not set a site-wide canonical", () => {
    expect(layout).not.toMatch(/alternates:\s*\{\s*canonical/);
  });

  it("keeps the description short enough to survive a search result", () => {
    expect(DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(DESCRIPTION.length).toBeGreaterThan(80);
  });
});

describe("the public pages declare their own canonical", () => {
  const PUBLIC = [
    "(marketing)/page.tsx",
    "(marketing)/privacy/page.tsx",
    "(marketing)/terms/page.tsx",
    "(marketing)/vs/calendly/page.tsx",
    "(marketing)/vs/cal-com/page.tsx",
    "help/page.tsx",
    "support/page.tsx",
    "(auth)/login/page.tsx",
    "(auth)/signup/page.tsx",
  ];

  it.each(PUBLIC)("%s", (file) => {
    expect(read(file), `${file} has no canonical`).toMatch(/alternates:\s*\{\s*canonical/);
  });
});
