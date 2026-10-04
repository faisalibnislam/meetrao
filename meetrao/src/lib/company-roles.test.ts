import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   Three roles in a company, and the line between them.

   The line is the size of the mistake each role can make.

   MEMBER  their own link on the domain, and the list of who else is here.
   ADMIN   the company's face and its people: branding, the domain, adding
           somebody, giving a member the same powers they have.
   OWNER   the two things nobody should be able to do to somebody else's
           company, which are deleting it and taking an admin's powers away.

   WHY DEMOTION IS NOT AN ADMIN'S TO MAKE. Two admins who can each strip the
   other is a race, and whoever clicks first ends up holding a company that is
   not theirs. Promotion is additive and safe to share; demotion is not.
   Removing an admin is the same act under another name, so it sits behind the
   same gate: without that, an admin removes the other admins and is alone
   with somebody else's company.

   WHOSE PLAN STILL DECIDES. Admitting admins changes WHO may act. It must not
   change WHAT may be set, which is still the owner's plan, because the owner
   is who pays. An admin on Free acting on a Business company must not be able
   to strip its branding, and a Business admin must not be able to set
   branding on a Free account's company.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const COMPANIES = read("convex/companies.ts");
const BRANDING = read("convex/companyBranding.ts");
const DOMAINS = read("convex/companyDomains.ts");
const PANEL = read("src/components/app/companies-panel.tsx");
const SCHEMA = read("convex/schema.ts");

/** The body of one exported mutation or query, up to the next export. */
function fn(source: string, name: string): string {
  const at = source.indexOf(`export const ${name} =`);
  expect(at, `no such export: ${name}`).toBeGreaterThan(-1);
  const next = source.indexOf("export const ", at + 10);
  return source.slice(at, next === -1 ? source.length : next);
}

describe("the role itself", () => {
  it("has three values, not two", () => {
    expect(SCHEMA).toContain('v.union(v.literal("owner"), v.literal("admin"), v.literal("member"))');
  });

  /* The membership row says "owner" too, but the company is the record of who
     owns it. A row that disagreed would be the more dangerous of the two to
     believe, so it is not the one that is read first. */
  it("is read from the company first, then the membership row", () => {
    const body = COMPANIES.slice(
      COMPANIES.indexOf("export async function roleIn"),
      COMPANIES.indexOf("async function requireRole"),
    );
    const owner = body.indexOf("company.owner_id === me.id");
    const row = body.indexOf("memberRow(ctx, company.id, me.id)");
    expect(owner, "owner_id must be checked").toBeGreaterThan(-1);
    expect(row, "the row is the fallback").toBeGreaterThan(-1);
    expect(owner, "the company, not the row, is the record of who owns it").toBeLessThan(row);
  });

  /* Somebody outside this company should not learn from the error that it
     exists. A refusal and a not-found read differently to anybody probing
     ids. */
  it("says not-found rather than refused to somebody outside the company", () => {
    const body = COMPANIES.slice(
      COMPANIES.indexOf("async function requireRole"),
      COMPANIES.indexOf("async function requireManager"),
    );
    expect(body).toContain('if (!role) AuthError("No such company.", "NOT_FOUND");');
  });
});

