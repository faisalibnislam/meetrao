import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   One rule, so that a privilege listing can be read instead of argued about:

     no SECURITY DEFINER function in `public` is reachable by `anon`
     unless it is a named guest-facing door.

   The rule matters because of the mechanism 0003 wrote down: Supabase's
   default privileges grant EXECUTE to `anon` and `authenticated` DIRECTLY on
   every function created in the `public` schema, and revoking from PUBLIC does
   not touch a direct grant. Every definer function is therefore open the
   moment it is created, and stays open unless a migration names those roles.
   Three functions were left that way until 0003; four trigger functions until
   0019.

   What this file can and cannot do. It cannot tell you what IS granted —
   grant state is not derivable from the migrations, and admin_remove_account
   proves it: no revoke in any file here, locked in the live database anyway.
   Read pg_proc.proacl for state. What it does is pin the INTENT: a new definer
   function that nobody thought about does not get to be quietly reachable.
   ───────────────────────────────────────────────────────────────────────────── */

const DIR = path.join(process.cwd(), "supabase", "migrations");

const FILES = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const SQL = new Map(FILES.map((f) => [f, readFileSync(path.join(DIR, f), "utf8")]));
const ALL = [...SQL.values()].join("\n");

/* The doors. Each is deliberately callable with nothing but the publishable
   key, because a guest booking a meeting is not signed in to anything. */
const GUEST_FACING = [
  "create_booking",
  "cancel_booking_by_reference",
  "get_booking_by_reference",
  "get_meeting_availability",
  "get_public_host",
  "get_public_availability",
  "get_public_meeting_types",
  "record_booking_page_view",
  "username_available",
] as const;

/* Functions that predate the rule: all nine are declared in 0001, none has a
   revoke in any migration, and all nine are nonetheless locked against `anon`
   in the live database — verified with has_function_privilege against project
   gpighkgvdiphdtpqpsfr on 2026-09-12. They are listed by name rather than
   exempted by migration number so that the list has to be maintained: a rename
   or a removal fails the "still exist" assertion below.

   Adding a name here is how you tell this test a function is fine. Do it only
   with a live ACL to point at. */
const LOCKED_WITHOUT_A_REVOKE = [
  "admin_remove_account",
  "generate_username",
  "handle_new_user",
  "is_admin",
  "log_booking_activity",
  "log_calendar_connected",
  "log_meeting_type_created",
  "seed_default_availability",
  "touch_updated_at",
] as const;

type Declared = { name: string; returns: string; files: string[] };

/** Every function any migration declares `security definer`. */
function declaredDefiners(): Map<string, Declared> {
  const found = new Map<string, Declared>();
  // Up to the first `as $$` so a match cannot run on into the next function.
  const decl =
    /create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\(([\s\S]*?)\)\s*returns\s+(\w+)([\s\S]*?)\bas\s*\$\$/gi;

  for (const [file, sql] of SQL) {
    for (const m of sql.matchAll(decl)) {
      const [, name, , returns, modifiers] = m;
      if (!/security\s+definer/i.test(modifiers)) continue;
      const prev = found.get(name);
      if (prev) prev.files.push(file);
      else found.set(name, { name, returns: returns.toLowerCase(), files: [file] });
    }
  }
  return found;
}

/** Function names some migration revokes from `anon`, by name. */
function revokedFromAnon(): Set<string> {
  const revoke =
    /revoke\s+(?:all|execute)\s+on\s+function\s+public\.(\w+)\s*\([\s\S]*?\)\s*from\s+([^;]+);/gi;
  const names = new Set<string>();
  for (const m of ALL.matchAll(revoke)) {
    const roles = m[2].split(",").map((r) => r.trim().toLowerCase());
    if (roles.includes("anon")) names.add(m[1]);
  }
  return names;
}

const DEFINERS = declaredDefiners();
const REVOKED = revokedFromAnon();

describe("the parser sees the migrations it is checking", () => {
  /* Guards the guard. A moved directory, a renamed file, or a regex that
     stopped matching would make every assertion below pass by finding nothing,
     which is the one failure mode a test like this cannot survive. */
  it("finds the migrations", () => {
    expect(FILES.length).toBeGreaterThanOrEqual(19);
    expect(FILES).toContain("0003_rpc_grants.sql");
    expect(FILES).toContain("0019_trigger_function_grants.sql");
  });

  it("finds a plausible number of definer functions", () => {
    // 32 at the time of writing. A collapse to a handful means the declaration
    // regex has stopped matching, not that the schema shrank.
    expect(DEFINERS.size).toBeGreaterThanOrEqual(30);
  });

  it("finds the revokes 0003 and 0019 exist to make", () => {
    for (const fn of [
      "get_busy_intervals",
      "reject_reserved_username",
      "avg_reply_minutes",
      "contact_from_booking",
      "contact_from_invitee",
      "notify_booking_created",
      "notify_booking_changed",
    ]) {
      expect(REVOKED, `${fn} has no revoke naming anon`).toContain(fn);
    }
  });

  it("reads both parts of a multi-line revoke", () => {
    // 0003 puts `from anon, authenticated;` on the line after the signature.
    // A regex without [\s\S] finds the statement and misses the roles.
    expect(SQL.get("0003_rpc_grants.sql")).toMatch(
      /revoke execute on function public\.get_busy_intervals\([^)]*\)\n\s*from anon, authenticated;/,
    );
    expect(REVOKED).toContain("get_busy_intervals");
  });
});

