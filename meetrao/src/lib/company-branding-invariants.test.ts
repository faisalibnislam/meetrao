import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   A company's brand and domain, and the two rules that are not local.

   1. THE OWNER'S PLAN DECIDES. A member of a Business company is usually on
      Free, and an admin acting on somebody else's company may be on anything
      at all. Every gate in these two files has to resolve the owner. Reading
      `me` would let an admin on Free strip a paying customer's branding, or
      let a Business admin set branding on a Free account's company.

   2. ONE HOLDER PER DOMAIN, ACROSS TWO TABLES. Until the migration has run a
      hostname may be held by a profile or by a company. A claim that checks
      only its own table lets a new claim shadow a live customer's domain,
      which takes a booking page down rather than merely refusing somebody.

   The gate-on-the-way-out rule is tested in branding-invariants.test.ts, which
   covers the projection both kinds of brand are served through.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const BRANDING = read("convex/companyBranding.ts");
const DOMAINS = read("convex/companyDomains.ts");
const PROFILE_DOMAINS = read("convex/domains.ts");

/** The body of one exported mutation or query, up to the next export. */
function fn(source: string, name: string): string {
  const at = source.indexOf(`export const ${name} =`);
  expect(at, `no such export: ${name}`).toBeGreaterThan(-1);
  const next = source.indexOf("export const ", at + 10);
  return source.slice(at, next === -1 ? source.length : next);
}

/* saveLogo and removeLogo became saveImage and removeImage when the company
   avatar arrived: the two pictures do different jobs and every rule around
   storing them is identical, so one code path takes a `kind`. */
const GATED_BRANDING = ["generateUploadUrl", "saveImage", "setColor", "setBackground"];

describe("a company's brand is gated on its owner", () => {
  it.each(GATED_BRANDING)("%s resolves the owner, not the caller", (name) => {
    const body = fn(BRANDING, name);
    expect(body).toContain("isPro(owner)");
    expect(body, `${name} must not gate on the caller`).not.toMatch(/isPro\(me\)|requirePro\(me/);
  });

  /* requireCompanyOwner is where the owner is resolved once for everything
     above. If it ever returns the caller as the owner, all four gates above
     quietly start asking the wrong question while still mentioning `owner`. */
  it("resolves the owner from the company, not from the session", () => {
    const helper = BRANDING.slice(
      BRANDING.indexOf("async function requireCompanyOwner"),
      BRANDING.indexOf("async function readable"),
    );
    expect(helper).toContain("company.owner_id === me.id ? me : await ownerOf(ctx, company)");
  });

  /* Clearing is never gated. Somebody whose plan lapsed must still be able to
     take their own logo down, and a gate here would trap it up forever. */
  it("never gates taking a picture down", () => {
    const body = fn(BRANDING, "removeImage");
    expect(body).not.toContain("isPro(");
  });

  it("never gates clearing a colour", () => {
    for (const name of ["setColor", "setBackground"]) {
      const body = fn(BRANDING, name);
      const clear = body.slice(0, body.indexOf("isPro(owner)"));
      expect(clear, `${name} must clear before it gates`).toContain('trim() === ""');
    }
  });

  /* An SVG is a document: it can carry script, and one served from our storage
     would run on our origin. The raster formats cannot. */
  it("refuses SVG uploads", () => {
    expect(BRANDING).toContain('["image/png", "image/jpeg", "image/webp"]');
    expect(BRANDING).not.toContain("image/svg");
  });

  /* The upload URL goes to the browser and anything can post to it, so the
     file exists by the time this runs. A refused one is deleted rather than
     left behind to be paid for. */
  it("deletes a refused upload", () => {
    const body = fn(BRANDING, "saveImage");
    expect((body.match(/ctx\.storage\.delete/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("replaces the stored file only after the row points at the new one", () => {
    const body = fn(BRANDING, "saveImage");
    const patch = body.indexOf("ctx.db.patch");
    const deleteOld = body.indexOf("previous && previous !== a.storageId");
    expect(patch).toBeGreaterThan(-1);
    expect(deleteOld).toBeGreaterThan(-1);
    expect(patch, "a delete that runs first leaves a row pointing at nothing").toBeLessThan(deleteOld);
  });
});

describe("a company's domain", () => {
  it("is gated on the owner's plan", () => {
    const body = fn(DOMAINS, "claim");
    expect(body).toContain("isPro(owner)");
    expect(body).not.toMatch(/isPro\(me\)|requirePro\(me/);
  });

  /* The one failure here that takes a page down rather than refusing
     somebody: a claim that checks only companies can shadow a profile that
     still holds the hostname. */
  it("refuses a hostname held in EITHER table", () => {
    const helper = DOMAINS.slice(DOMAINS.indexOf("async function heldByAnotherHolder"));
    const body = helper.slice(0, helper.indexOf("export const"));
    expect(body).toContain('query("profiles")');
    expect(body).toContain('query("companies")');
  });

  it("is checked symmetrically from the profile side", () => {
    const body = fn(PROFILE_DOMAINS, "claim");
    expect(body).toContain('query("companies")');
    expect(body).toContain("by_custom_domain");
  });

  /* Claiming is not proving. A row that arrived verified would resolve before
     any DNS record existed. */
  it("never sets verified on a claim", () => {
    const body = fn(DOMAINS, "claim");
    expect(body).toContain("custom_domain_verified_at: null");
  });

  /* A verification result for a hostname somebody has since changed must not
     flip the flag on whatever is there now. */
  it("verifies only the domain the company currently claims", () => {
    const body = fn(DOMAINS, "markVerified");
    expect(body).toContain("company.custom_domain !== normalise(a.domain)");
  });

  it("never gates releasing one", () => {
    const body = fn(DOMAINS, "release");
    expect(body).not.toContain("isPro(");
  });

  it("refuses our own hostnames", () => {
    expect(fn(DOMAINS, "claim")).toContain('endsWith("meetrao.com")');
  });
});
