import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   Three states for the mark at the top of a booking page, not two.

   A host used to have a logo or not have one, and not having one meant ours.
   There is now a third state: no mark at all. It is stored as its own field
   rather than inferred, because "I uploaded nothing" and "I want nothing" are
   different answers and a host who turns the mark off and later uploads a
   logo must not have their choice overwritten by the upload.

   The rules that are not local to one file:

   1. ONE DIRECTION IS GATED. Turning the mark off is the paid thing. Turning
      it back ON is never gated, or a host whose plan lapses is stuck with a
      page that has nothing on it and no way to put our mark back, which is
      worse for them and for us than the free page they started with.

   2. HIDDEN COUNTS AS HAVING A BRAND. The public projection returns null when
      a host has set nothing, and a null brand makes the page fall back to
      ours. Somebody who only turned the mark off and set no colours has set
      something, so `hidden` has to be in that test or the page they asked to
      be bare shows our logo again.

   3. HIDDEN WINS OVER A LOGO, in that order. Somebody who uploaded a logo and
      then turned the mark off asked for a bare page, not for their logo back.

   4. A FREE HOST GETS AN ANSWER, not a dead control. The switch is not
      disabled for them: it opens the upgrade dialog, which is the only version
      of this control that can sell anything.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const PROFILE = read("convex/branding.ts");
const COMPANY = read("convex/companyBranding.ts");
const PUBLIC = read("convex/publicBooking.ts");
const MARK = read("src/components/booking/brand.tsx");
const PANEL = read("src/components/app/branding-panel.tsx");

/** The body of one exported mutation or query, up to the next export. */
function fn(source: string, name: string): string {
  const at = source.indexOf(`export const ${name} =`);
  expect(at, `no such export: ${name}`).toBeGreaterThan(-1);
  const next = source.indexOf("export const ", at + 10);
  return source.slice(at, next === -1 ? source.length : next);
}

/** Asserts both strings are present, then that `first` comes before `second`. */
function before(body: string, first: string, second: string, why: string) {
  const a = body.indexOf(first);
  const b = body.indexOf(second);
  expect(a, `missing: ${first}`).toBeGreaterThan(-1);
  expect(b, `missing: ${second}`).toBeGreaterThan(-1);
  expect(a, why).toBeLessThan(b);
}

describe("only turning the mark off is gated", () => {
  it("gates it on the host's plan", () => {
    const body = fn(PROFILE, "setLogoHidden");
    expect(body).toMatch(/if \(a\.hidden(\)| &&)/);
    expect(body).toContain("requirePro(me");
  });

  /* The owner's plan, not the caller's: a member of a Business company is
     usually on Free, and an admin acting on somebody else's company may be on
     anything at all. */
  it("gates a company's on the owner's plan, not the caller's", () => {
    const body = fn(COMPANY, "setLogoHidden");
    expect(body).toContain("isPro(owner)");
    expect(body, "must not gate on the caller").not.toMatch(/isPro\(me\)|requirePro\(me/);
  });

  /* The direction that has to keep working forever. A gate on both would trap
     a lapsed host on a page with nothing at the top of it. */
  it.each([
    ["a profile", PROFILE],
    ["a company", COMPANY],
  ])("never gates turning it back on, for %s", (_what, source) => {
    const body = fn(source, "setLogoHidden");
    before(
      body,
      "a.hidden",
      "ctx.db.patch",
      "the gate must be inside a check on a.hidden, so turning it on skips it",
    );
    /* `if (a.hidden)` or `if (a.hidden && ...)`. What must not appear is a
       gate that runs whatever the argument is. */
    expect(body).toMatch(/if \(a\.hidden(\)| &&)/);
  });
});

describe("hidden is a brand", () => {
  /* Without this the page falls back to ours, which is the exact opposite of
     what the host asked for. */
  it("counts toward having one, for a profile", () => {
    const body = PUBLIC.slice(PUBLIC.indexOf("function publicBrand"), PUBLIC.indexOf("export const getHost"));
    expect(body).toContain("brand_logo_hidden ?? false");
    expect(body).toContain("logo || color || background || hidden");
  });

  it("counts toward having one, for a company", () => {
    const at = PUBLIC.indexOf("company.brand_logo_hidden");
    expect(at, "a company's brand must read the field too").toBeGreaterThan(-1);
    const body = PUBLIC.slice(at, at + 600);
    expect(body).toContain("|| hidden");
  });

  it("is carried all the way to the page", () => {
    expect(read("src/lib/data/public-booking.ts")).toContain("logoHidden: row.brand.logo_hidden ?? false");
    expect(read("src/lib/public-origin.ts")).toContain("logoHidden: row.brand.logo_hidden");
  });
});

describe("the mark itself", () => {
  /* Order, not presence. Checking the logo first would show the logo of
     somebody who has since asked for a bare page. */
  it("checks hidden before it checks for a logo", () => {
    const body = MARK.slice(MARK.indexOf("function BrandMark"));
    before(
      body,
      "brand?.logoHidden",
      "brand?.logoUrl",
      "hidden must win over having a logo",
    );
    expect(body).toContain("if (brand?.logoHidden) return null;");
  });
});

describe("the switch answers a free host", () => {
  /* A disabled switch says the feature is not for you. One that opens the
     dialog says what it costs, which is the only version that sells. */
  it("opens the upgrade dialog instead of calling the mutation", () => {
    const at = PANEL.indexOf("<Switch");
    expect(at, "the logo section must have a switch").toBeGreaterThan(-1);
    const body = PANEL.slice(at, PANEL.indexOf("</span>", at));
    expect(body).toContain("if (wantHidden && !pro)");
    expect(body).toContain("setAskUpgrade(true)");
    before(body, "setAskUpgrade(true)", "setLogoHidden(", "the dialog must replace the call, not follow it");
    expect(body, "the switch must not be disabled for a free host").not.toContain("disabled={!pro");
  });

  /* Turning it on is free, so the dialog must only appear in one direction. */
  it("asks for nothing when turning the mark back on", () => {
    expect(PANEL).toContain("const wantHidden = !next;");
    expect(PANEL).toContain("if (wantHidden && !pro)");
  });

  /* A tile still showing our mark while the page shows nothing would make the
     switch look broken. */
  it("shows all three states in the tile and the preview", () => {
    expect(PANEL).toContain('<span className="text-[11.5px] text-ink-3">No mark</span>');
    expect(PANEL).toContain("logoHidden={hidden}");
    expect(PANEL).toContain("{logoHidden ? (");
  });
});