describe("no definer function is reachable by anon by accident", () => {
  it("accounts for every definer function", () => {
    const allowed = new Set<string>([...GUEST_FACING, ...LOCKED_WITHOUT_A_REVOKE]);

    const unaccounted = [...DEFINERS.values()]
      .filter(({ name }) => !allowed.has(name) && !REVOKED.has(name))
      .map(({ name, returns, files }) => `${name}() returns ${returns} — ${files.join(", ")}`);

    expect(
      unaccounted,
      "SECURITY DEFINER with no revoke naming anon, and not a guest-facing door.\n" +
        "Supabase granted EXECUTE to anon directly when it was created, so it is\n" +
        "reachable over /rest/v1/rpc right now. Either add a revoke in the same\n" +
        "migration as the definition, or — if it belongs on the public booking\n" +
        "page — add it to GUEST_FACING above and say why.\n",
    ).toEqual([]);
  });

  /* Trigger functions are the easy ones to miss, because they look harmless:
     Postgres refuses to call one directly, so the grant is inert and nothing
     ever breaks. That is exactly why they accumulate — 0003 caught one, 0019
     caught four more. They are named here so the next one is caught by a test
     rather than by somebody reading a privilege listing. */
  it("revokes every trigger function, inert grant or not", () => {
    const triggers = [...DEFINERS.values()].filter((d) => d.returns === "trigger");
    expect(triggers.length).toBeGreaterThanOrEqual(9);

    const open = triggers
      .filter(({ name }) => !REVOKED.has(name) && !LOCKED_WITHOUT_A_REVOKE.includes(name as never))
      .map(({ name, files }) => `${name}() — ${files.join(", ")}`);

    expect(open, "definer trigger function with no revoke naming anon").toEqual([]);
  });
});

describe("the two lists stay honest", () => {
  /* A typo in either list is an exemption that silently covers nothing — or,
     worse, covers a function that no longer exists while the real one goes
     unchecked. Both lists must name functions the migrations actually declare. */
  it.each([...GUEST_FACING, ...LOCKED_WITHOUT_A_REVOKE])(
    "%s is a definer function some migration declares",
    (fn) => {
      expect(DEFINERS.has(fn), `${fn} is on a list here but nothing declares it`).toBe(true);
    },
  );

  /* The negative control, in the form the repo can check: the guest-facing
     doors must NOT be revoked from anon. get_public_host is the clearest case
     — the booking page is a stranger reading a stranger's profile, and if a
     future migration tidies it up "for consistency" the public page 404s for
     everyone. The migrations revoke these from PUBLIC only, never from anon. */
  it.each(GUEST_FACING)("%s is left reachable by anon", (fn) => {
    expect(REVOKED.has(fn), `${fn} is a guest-facing door but is revoked from anon`).toBe(false);
  });

  /* The grandfathered set is closed. It exists to describe nine functions in
     0001 that were locked before the rule was written down; a new file has no
     business adding to it. */
  it("never grandfathers anything declared after the baseline", () => {
    for (const fn of LOCKED_WITHOUT_A_REVOKE) {
      expect(DEFINERS.get(fn)!.files, fn).toContain("0001_baseline.sql");
    }
  });
});

describe("0019 says what it does", () => {
  const M = SQL.get("0019_trigger_function_grants.sql") ?? "";

  it("revokes all four from public as well as by name", () => {
    for (const fn of [
      "contact_from_booking",
      "contact_from_invitee",
      "notify_booking_created",
      "notify_booking_changed",
    ]) {
      const stmt = new RegExp(`revoke all on function public\\.${fn}\\(\\) from ([^;]+);`);
      const found = M.match(stmt);
      expect(found, `${fn} is not revoked in 0019`).not.toBeNull();

      // PUBLIC holds EXECUTE by Postgres default and anon/authenticated
      // inherit it, so the direct grant and the inherited one both have to go.
      const roles = found![1].split(",").map((r) => r.trim());
      expect(roles.sort()).toEqual(["anon", "authenticated", "public"]);
    }
  });

  it("tells the next reader that nothing was on fire", () => {
    // The honest framing is load-bearing. Without it the file reads as an
    // incident report and whoever finds it goes looking for the breach.
    expect(M).toMatch(/returns trigger|`returns trigger`/);
    expect(M.toLowerCase()).toMatch(/inert|harmless|nothing is broken/);
  });
});
