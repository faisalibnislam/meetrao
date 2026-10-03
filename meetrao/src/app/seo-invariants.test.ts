import { describe, expect, it } from "vitest";
import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import { COMPARISONS } from "@/lib/comparisons";
import { DESCRIPTION, TITLE, TITLE_TEMPLATE } from "@/lib/seo";
import sitemap from "./sitemap";

/* ─────────────────────────────────────────────────────────────────────────────
   The SEO rules that fail silently.

   None of these break a page. A missing noindex renders perfectly; a missing
   og:image renders perfectly; a disallow left off a new route renders
   perfectly. They are found weeks later, by someone else, in search results,
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
     reference is unguessable, which is not the same as private. One shared
     link, one crawler, and a stranger's meeting is a search result. */
  const bookingPages = pages("(public)/booking/**/page.tsx");

  it("finds the guest booking pages at all", () => {
    expect(bookingPages.map((p) => p.file).sort()).toEqual([
      "(public)/booking/[reference]/cancel/page.tsx",
      "(public)/booking/[reference]/cancelled/page.tsx",
      "(public)/booking/[reference]/page.tsx",
      "(public)/booking/[reference]/reschedule/page.tsx",
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
 * *imports* OG_IMAGE at the top and never uses it, which is exactly the defect
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

  /* A canonical at the root is inherited by every page that does not set one,
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

/* ─────────────────────────────────────────────────────────────────────────────
   Titles, descriptions and the sitemap.

   All three fail the same way: invisibly, in somebody else's search results,
   weeks later. A title two characters too long is cut mid-word; a description
   at 170 characters ends in an ellipsis; a page added without a sitemap entry
   is simply never crawled. None of it shows up locally, and none of it throws.

   The measurements are Google's display limits, not preferences: roughly 60
   characters for a title and 155 for a description before the snippet is
   truncated.
   ───────────────────────────────────────────────────────────────────────────── */

const BRAND = "Meetrao";

/**
 * Every page a stranger can reach, and the title Next actually renders for it.
 *
 * `template` pages get " · Meetrao" appended, because `title.template` in the
 * root layout applies to child segments. `absolute` pages do not, which is
 * both /vs pages and the home page's own default. Getting that backwards is
 * how a brand ends up in a title twice, so the two kinds are separated here
 * rather than assumed.
 */
const RENDERED: { path: string; file: string; title: string }[] = [
  { path: "/", file: "(marketing)/page.tsx", title: TITLE },
  ...COMPARISONS.map((c) => ({
    path: `/vs/${c.slug}`,
    file: `(marketing)/vs/${c.slug}/page.tsx`,
    title: c.title,
  })),
  ...(
    [
      ["/pricing", "(marketing)/pricing/page.tsx"],
      ["/alternatives", "(marketing)/alternatives/page.tsx"],
      ["/custom-domain", "(marketing)/custom-domain/page.tsx"],
      ["/guides/calendar-privacy", "(marketing)/guides/calendar-privacy/page.tsx"],
      ["/help", "help/page.tsx"],
      ["/support", "support/page.tsx"],
      ["/privacy", "(marketing)/privacy/page.tsx"],
      ["/terms", "(marketing)/terms/page.tsx"],
      ["/signup", "(auth)/signup/page.tsx"],
      ["/login", "(auth)/login/page.tsx"],
    ] as const
  ).map(([path, file]) => ({
    path,
    file,
    title: TITLE_TEMPLATE.replace("%s", literal(read(file), "title")),
  })),
];

/** The value of a metadata string field, including `"a" + "b"` continuations. */
function literal(source: string, field: string): string {
  const at = source.indexOf(`${field}:`);
  if (at < 0) return "";
  const tail = source.slice(at + field.length + 1);
  const parts: string[] = [];
  const scan = /^[\s+]*"((?:[^"\\]|\\.)*)"/;

  let rest = tail;
  for (let hit = scan.exec(rest); hit; hit = scan.exec(rest)) {
    parts.push(hit[1].replace(/\\"/g, '"'));
    rest = rest.slice(hit[0].length);
    if (!/^\s*\+/.test(rest)) break;
  }
  return parts.join("");
}

describe("page titles", () => {
  it("covers every public page, so a new one cannot slip past", () => {
    // The filesystem decides the list, not this file. A page added under a
    // public route with its own canonical has to appear above.
    const canonical = pages("**/page.tsx")
      .filter((p) => /alternates:\s*\{\s*canonical/.test(p.text))
      /* Booking pages are canonical but generated per host and per team, not
         authored. There is no fixed path to render and no fixed title to
         assert, so they carry their canonical in generateMetadata and are
         checked by the noindex block above instead. */
      .filter((p) => !p.file.includes("[username]") && !p.file.includes("/team/"))
      .map((p) => p.file)
      .sort();

    expect(RENDERED.map((r) => r.file).sort()).toEqual(canonical);
  });

  it.each(RENDERED)("$path fits in a search result", ({ title }) => {
    expect(title.length, `"${title}" is ${title.length} characters`).toBeLessThanOrEqual(60);
    expect(title.length).toBeGreaterThan(12);
  });

  /* The defect this exists for: a page setting `title: "Help Centre, how
     Meetrao scheduling works"` renders as "… how Meetrao scheduling works ·
     Meetrao". Reads as a mistake, and wastes the scarcest line on the page. */
  it.each(RENDERED)("$path names the brand exactly once", ({ title }) => {
    const times = title.split(BRAND).length - 1;
    expect(times, `"${title}"`).toBe(1);
  });

  it("gives every page a different title", () => {
    const all = RENDERED.map((r) => r.title);
    expect(new Set(all).size, `duplicates in ${all.join(" | ")}`).toBe(all.length);
  });

  /* The home page has one line to say what the product is to somebody who has
     never heard of it. It spends it on the category and the price, not on the
     name. The name goes last, and earns its place only once people search it. */
  it("leads the home page with the category, not the brand", () => {
    expect(TITLE.toLowerCase()).toContain("free");
    expect(TITLE.toLowerCase()).toContain("scheduling");
    expect(TITLE.toLowerCase()).toContain("booking");
    expect(TITLE.indexOf(BRAND)).toBeGreaterThan(TITLE.length / 2);
  });
});

describe("page descriptions", () => {
  const DESCRIBED: { path: string; description: string }[] = [
    { path: "/", description: DESCRIPTION },
    ...COMPARISONS.map((c) => ({ path: `/vs/${c.slug}`, description: c.description })),
    ...(
      [
        ["/pricing", "(marketing)/pricing/page.tsx"],
        ["/alternatives", "(marketing)/alternatives/page.tsx"],
        ["/custom-domain", "(marketing)/custom-domain/page.tsx"],
        ["/guides/calendar-privacy", "(marketing)/guides/calendar-privacy/page.tsx"],
        ["/help", "help/page.tsx"],
        ["/support", "support/page.tsx"],
        ["/privacy", "(marketing)/privacy/page.tsx"],
        ["/terms", "(marketing)/terms/page.tsx"],
        ["/signup", "(auth)/signup/page.tsx"],
      ] as const
    ).map(([path, file]) => ({ path, description: literal(read(file), "description") })),
  ];

  it("reads them at all", () => {
    // Guards the guard: a parser that returns "" for everything would pass the
    // upper bound on every page and fail nothing.
    for (const { path, description } of DESCRIBED) {
      expect(description.length, `${path} has no description`).toBeGreaterThan(40);
    }
  });

  it.each(DESCRIBED)("$path survives the snippet cut", ({ description }) => {
    expect(description.length, `${description.length} chars: ${description}`).toBeLessThanOrEqual(155);
  });

  it.each(DESCRIBED)("$path says enough to be worth showing", ({ description }) => {
    expect(description.length).toBeGreaterThan(80);
  });
});

describe("the sitemap", () => {
  const source = readFileSync(path.join(APP, "sitemap.ts"), "utf8");

  /* Excluded on purpose, each for its own reason, not by oversight, which is
     what the assertion below would otherwise let through. */
  const EXCLUDED: Record<string, string> = {
    "/login": "a sign-in form has nothing to rank for, and a crawler bounces off it",
  };

  /* Calls the sitemap rather than reading its source. The comparison entries
     are spread in from COMPARISONS, so the paths are no longer written out as
     literals and a regex over the file would miss every one of them while
     still passing on the rest. */
  it("lists every public page that is not deliberately excluded", () => {
    const listed = sitemap().map((entry) => new URL(entry.url).pathname.replace(/(.)\/$/, "$1"));
    const expected = RENDERED.map((r) => r.path).filter((p) => !(p in EXCLUDED));

    expect(listed.sort()).toEqual(expected.sort());
  });

  /* Host booking pages are public and individually indexable and still must not
     be here: a sitemap enumerating them is a machine-readable roster of
     everybody who uses the product. */
  it("never enumerates the hosts", () => {
    expect(source).not.toContain("[username]");
    expect(source).not.toMatch(/from "@\/lib\/(data|supabase)/);
  });
});
