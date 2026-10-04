import { readFileSync, globSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* ─────────────────────────────────────────────────────────────────────────────
   A Pro host's branding, guarded at the four places it can silently break.

   None of this can be checked by rendering. There is no DOM harness here.
   So it is checked at the source, which is the same way the rest of this repo
   guards its invariants. Each test below names the failure it exists for.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const APP = path.join(ROOT, "src", "app");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

/* Several assertions below are "this file does NOT say X", and the comments
   in this codebase explain at length why something is absent, so they say X
   while meaning the opposite. Stripped first, as src/app/public-footer.test.ts
   does for the same reason. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

/* The team page is excluded on purpose, and only it: a team meeting has
   several hosts and no single brand, so it keeps Meetrao's mark. */
const guestPages = globSync("(public)/**/page.tsx", { cwd: APP }).filter(
  (f) => !f.includes("/team/"),
);

describe("the mark on a guest-facing page", () => {
  it("finds the pages at all", () => {
    /* Guards the guard: a renamed folder passes everything below vacuously.
       Was 6 until the index page was removed. */
    expect(guestPages.length).toBeGreaterThanOrEqual(5);
  });

  it.each(guestPages)("%s renders BrandMark, not the Meetrao logo directly", (file) => {
    const text = readFileSync(path.join(APP, file), "utf8");
    /* <Logo> and <LogoLink> hard-code our mark. BrandMark falls back to the
       same component, so the only difference is whether a Pro host's logo gets
       a chance to replace it, which is exactly the thing that is easy to
       forget when a page is added. */
    expect(text, `${file} shows the Meetrao mark to a Pro host's guests`).not.toMatch(
      /<Logo(Link)?\s/,
    );
    expect(text).toContain("<BrandMark");
  });

  it.each(guestPages)("%s is wrapped in BrandScope", (file) => {
    const text = readFileSync(path.join(APP, file), "utf8");
    expect(text, `${file} ignores a host's colour`).toContain("<BrandScope");
  });

  it("brands the embed too, which sits on the host's own site", () => {
    expect(read("src/app/embed/[username]/[slug]/page.tsx")).toContain("<BrandScope");
  });
});

describe("branding is gated on the way OUT, not only on the way in", () => {
  const projection = read("convex/publicBooking.ts");

  /* The failure this exists for: a host subscribes, sets a logo, and lets the
     subscription lapse. The rows survive on purpose (coming back should cost
     them nothing) so if the public query did not re-check the plan, they
     would keep a paid feature forever by having set it once. */
  it("checks the plan in the projection, not just in the mutation", () => {
    const fn = projection.slice(projection.indexOf("function publicBrand"));
    const body = fn.slice(0, fn.indexOf("\n}"));
    /* The PREDICATE, not the spelling. This used to assert
       `planOf(p) !== "pro"` and had to change when Business arrived, which is
       the wrong reason for a behavioural test to fail. What matters is that
       the projection asks whether the host pays and returns nothing when they
       do not. */
    expect(body).toContain("isPro(p)");
    expect(body).toContain("return null");
  });

  it("is reached from every public host projection", () => {
    // getHost, getMeetingAvailability and getByReference each hand a host to a
    // guest-facing page. One that forgot would serve an unbranded page from a
    // branded link, or a branded one to a lapsed host.
    const calls = projection.match(/publicBrand\(/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(4); // the definition plus three uses
  });
});

describe("branding is gated on the way IN as well", () => {
  const branding = code("convex/branding.ts");

  it("requires Pro to set a logo or a colour", () => {
    for (const fn of ["generateUploadUrl", "saveLogo"]) {
      const body = branding.slice(branding.indexOf(`export const ${fn}`));
      /* `requirePro(`, with the paren: `requireProfile` contains the bare
         string, which made the matching negative assertion below pass on a
         function that had no gate at all. */
      expect(body.slice(0, body.indexOf("});")), `${fn} is not gated`).toContain("requirePro(");
    }
  });

  it("does NOT require Pro to take branding back down", () => {
    /* A host whose plan lapsed must still be able to clear what they set.
       Gating removal would trap them behind a paywall to undo something. */
    const remove = branding.slice(branding.indexOf("export const removeLogo"));
    expect(remove).toContain("requireProfile"); // still signed-in-only
    expect(remove.slice(0, remove.indexOf("});"))).not.toContain("requirePro(");
  });

  it("checks the uploaded file's size and type in the mutation", () => {
    // The upload URL goes to the browser, so anything can post to it. A check
    // that lives only in the panel is not a check.
    const save = branding.slice(branding.indexOf("export const saveLogo"));
    expect(save).toContain("ctx.db.system.get");
    expect(save).toContain("MAX_LOGO_BYTES");
    expect(save).toContain("LOGO_TYPES");
  });

  it("refuses SVG, which would run a host's script on our origin", () => {
    expect(branding).not.toMatch(/image\/svg/);
  });
});

describe("the two tokens a brand rebinds", () => {
  const css = read("src/app/globals.css");

  it("default to exactly what the product already drew", () => {
    // If these defaults ever drift, every unbranded screen moves at once.
    expect(css).toContain("--on-accent: #ffffff;");
    expect(css).toContain("--accent-ink: var(--accent);");
  });

  it("are exposed as utilities", () => {
    expect(css).toContain("--color-on-accent: var(--on-accent);");
    expect(css).toContain("--color-accent-ink: var(--accent-ink);");
  });
});

describe("nothing on a branded surface hard-codes white on the accent", () => {
  /* The failure: `bg-accent text-white` is invisible the moment a host picks
     yellow. These are the files that render inside a BrandScope. */
  const branded = [
    "src/components/booking/booking-flow.tsx",
    "src/components/ui/button-class.ts",
    "src/components/ui/controls.tsx",
    ...globSync("(public)/**/page.tsx", { cwd: APP }).map((f) => path.join("src/app", f)),
  ];

  it.each(branded)("%s", (file) => {
    for (const line of code(file).split("\n")) {
      if (!line.includes("bg-accent")) continue;
      expect(line, `${file}: a label fixed to white on a host's own colour`).not.toMatch(
        /text-white/,
      );
    }
  });
});

describe("the brand scope introduces no box", () => {
  const brand = code("src/components/booking/brand.tsx");

  it("wraps the page in nothing at all", () => {
    /* The (public) layout centres a column of siblings. A wrapper with a box
       would make the card and footer its children instead of the column's,
       the exact shape of a bug that already shipped once.

       This was a `display: contents` div and is now a bare fragment, which is
       stronger: there is no element to get a box by accident. */
    expect(brand).toContain("<>");
    expect(brand).not.toContain('className="contents"');
  });

  it("rebinds at :root, because the page background is painted by body", () => {
    /* A wrapper inherits its variables DOWN. `html, body { background:
       var(--ground) }` are ancestors of everything a page renders, and the
       cookie banner is mounted by the root layout outside the page entirely,
       so a scoped wrapper left both of them in Meetrao's palette however much
       the host had chosen. */
    expect(brand).toContain(":root{");
    expect(brand).toContain("--ground:");
    expect(brand).toContain("--on-ground:");
  });
});

describe("a branded page keeps none of Meetrao's palette", () => {
  const brand = code("src/components/booking/brand.tsx");

  /* The complaint this exists for: a host set a blue brand and the page still
     showed our warm grey ground, our cream panel and a green cookie button.
     Every neutral the design draws has to be rebound, not just the accent. */
  it.each([
    "--ground",
    "--on-ground",
    "--surface",
    "--fill",
    "--fill-2",
    "--line",
    "--line-soft",
    "--line-strong",
    "--accent",
    "--accent-2",
    "--accent-ink",
    "--on-accent",
    "--accent-soft",
    "--accent-line",
  ])("%s is overridden", (token) => {
    expect(brand, `${token} keeps its Meetrao value on a branded page`).toContain(`${token}:`);
  });
});

describe("the embed stays transparent", () => {
  it("turns off the page background that globals.css paints", () => {
    /* The widget's layout always SAID transparent, but only its own div was,
       `html, body { background: var(--ground) }` still painted the page behind
       it, so every embed carried our beige. Harmless-looking until a host's
       own background filled that space with a deliberate colour on somebody
       else's site. */
    const layout = code("src/app/embed/layout.tsx");
    expect(layout).toContain("html,body{background:transparent}");
  });
});

describe("a host's own logo is larger than ours", () => {
  it("renders at 1.35x, because a square symbol reads smaller than a wordmark", () => {
    const brand = code("src/components/booking/brand.tsx");
    expect(brand).toMatch(/height \* 1\.35/);
  });
});

describe("the booking page shows a host's photograph", () => {
  /* This used to assert the index page, which hand-rolled initials from the
     host's name and never read host.avatarUrl. That page is gone, and the
     meeting page is now the front door, so the assertion follows it rather
     than being deleted with the file it happened to be about. */
  it("uses <Avatar> rather than drawing initials itself", () => {
    const page = read("src/app/(public)/[username]/[slug]/page.tsx");
    expect(page).toContain("hostAvatarUrl={host.avatarUrl}");
  });
});
