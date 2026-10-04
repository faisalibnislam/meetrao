import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { LIMITS, limitsFor } from "@/convex/lib/limits";
import { BUSINESS_LIMITS } from "@/lib/pricing";

/* ─────────────────────────────────────────────────────────────────────────────
   Companies, and the rules that are not obvious from reading one function.

   The three that matter, and why each is here rather than trusted:

   1. THE OWNER'S PLAN DECIDES, NOT THE CALLER'S. A member of a Business
      company is usually on Free. Every entitlement question has to resolve the
      owner, and the one place that is easy to get wrong is `addMember`, where
      `me` is right there and the owner is a lookup away. An admin acting on
      somebody else's company must not be able to exceed what that owner pays
      for.

   2. THE CAPS ARE THE GATE. Free's company limit is zero, which is what
      refuses a free account rather than a separate plan check that could drift
      away from the number.

   3. NOTHING IS DELETED WHEN A PLAN LAPSES. Rows survive so that returning
      costs nothing, which is exactly why reads gate and writes do not have to.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const COMPANIES = read("convex/companies.ts");

describe("the plan limits", () => {
  it("covers every plan", () => {
    // Guards the guard: a plan missing from LIMITS would throw at runtime in
    // limitsFor, and an empty table would pass every assertion below.
    expect(Object.keys(LIMITS).sort()).toEqual(["business", "free", "pro"]);
  });

  it("gives Free nothing to own", () => {
    expect(limitsFor("free").companies).toBe(0);
    expect(limitsFor("free").membersPerCompany).toBe(0);
  });

  /* A Pro company is a personal domain with branding on it, which is what Pro
     always was. Letting it hold a second person would sell the Business
     feature at the Pro price. */
  it("gives Pro one company holding one person", () => {
    expect(limitsFor("pro").companies).toBe(1);
    expect(limitsFor("pro").membersPerCompany).toBe(1);
  });

  it("gives Business strictly more than Pro, on both axes", () => {
    expect(limitsFor("business").companies).toBeGreaterThan(limitsFor("pro").companies);
    expect(limitsFor("business").membersPerCompany).toBeGreaterThan(limitsFor("pro").membersPerCompany);
  });

  /* The pricing page prints these. If it ever stops reading them from here,
     the number customers see and the number enforced start drifting the first
     time either moves. */
  it("is the same table the pricing page advertises", () => {
    expect(BUSINESS_LIMITS).toBe(LIMITS.business);
  });

  it("is not re-typed anywhere in the pricing copy", () => {
    const pricing = read("src/lib/pricing.ts");
    expect(pricing).toContain("PLAN_LIMITS.business");
    expect(pricing).not.toMatch(/companies:\s*\d+/);
  });
});

describe("who decides what a company may do", () => {
  /* The defect this exists for: `addMember` has `me` in hand and the owner one
     lookup away, so reaching for `me` is the natural mistake. It would let an
     admin, or any future caller that is not the owner, add people beyond what
     the owner pays for. */
  it("resolves the OWNER when adding a member, never the caller", () => {
    const fn = COMPANIES.slice(COMPANIES.indexOf("export const addMember"), COMPANIES.indexOf("export const setHandle"));
    expect(fn).toContain("ownerOf(ctx, company)");
    expect(fn).toContain("limitsFor(planOf(owner))");
    expect(fn, "addMember must not read the caller's plan").not.toContain("planOf(me)");
  });

  /* `before` rather than two indexOf comparisons. An absent needle gives -1,
     which is less than any real position, so the naive version passed when the
     check was deleted outright. That is the exact mutation it exists to catch. */
  function before(haystack: string, first: string, second: string) {
    const a = haystack.indexOf(first);
    const b = haystack.indexOf(second);
    expect(a, `missing: ${first}`).toBeGreaterThan(-1);
    expect(b, `missing: ${second}`).toBeGreaterThan(-1);
    expect(a, `${first} must come before ${second}`).toBeLessThan(b);
  }

  it("checks the member cap before inserting", () => {
    const fn = COMPANIES.slice(COMPANIES.indexOf("export const addMember"), COMPANIES.indexOf("export const setHandle"));
    before(fn, "existing.length >= limit", 'ctx.db.insert("company_members"');
  });

  it("checks the company cap before inserting", () => {
    const fn = COMPANIES.slice(COMPANIES.indexOf("export const create"), COMPANIES.indexOf("export const rename"));
    before(fn, "owned.length >= limits.companies", 'ctx.db.insert("companies"');
  });

  /* Free's limit is zero, so the cap refuses a free account on its own. A
     separate isPro check here would be a second rule to keep in step. */
  it("gates creation on the cap rather than on a plan name", () => {
    const fn = COMPANIES.slice(COMPANIES.indexOf("export const create"), COMPANIES.indexOf("export const rename"));
    expect(fn).toContain("limits.companies < 1");
    expect(fn, "create must not name a plan to decide").not.toContain("isPro(");
  });
});

describe("the shape of a company", () => {
  /* Everything that renders a company iterates its members. An owner who is
     not one would be missing from their own domain. */
  it("makes the owner a member on creation", () => {
    const fn = COMPANIES.slice(COMPANIES.indexOf("export const create"), COMPANIES.indexOf("export const rename"));
    expect(fn).toContain('role: "owner"');
    expect(fn).toContain('ctx.db.insert("company_members"');
  });

  it("will not remove the owner", () => {
    const fn = COMPANIES.slice(COMPANIES.indexOf("export const removeMember"), COMPANIES.indexOf("export const remove ="));
    expect(fn).toContain('row.role === "owner"');
  });

  /* A guest reads meetrao.com/<anything> as one namespace, and so does a
     search engine. A company that could take a host's name would shadow them. */
  it("checks hosts and teams before taking a slug", () => {
    const fn = COMPANIES.slice(COMPANIES.indexOf("async function slugIsFree"), COMPANIES.indexOf("/* ── reading"));
    expect(fn).toContain("by_username_lower");
    expect(fn).toContain("by_slug_lower");
    expect(fn).toContain('query("teams")');
  });

  /* The handle is a per-company name, which is the whole reason it exists:
     usernames are global and first come first served, so a company cannot be
     promised "sarah". Two people sharing one inside a company would make
     meet.acme.com/sarah ambiguous. */
  it("keeps handles unique within a company", () => {
    expect(COMPANIES).toContain("That handle is taken in this company.");
    const add = COMPANIES.slice(COMPANIES.indexOf("export const addMember"), COMPANIES.indexOf("export const setHandle"));
    const set = COMPANIES.slice(COMPANIES.indexOf("export const setHandle"), COMPANIES.indexOf("export const removeMember"));
    expect(add).toContain("m.handle_lower === handle");
    expect(set).toContain("m.handle_lower === handle");
  });

  it("stores a lowercased handle beside the typed one", () => {
    expect(COMPANIES).toContain("handle_lower: handle");
  });
});

describe("a suspended host", () => {
  /* Suspension has to hold on a company domain exactly as it does on
     meetrao.com. Filtering in membersOf means every caller gets it without
     having to remember. */
  it("is dropped from a company's member list", () => {
    const fn = COMPANIES.slice(COMPANIES.indexOf("export async function membersOf"), COMPANIES.indexOf("/** The owner's profile"));
    expect(fn).toContain("profile.is_suspended");
  });
});
