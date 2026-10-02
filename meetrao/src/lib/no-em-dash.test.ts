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

   COMMENTS ARE INCLUDED TOO. They were exempt for one commit, on the grounds
   that only a maintainer reads them; that is true and it is also how the
   character creeps back, one explanatory aside at a time, until the next
   person copies the house style into something a visitor does read.

   The sweep that removed them changed only comments and string literals, which
   was checked with TypeScript's own parser rather than by eye: every changed
   file was re-tokenised and compared, and no identifier moved. That check
   existed because a regex looking for a block-comment opener found one inside
   a recursive glob string, read the rest of that file as a single long
   comment, and capitalised an `expect` into an `Expect`. A block comment has
   to start a line for exactly that reason, and this paragraph cannot quote the
   glob that caused it without closing itself.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const EM = "—";

/* This file holds the character it is looking for, so it cannot check itself. */
const EXEMPT = ["_generated", "no-em-dash.test.ts"];

const files = [
  ...globSync("src/**/*.{ts,tsx}", { cwd: ROOT }),
  ...globSync("convex/**/*.ts", { cwd: ROOT }),
  ...globSync("src/emails/*.html", { cwd: ROOT }),
  ...globSync("src/**/*.css", { cwd: ROOT }),
].filter((f) => !EXEMPT.some((e) => f.replaceAll("\\", "/").includes(e)));

describe("copy", () => {
  it("finds the files at all", () => {
    // Guards the guard: a bad glob passes everything below vacuously.
    expect(files.length).toBeGreaterThan(150);
  });

  it.each(files)("%s has no em dash", (file) => {
    const text = readFileSync(path.join(ROOT, file), "utf8");
    const lines = text.split("\n").filter((l) => l.includes(EM));
    expect(
      lines,
      `${file}: use a comma, a colon, a full stop or brackets instead:\n  ${lines
        .map((l) => l.trim())
        .join("\n  ")}`,
    ).toEqual([]);
  });
});
