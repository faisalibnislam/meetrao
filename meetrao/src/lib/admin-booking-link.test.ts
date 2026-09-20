import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { RESERVED, usernameStatus } from "./username";

/* ─────────────────────────────────────────────────────────────────────────────
   An admin can rename any account in the product.

   That is a bigger lever than anything else in the console, and three of the
   ways it can go wrong are silent — the feature keeps working perfectly while
   the guarantee underneath it is gone:

     · the two functions become callable by anyone with the publishable key,
     · the admin's field stops using the host's own rules, so it saves a name
       the host can never edit back,
     · retiring stops retiring, and the host reclaims the name a minute later.

   None of them shows up in the UI, which is why they are pinned here.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();

const MIGRATION = readFileSync(
  path.join(ROOT, "supabase", "migrations", "0018_admin_booking_link.sql"),
  "utf8",
);

const ACTION = readFileSync(path.join(ROOT, "src", "lib", "actions", "admin.ts"), "utf8");

describe("who can call the rename functions", () => {
  it("reads the migration at all", () => {
    // Guards the guard: a renamed file would make every assertion below pass
    // by finding nothing to check.
    expect(MIGRATION).toContain("create or replace function public.admin_set_username");
    expect(MIGRATION).toContain("create or replace function public.admin_release_username");
  });

  /* Supabase grants EXECUTE on every function in `public` to anon and
     authenticated DIRECTLY, and a revoke from PUBLIC does not touch a direct
     grant. 0003 exists because three SECURITY DEFINER functions were left
     reachable over /rest/v1/rpc that way. These two rename any account in the
     product, so both roles have to be named explicitly. */
  it.each(["admin_set_username", "admin_release_username"])(
    "%s is revoked from anon and authenticated by name",
    (fn) => {
      const revoke = new RegExp(`revoke all on function public\\.${fn}\\s*\\([^)]*\\)\\s*from ([^;]+);`);
      const found = MIGRATION.match(revoke);
      expect(found, `${fn} has no revoke at all`).not.toBeNull();

      const roles = found![1].replace(/\s+/g, " ");
      for (const role of ["public", "anon", "authenticated"]) {
        expect(roles, `${fn} is still granted to ${role}`).toContain(role);
      }
    },
  );

  it.each(["admin_set_username", "admin_release_username"])(
    "%s is granted to service_role and nothing else",
    (fn) => {
      const grant = new RegExp(`grant execute on function public\\.${fn}\\s*\\([^)]*\\) to ([^;]+);`);
      const found = MIGRATION.match(grant);
      expect(found, `${fn} is never granted to anything`).not.toBeNull();
      expect(found![1].trim()).toBe("service_role");
    },
  );

  /* The revoke and the grant have to live in the same file as the definition:
     `create or replace` resets a function's privileges to the defaults, so a
     later migration that edits the body and leaves the grants behind quietly
     re-opens it. 0003 says so in as many words. */
  it("keeps the grants in the same migration as the definitions", () => {
    const define = MIGRATION.indexOf("create or replace function public.admin_set_username");
    const revoke = MIGRATION.indexOf("revoke all on function public.admin_set_username");
    expect(revoke).toBeGreaterThan(define);
  });

  it("pins search_path on both, as every definer function here does", () => {
    const definers = MIGRATION.match(/security definer set search_path to 'public', 'pg_temp'/g) ?? [];
    expect(definers).toHaveLength(2);
  });
});

describe("the admin's field obeys the host's own rules", () => {
  /* The database check constraint allows 40 characters, no reserved-word list
     and consecutive hyphens. `usernameStatus` is stricter on all three, and it
     is the ONLY thing enforcing them — so an admin path that skipped it could
     save `meetrao.com/admin`, or a 38-character name, and the host would find
     their own Settings field refusing to save it back. */
  it("validates with usernameStatus, the same function Settings uses", () => {
    expect(ACTION).toMatch(/import \{[^}]*\busernameStatus\b[^}]*\} from "@\/lib\/username"/);
    expect(ACTION).toMatch(/usernameStatus\(username\) !== "checking"/);
  });

  it("rejects the words the database would happily accept", () => {
    for (const word of ["admin", "settings", "booking", "meetrao"]) {
      expect(RESERVED.has(word), `${word} is not reserved`).toBe(true);
      expect(usernameStatus(word), word).toBe("reserved");
    }
    // …and the shapes the constraint allows but the product does not.
    expect(usernameStatus("a--b")).toBe("hyphen");
    expect(usernameStatus("a".repeat(31))).toBe("long");
  });

  /* `checkUsername` in the onboarding actions passes the CALLER's id when
     asking whether a name is free. Used here it would be wrong in both
     directions: it reports the target's own current name as taken, and
     reports the admin's own name as free — offering to move a host onto a
     link that is not available at all.

     The parameter changed name with the backend (`p_for_user` → `forUser`);
     the property it guards did not. */
  it("checks availability against the account being edited, not the admin", () => {
    expect(ACTION).not.toContain("actions/onboarding");
    expect(ACTION).toMatch(/forUser: userId/);
  });
});

describe("retiring actually retires", () => {
  /* Without this, an admin takes a squatted name away and the host claims it
     straight back from Settings → Profile a minute later. The release path is
     the one that must never be optional about it. */
  it("always holds the old name back when a link is released", () => {
    const body = MIGRATION.slice(MIGRATION.indexOf("function public.admin_release_username"));
    expect(body).toMatch(/admin_set_username\(\s*p_user_id,\s*public\.generate_username\('host'\),\s*true\b/);
  });

  /* Seeded from 'host', never from the email address: the placeholder replaces
     a public URL, and an email address is not public. */
  it("never seeds the placeholder from the account's email", () => {
    expect(MIGRATION).not.toMatch(/generate_username\(\s*[^)]*email/);
  });

  it("offers the choice on a rename, and defaults the action to not guessing", () => {
    // p_retire_old has no default of `true` — a plain rename must not silently
    // burn the old name. The UI ticks the box; the function does not.
    expect(MIGRATION).toMatch(/p_retire_old boolean default false/);
    expect(MIGRATION).toMatch(/p_force\s+boolean default false/);
  });
});
