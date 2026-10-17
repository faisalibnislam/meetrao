import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { clashingCompany, companyNameKey, duplicateNameMessage } from "@/convex/lib/companyNames";

/* ─────────────────────────────────────────────────────────────────────────────
   One owner cannot hold two companies with the same name.

   Found with an owner holding "Harbour Studio" at /harbour-studio and "Harbour
   Studio" at /acme: the workspace switcher showed two identical rows and
   nothing on either said which was which. The slug was always unique; the
   name was never checked. The rule lives in convex/lib/companyNames.ts and
   both mutations that write a name have to ask it.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const COMPANIES = readFileSync(path.join(ROOT, "convex/companies.ts"), "utf8");

const fn = (start: string, end: string) => COMPANIES.slice(COMPANIES.indexOf(start), COMPANIES.indexOf(end));

const owned = [
  { id: "a", name: "Harbour Studio", slug: "harbour-studio" },
  { id: "b", name: "Northwind", slug: "northwind" },
];

describe("what counts as the same name", () => {
  it("ignores case, surrounding space and doubled spaces", () => {
    expect(companyNameKey("  Harbour  Studio ")).toBe("harbour studio");
    expect(clashingCompany("harbour studio", owned)?.id).toBe("a");
    expect(clashingCompany(" HARBOUR   STUDIO ", owned)?.id).toBe("a");
  });

  it("lets a different name through", () => {
    expect(clashingCompany("Harbour Studio Two", owned)).toBeNull();
    expect(clashingCompany("Acme", owned)).toBeNull();
  });

  /* A rename that keeps the name and edits only the link, or fixes the
     capitalisation, must not be refused for clashing with itself. */
  it("does not count the company being renamed", () => {
    expect(clashingCompany("Harbour Studio", owned, "a")).toBeNull();
    expect(clashingCompany("harbour studio", owned, "a")).toBeNull();
    expect(clashingCompany("Northwind", owned, "a")?.id).toBe("b");
  });

  it("treats an empty name as no clash, leaving that refusal to its own check", () => {
    expect(clashingCompany("   ", owned)).toBeNull();
  });

  it("names the company already using it, by name and link", () => {
    const text = duplicateNameMessage(owned[0]);
    expect(text).toContain("Harbour Studio");
    expect(text).toContain("/harbour-studio");
  });
});

describe("the mutations that write a name ask the rule", () => {
  it("create refuses a name its owner already uses, before inserting", () => {
    const create = fn("export const create", "export const rename");
    const check = create.indexOf("clashingCompany(name, owned)");
    expect(check, "create must check the owner's other companies").toBeGreaterThan(-1);
    expect(check).toBeLessThan(create.indexOf('ctx.db.insert("companies"'));
    expect(create).toContain('"DUPLICATE_NAME"');
  });

  /* The OWNER's siblings, not the caller's: an admin renaming somebody else's
     company is the case that would slip past a check against `me`. */
  it("rename checks the owner's other companies, excluding itself, before patching", () => {
    const rename = fn("export const rename", "export const addMember");
    expect(rename).toContain('q.eq("owner_id", company.owner_id)');
    const check = rename.indexOf("clashingCompany(name, siblings, company.id)");
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(rename.indexOf("ctx.db.patch(company._id"));
    expect(rename).toContain('"DUPLICATE_NAME"');
  });
});
