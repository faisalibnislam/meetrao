import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   The one step that touches live paying customers.

   Everything else in the companies work can be wrong and fixed in the next
   deploy. This one edits rows that are serving somebody's booking page, so
   the three properties that make it survivable are asserted rather than
   remembered:

   · DRY RUN BY DEFAULT. An argument that has to be passed to make it write is
     the difference between a mistyped command and an incident.
   · IT COPIES, IT DOES NOT MOVE. The profile columns keep serving every
     public page until step 5. That is what makes it reversible: delete the
     companies and the product is back where it was.
   · IT NEVER OVERWRITES. A field the company already carries is left alone,
     so a second run is a no-op and a half-finished one can just be re-run.

   AND THE TRAP IT CLOSES. Two rows pointing at one stored file means
   `branding.removeLogo` deletes a file the company's page is serving: the old
   screen's Remove button would silently break the new page. The profile gives
   up `brand_logo_storage_id` once the company holds it, which is the only
   thing this migration takes away.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const SOURCE = readFileSync(path.join(ROOT, "convex/companiesBackfill.ts"), "utf8");
const BRANDING = readFileSync(path.join(ROOT, "convex/branding.ts"), "utf8");

describe("the backfill is safe to get wrong", () => {
  /* `a.dryRun !== false` rather than `a.dryRun ?? true`: both default to a dry
     run, but this one also treats an omitted argument and a mistyped one the
     same way. Only an explicit false writes. */
  it("writes nothing unless explicitly told to", () => {
    expect(SOURCE).toContain("const dryRun = a.dryRun !== false;");
  });

  it("guards every write with it", () => {
    const writes = [...SOURCE.matchAll(/await ctx\.db\.(insert|patch)\(/g)];
    expect(writes.length).toBeGreaterThan(2);

    /* Each write must sit inside an `if (!dryRun)` block. Checked by position
       rather than by parsing: every write has to come after one. */
    const guards = [...SOURCE.matchAll(/if \(!dryRun\)/g)].map((m) => m.index ?? -1);
    expect(guards.length).toBeGreaterThan(0);
    for (const w of writes) {
      const at = w.index ?? -1;
      expect(guards.some((g) => g < at), `a write at ${at} is not behind a dry-run guard`).toBe(true);
    }
  });

  /* The profile columns are what every public page still reads. Clearing them
     here would take branding off live pages before anything serves the
     replacement. */
  it("never clears the profile's branding", () => {
    expect(SOURCE).not.toContain("brand_color: null, updated_at");
    expect(SOURCE).not.toMatch(/patch\(p\._id, \{[^}]*brand_logo_url: null/);
    expect(SOURCE).not.toMatch(/patch\(p\._id, \{[^}]*custom_domain: null/);
  });

  it("only ever writes one field back to a profile", () => {
    const patches = [...SOURCE.matchAll(/ctx\.db\.patch\(p\._id, \{([^}]*)\}/g)].map((m) => m[1]);
    expect(patches.length).toBe(1);
    expect(patches[0]).toContain("brand_logo_storage_id: null");
  });

  /* The trap. removeLogo deletes whatever storage id it finds, so a profile
     and a company holding the same one means the old screen can delete the
     new page's logo. */
  it("hands the stored file to exactly one owner", () => {
    expect(BRANDING).toContain("if (previous) await ctx.storage.delete(previous)");
    expect(SOURCE).toContain("brand_logo_storage_id: null, updated_at");
    const at = SOURCE.indexOf("patch.brand_logo_storage_id && p.brand_logo_storage_id");
    expect(at, "the profile must only give it up once the company holds it").toBeGreaterThan(-1);
  });

  it("copies a field only when the company does not already carry it", () => {
    for (const field of ["brand_color", "brand_background", "brand_logo_url", "custom_domain"]) {
      expect(SOURCE, `${field} must not overwrite`).toContain(`!company.${field}`);
    }
  });

  /* A plan that has lapsed still gets its company made. The rows survive a
     plan ending so returning costs nothing, and refusing here would lose
     somebody's branding rather than park it. */
  it("does not refuse an account whose plan has lapsed", () => {
    const at = SOURCE.indexOf("limits.companies < 1");
    expect(at).toBeGreaterThan(-1);
    const after = SOURCE.slice(at, at + 400);
    expect(after, "a lapsed plan must not skip the profile").not.toContain("continue;");
  });

  it("reports what it would do", () => {
    expect(SOURCE).toContain("report.actions.push");
    expect(SOURCE).toContain("report.skipped.push");
  });
});
