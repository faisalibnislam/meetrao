import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   Bookings and contacts belong to a company too.

   THE FAILURE THIS PREVENTS is an agency one. Two clients, two companies, one
   contact list: one client's people showing up under the other's heading is
   not a cosmetic bug, it is the thing somebody bought the plan to avoid.

   The rules, and why each is where it is:

   · A BOOKING COPIES ITS MEETING'S COMPANY ONCE, at creation, rather than
     joining on every read. Every bookings screen reads a range by host and
     then needs each row's context, so a join is one extra read per result.
     It also means a booking keeps the company it was made under when the
     meeting is later moved or deleted, which is right: it records what
     happened.

   · A CONTACT IS UNIQUE PER (user, company, email), not per (user, email).
     The same address being a contact of two companies is the point.

   · AN EDIT NEVER MOVES A CONTACT. Checking the clash against the caller's
     current company rather than the row's own would refuse an edit because an
     unrelated client has the same address, and patching the company would
     relocate somebody for fixing a typo while switched elsewhere.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const BOOKINGS = read("convex/bookings.ts");
const CONTACTS = read("convex/contacts.ts");
const EFFECTS = read("convex/lib/effects.ts");
const BACKFILL = read("convex/companiesBackfill.ts");
const BOOKINGS_DATA = read("src/lib/data/bookings.ts");
const CONTACTS_DATA = read("src/lib/data/contacts.ts");

describe("a booking knows its company", () => {
  it("copies it from the meeting at creation", () => {
    expect(BOOKINGS).toContain("company_id: meetingType?.company_id ?? null,");
  });

  it("is stored rather than joined on read", () => {
    const fn = BOOKINGS.slice(BOOKINGS.indexOf("export const listForScreen"));
    expect(fn).toContain("(b.company_id ?? null) === companyId");
    expect(fn, "the list must not look up a meeting per booking").not.toContain('query("meeting_types")');
  });

  it("hands the same company to the contact it creates", () => {
    expect(BOOKINGS).toContain("companyId: booking.company_id ?? null,");
  });
});

describe("a contact belongs to one list", () => {
  /* The index change is the rule. Leaving by_user_email in a write path
     would silently keep the old uniqueness for that path alone. */
  it("is unique per company, everywhere it is written", () => {
    for (const [name, source] of [
      ["contacts.ts", CONTACTS],
      ["effects.ts", EFFECTS],
    ] as const) {
      expect(source, `${name} still uses the old uniqueness`).not.toContain("by_user_email");
      expect(source).toContain("by_user_company_email");
    }
  });

  it("refuses a company the caller is not in", () => {
    const fn = CONTACTS.slice(
      CONTACTS.indexOf("async function companyForContact"),
      CONTACTS.indexOf("export const listOwn"),
    );
    expect(fn).toContain('query("company_members")');
    expect(fn).toContain("That is not one of your companies.");
  });

  it("checks that on every write path", () => {
    for (const name of ["create", "save", "importChunk"]) {
      const at = CONTACTS.indexOf(`export const ${name} = mutation`);
      expect(at, `no such mutation: ${name}`).toBeGreaterThan(-1);
      const next = CONTACTS.indexOf("export const ", at + 10);
      const fn = CONTACTS.slice(at, next === -1 ? CONTACTS.length : next);
      expect(fn, `${name} does not validate the company`).toContain("companyForContact(ctx, me, a.companyId)");
    }
  });

  /* Editing a contact must not relocate it. The clash check reads the row's
     own company, not the caller's current one. */
  it("checks an edit against the list it is already in", () => {
    expect(CONTACTS).toContain('.eq("company_id", c.company_id ?? null)');
  });
});

describe("both screens read the context in force", () => {
  it("bookings", () => {
    expect(BOOKINGS_DATA).toContain("const context = await activeContext();");
    expect(BOOKINGS_DATA).toContain("companyId: context.companyId,");
  });

  it("contacts", () => {
    expect(CONTACTS_DATA).toContain("const context = await activeContext();");
    expect(CONTACTS_DATA).toContain("companyId: context.companyId");
  });
});

describe("the backfill", () => {
  it("gives a booking its meeting's company", () => {
    const fn = BACKFILL.slice(BACKFILL.indexOf("export const backfillWork"));
    expect(fn).toContain("meeting?.company_id ?? null");
  });

  /* Somebody who has booked both a personal meeting and a company one is left
     alone. Moving them would take them out of one list to put them in
     another, and a contact quietly leaving a list is worse than one that
     needs filing by hand. */
  it("leaves a contact alone when their bookings disagree", () => {
    const fn = BACKFILL.slice(BACKFILL.indexOf("export const backfillWork"));
    expect(fn).toContain("if (seen.size !== 1) continue;");
  });

  it("never re-files something already filed", () => {
    const fn = BACKFILL.slice(BACKFILL.indexOf("export const backfillWork"));
    expect(fn).toContain("if (b.company_id)");
    expect(fn).toContain("if (c.company_id) continue;");
  });

  it("is a dry run unless told otherwise", () => {
    const fn = BACKFILL.slice(BACKFILL.indexOf("export const backfillWork"));
    expect(fn).toContain("const dryRun = a.dryRun !== false;");
    const guards = [...fn.matchAll(/if \(!dryRun\)/g)];
    const writes = [...fn.matchAll(/ctx\.db\.patch\(/g)];
    expect(writes.length).toBeGreaterThan(1);
    for (const w of writes) {
      expect(guards.some((g) => (g.index ?? -1) < (w.index ?? -1))).toBe(true);
    }
  });
});