describe("what an admin may do", () => {
  it.each(["rename", "addMember"])("%s takes the manager gate", (name) => {
    expect(fn(COMPANIES, name)).toContain("requireManager(ctx, a.id)");
  });

  /* Branding and the domain are the company's face, which is the thing an
     admin was given to look after. */
  /* Named one by one rather than checked in bulk. `setLogoHidden` arrived on
     another branch while this one renamed the guard, rebased cleanly, and
     kept calling a function that no longer existed. A test that only asked
     whether the file mentions the manager gate would have been happy. */
  it.each(["generateUploadUrl", "saveImage", "setColor", "setBackground", "setLogoHidden"])(
    "companyBranding.%s takes the manager gate",
    (name) => {
      const at = BRANDING.indexOf(`export const ${name} =`);
      expect(at, `no such export: ${name}`).toBeGreaterThan(-1);
      const next = BRANDING.indexOf("export const ", at + 10);
      const body = BRANDING.slice(at, next === -1 ? BRANDING.length : next);
      expect(body).toContain("requireCompanyManager(ctx,");
    },
  );

  it("branding and the domain admit an admin", () => {
    for (const [what, source] of [
      ["branding", BRANDING],
      ["domains", DOMAINS],
    ] as const) {
      expect(source, `${what} must not still gate on the owner alone`).toContain("requireCompanyManager");
      expect(source).toContain("roleIn(ctx, company, me)");
      expect(source, `${what} must still refuse a plain member`).toContain('role === "member"');
    }
  });

  /* WHO may act changed; WHAT may be set did not. The gate is still the
     owner's plan, because the owner is who pays. */
  it("still reads the owner's plan, not the caller's", () => {
    for (const source of [BRANDING, DOMAINS]) {
      expect(source).toContain("company.owner_id === me.id ? me : await ownerOf(ctx, company)");
      expect(source).not.toMatch(/isPro\(me\)|requirePro\(me/);
    }
  });
});

describe("what only the owner may do", () => {
  it("deleting the company", () => {
    expect(fn(COMPANIES, "remove")).toContain("requireOwner(ctx, a.id)");
  });

  /* The race this prevents: two admins who can each strip the other, where
     whoever clicks first is alone with a company that is not theirs. */
  it("taking an admin's powers away", () => {
    const body = fn(COMPANIES, "setRole");
    expect(body).toContain('if (row.role === "admin" && probe.role !== "owner")');
    expect(body).toContain("FORBIDDEN");
  });

  /* Removing an admin IS demoting one, under another name. A gate on the
     first without the second is no gate at all. */
  it("removing an admin, which is the same act under another name", () => {
    const body = fn(COMPANIES, "removeMember");
    expect(body).toContain('if (row.role === "admin" && mine !== "owner")');
    expect(body).toContain("FORBIDDEN");
  });
});

describe("the owner is not a role anybody can assign", () => {
  it("is not in the argument union", () => {
    const body = fn(COMPANIES, "setRole");
    expect(body).toContain('v.union(v.literal("admin"), v.literal("member"))');
    expect(body, "ownership moves by transfer, not by assignment").not.toContain('v.literal("owner")');
  });

  it("cannot be re-roled", () => {
    expect(fn(COMPANIES, "setRole")).toContain('if (row.role === "owner") fail("The owner\'s role cannot be changed.");');
  });

  /* A company with a domain and nobody on it would keep answering and show
     no one. */
  it("cannot be removed", () => {
    expect(fn(COMPANIES, "removeMember")).toContain('if (row.role === "owner") fail(');
  });
});

describe("a person's own link is their own", () => {
  /* Needing an admin to fix a typo in the one part of this that is nobody
     else's business was a rule with nothing behind it. */
  it("anybody may set their own handle, a manager anybody's", () => {
    const body = fn(COMPANIES, "setHandle");
    expect(body).toContain('requireRole(ctx, a.id, a.userId === me.id ? "member" : "admin")');
  });
});

describe("the People screen draws what the mutations allow", () => {
  /* A control that is drawn when the mutation would refuse is a worse lie
     than a control that is missing, so these two predicates have to match the
     rules above exactly. */
  it("offers a role change under the same rule the mutation enforces", () => {
    expect(PANEL).toContain(
      'const mayChangeRole = !isOwner && (viewerRole === "owner" || (manage && member.role === "member"));',
    );
  });

  it("offers removal under the same rule", () => {
    expect(PANEL).toContain(
      'const mayRemove = !isOwner && (viewerRole === "owner" || (manage && member.role === "member"));',
    );
  });

  it("shows Delete company to the owner alone", () => {
    expect(PANEL).toContain('{mine === "owner" ? (');
    expect(PANEL).toContain("Delete company");
  });

  /* The viewer's role, not whether they happen to own it. `isOwner` answered
     one third of the question once admins existed. */
  it("draws from the viewer's role in this company", () => {
    expect(PANEL).toContain("const mine = company.myRole;");
    expect(PANEL).toContain("const manage = canManage(mine);");
  });
});

describe("the links on the screen", () => {
  /* A handle says what the first segment of a URL will be and nothing about
     whether anything answers at the end of it. A company could have a domain
     serving nothing but 404s with no sign of it here. */
  it("are listed per person, scoped to this company", () => {
    const body = fn(COMPANIES, "members");
    expect(body).toContain("(m.company_id ?? null) === company.id");
    expect(body, "a personal meeting is not published on this domain").toContain("company.id");
  });

  /* An unverified domain does not resolve yet, so showing it would be showing
     an address that 404s. */
  it("fall back to meetrao.com until the domain is verified", () => {
    const body = PANEL.slice(PANEL.indexOf("function linkFor"));
    expect(body).toContain("company.domain && company.domainVerified");
    expect(body).toContain("${siteHost}/${member.username}/${meetingSlug}");
  });
});
