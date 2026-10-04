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

});

describe("what an admin may do, which is everything else", () => {
  /* The rule, stated plainly: an admin does everything an owner does except
     delete the company. That includes unmaking another admin, which means two
     admins can each strip the other and whoever clicks first wins.

     That race is real and it is accepted on purpose: an admin is somebody the
     owner chose and can unmake, and a company whose admins cannot tidy up
     after each other needs the owner present for every change. An earlier
     version kept both of these owner-only; this is the deliberate opposite,
     so a future reader does not "fix" it back. */
  it("unmakes another admin", () => {
    const body = fn(COMPANIES, "setRole");
    expect(body).toContain("requireManager(ctx, a.id)");
    expect(body, "demotion is not owner-only").not.toContain('probe.role !== "owner"');
  });

  it("removes another admin", () => {
    const body = fn(COMPANIES, "removeMember");
    expect(body).toContain("requireManager(ctx, a.id)");
    expect(body, "removing an admin is not owner-only").not.toContain('mine !== "owner"');
  });

  it("is drawn that way on the screen too", () => {
    expect(PANEL).toContain("const mayChangeRole = !isOwner && manage;");
    expect(PANEL).toContain("const mayRemove = !isOwner && manage;");
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
  it("shows Delete company to the owner alone", () => {
    expect(PANEL).toContain('{mine === "owner" && canDelete ? (');
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

  /* THE COMPANY'S ADDRESS, never the member's personal one. This used to fall
     back to meetrao.com/<username>/<meeting> when there was no verified
     domain, which showed somebody their own link and called it the company's.
     A company and the people in it are different things with different
     links. */
  it("are the company's, not the host's", () => {
    const body = PANEL.slice(PANEL.indexOf("function linkFor"), PANEL.indexOf("export function CompaniesPanel"));
    expect(body).toContain("companyBookingLink(company, member.handle, meetingSlug)");
    expect(body, "a username here is the personal link wearing a company's name").not.toContain(
      "member.username",
    );
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   Where each control belongs.

   The same panel renders in two places: Personal → Companies, which is the
   list of every company somebody has, and a company's own People tab, which
   is the one they are standing in. The second is not the first with a filter
   on it, and two controls had to move because of that.
   ───────────────────────────────────────────────────────────────────────────── */

describe("the company's own People tab", () => {
  /* A Pro owner's company can only ever hold them, so the list is a heading,
     a count of one, and themselves. What is useful on that screen is the
     reason it is empty. Everything else stays reachable from Personal →
     Companies, which is the same card without the `only` filter. */
  it("is only the pitch when the company can hold one person", () => {
    expect(PANEL).toContain("const soloCompany = Boolean(only && current && current.memberLimit <= 1);");
    expect(PANEL).toContain("{current && soloCompany ? (");
  });

  /* Offering it from inside the company is offering to delete the room you
     are standing in, and leaves the workspace switcher pointing at something
     that no longer exists. */
  it("never offers to delete the company you are standing in", () => {
    expect(PANEL).toContain("canDelete={!only}");
    expect(PANEL).toContain('{mine === "owner" && canDelete ? (');
  });

  /* The gate is the OWNER's cap, not the viewer's plan: a member of a
     Business company must not have the screen collapse because their own
     account is on Free. */
  it("decides from the company's cap, not the viewer's plan", () => {
    expect(PANEL).toContain("current.memberLimit <= 1");
    expect(PANEL, "the viewer's plan decides only whether they may create one").not.toContain(
      "only && isPaid(plan)",
    );
  });
});

describe("the company's own Team tab", () => {
  const SETTINGS = read("src/app/(app)/settings/[[...tab]]/page.tsx");
  const LOADER = read("src/lib/data/teams.ts");
  const PITCH = read("src/components/app/team-pitch.tsx");

  /* A team link is answered by whoever of you is free, so it needs a second
     person to be anything at all. Offering "Create a team" to somebody who
     can never add anyone is the worst version of a locked feature: it works
     right up until it cannot. */
  it("is the pitch when the company can hold one person", () => {
    expect(SETTINGS).toContain("(await soloCompany(context.companyId)) ? (");
    expect(SETTINGS).toContain("<TeamPitch />");
    expect(PITCH).toContain('to="business"');
    expect(PITCH, "a create button is the thing being removed").not.toContain("Create a team");
  });

  /* Personal is not a company and keeps its own team feature. */
  it("leaves Personal alone", () => {
    const fn = LOADER.slice(LOADER.indexOf("export async function soloCompany"));
    expect(fn).toContain("if (!companyId) return false;");
  });

  /* The OWNER's cap, as everywhere else: a member of a Business company must
     not have the screen collapse because their own account is on Free. */
  it("reads the company's cap, not the viewer's plan", () => {
    const fn = LOADER.slice(LOADER.indexOf("export async function soloCompany"));
    expect(fn).toContain("found.member_limit <= 1");
    expect(fn).not.toMatch(/isPaid\(|planOf\(me/);
  });
});

describe("two brandings, not one", () => {
  const TABS = read("src/lib/settings-tabs.ts");
  const LOADER = read("src/lib/data/teams.ts");

  /* A Pro account has its own branding and its own domain on its own links,
     AND a company with its own branding and its own domain. They are
     different things that happen to share a screen, and removing Branding
     from Personal once took the first one away. */
  it("is in both workspaces' tabs", () => {
    const personal = TABS.slice(TABS.indexOf("PERSONAL_TABS"), TABS.indexOf("COMPANY_TABS"));
    const company = TABS.slice(TABS.indexOf("COMPANY_TABS"), TABS.indexOf("export const SETTINGS_TABS"));
    expect(personal, "Personal keeps its own branding").toContain('key: "branding"');
    expect(company, "a company has its own").toContain('key: "branding"');
  });

  /* One loader, two sources. Reading the profile's branding while standing in
     a company would show the wrong brand and save over the wrong one. */
  it("reads whichever workspace is in force", () => {
    const fn = LOADER.slice(LOADER.indexOf("export async function brandingPanelData"));
    expect(fn).toContain("const { companyId } = await activeContext();");
    expect(fn).toContain("if (companyId) {");
    expect(fn).toContain("api.companyBranding.get");
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   The whole matrix, in one place.

   OWNER   everything, including deleting the company.
   ADMIN   everything except deleting the company.
   MEMBER  nothing except their own link on this company.

   Written as a table because that is how it was specified, and because three
   rules spread across eight mutations is how one of them quietly drifts.
   ───────────────────────────────────────────────────────────────────────────── */

describe("the matrix", () => {
  /** The least role each mutation accepts, read off the gate it calls. */
  const GATE: Record<string, "owner" | "admin" | "member"> = {
    rename: "admin",
    addMember: "admin",
    setRole: "admin",
    removeMember: "admin",
    remove: "owner",
  };

  it.each(Object.entries(GATE))("%s is gated at %s", (name, least) => {
    const body = fn(COMPANIES, name);
    const call = least === "owner" ? "requireOwner(ctx, a.id)" : "requireManager(ctx, a.id)";
    expect(body, `${name} should take the ${least} gate`).toContain(call);
  });

  /* Deleting the company is the ONE thing on this list an admin cannot do,
     which is the whole difference between the two roles. */
  it("leaves exactly one thing to the owner alone", () => {
    const ownerOnly = Object.entries(GATE)
      .filter(([, least]) => least === "owner")
      .map(([name]) => name);
    expect(ownerOnly).toEqual(["remove"]);
  });

  /* A member changes their own link and nothing else. `setHandle` is the only
     mutation in the file that accepts one, and only for themselves. */
  it("lets a member change their own link and nothing else", () => {
    expect(fn(COMPANIES, "setHandle")).toContain(
      'requireRole(ctx, a.id, a.userId === me.id ? "member" : "admin")',
    );
    for (const name of Object.keys(GATE)) {
      expect(fn(COMPANIES, name), `${name} must not admit a member`).not.toContain(
        'requireRole(ctx, a.id, "member")',
      );
    }
  });

  /* The company's face is an admin's to set, and is gated on the OWNER's
     plan rather than the caller's wherever it is. */
  it("gives an admin the company's branding and domain", () => {
    for (const source of [BRANDING, DOMAINS]) {
      expect(source).toContain("requireCompanyManager");
      expect(source).toContain('role === "member"');
    }
  });
});
