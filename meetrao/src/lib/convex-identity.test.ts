import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   `identity.subject` is not a user id, and treating it as one fails silently.

   Convex Auth's subject is "<userId>|<sessionId>". Nothing in this database is
   keyed by that string, so passing it to a query matches no row, and matching
   no row is not an error, it is an empty result. Every symptom is therefore a
   quiet wrong answer rather than a crash:

     · a lookup returns nothing, and the caller reports "nothing to do";
     · an ownership check compares the subject to a profile id, sees two
       different strings, and refuses the owner;
     · a write lands under a key no screen ever reads.

   All three happened in convex/google.ts at once. Disconnecting a calendar
   reported success and deleted nothing, and reconnecting one stored the
   tokens where no screen could find them. The card said Connected, the toast
   said Disconnected, and both were reading different broken things.

   `currentUserId` in convex/lib/auth.ts is the one place that resolves it.
   Everything else goes through that, or through requireProfile / requireAdmin,
   which are built on it. Actions have no ctx.db, so they reach it through an
   internalQuery, see convex/google.ts:callerId.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = path.join(process.cwd(), "convex");

/** The two files that legitimately handle the raw subject. */
const RESOLVERS = [
  path.join("convex", "lib", "auth.ts"), // currentUserId: the resolver itself
  path.join("convex", "whoami.ts"), // the diagnostic that reports it verbatim
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (entry === "_generated") return [];
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith(".ts") ? [full] : [];
  });
}

const FILES = walk(ROOT).map((full) => ({
  file: path.relative(process.cwd(), full),
  // Comments explain the trap by name; only real code should be matched.
  code: readFileSync(full, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""),
}));

describe("the raw auth subject stays inside its resolver", () => {
  it("finds the convex functions to check", () => {
    expect(FILES.length).toBeGreaterThan(10);
  });

  it("is never read outside currentUserId and the whoami diagnostic", () => {
    const offenders = FILES.filter((f) => /\bidentity\.subject\b|\bid\.subject\b/.test(f.code))
      .map((f) => f.file)
      .filter((f) => !RESOLVERS.includes(f));

    expect(
      offenders,
      `these read the raw subject instead of resolving it, see convex/lib/auth.ts:currentUserId:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  /* The resolver has to keep splitting it, or it silently starts returning the
     composite to every caller that trusts it. */
  it("currentUserId still splits the composite subject", () => {
    const auth = FILES.find((f) => f.file === RESOLVERS[0]);
    expect(auth, "convex/lib/auth.ts is missing").toBeDefined();
    expect(auth!.code).toMatch(/subject\.split\(["'|]/);
  });
});
