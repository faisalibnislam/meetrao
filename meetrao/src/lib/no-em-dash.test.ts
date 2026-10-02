import { readFileSync, globSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* ─────────────────────────────────────────────────────────────────────────────
   No em dashes in anything a person reads.

   The character reads as machine-written to a lot of people now, and this
   codebase had 318 of them in its copy. They are gone, and this keeps them
   gone: a dash is the easiest punctuation mark in the world to reach for when
   a sentence has two halves and you have not decided how they relate.

   Deciding is the point. Each one here became a comma, a colon, a full stop or
   a pair of brackets, and picking which forced the question of what the second
   half was actually doing.

   COMMENTS ARE EXEMPT. They are written for whoever maintains this, not for a
   visitor, and rewriting nine hundred of them would be a diff nobody could
   review for no reader's benefit.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const EM = "—";

/** Block and line comments, blanked so only copy is searched. */
const COMMENT = /\/\*[\s\S]*?\*\/|^[ \t]*\/\/.*$/gm;

/* Tests describe the thing being tested and quote it; /preview is the internal
   component gallery, which no visitor reaches. */
const EXEMPT = [".test.", "/preview/", "_generated"];

const files = [
  ...globSync("src/**/*.{ts,tsx}", { cwd: ROOT }),
  ...globSync("convex/**/*.ts", { cwd: ROOT }),
  ...globSync("src/emails/*.html", { cwd: ROOT }),
].filter((f) => !EXEMPT.some((e) => f.replaceAll("\\", "/").includes(e)));

describe("copy", () => {
  it("finds the files at all", () => {
    // Guards the guard: a bad glob passes everything below vacuously.
    expect(files.length).toBeGreaterThan(150);
  });

  it.each(files)("%s has no em dash outside its comments", (file) => {
    const text = readFileSync(path.join(ROOT, file), "utf8");
    const copy = file.endsWith(".html") ? text : text.replace(COMMENT, "");

    const lines = copy.split("\n").filter((l) => l.includes(EM));
    expect(
      lines,
      `${file}: use a comma, a colon, a full stop or brackets instead:\n  ${lines
        .map((l) => l.trim())
        .join("\n  ")}`,
    ).toEqual([]);
  });
});
