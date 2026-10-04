import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   Every field the form sends is a field the mutation accepts.

   THE DEFECT THIS EXISTS FOR, found in production logs rather than by anybody
   reading the code: the meeting form has an "active" switch and has always
   sent `is_active`, and `meetingTypes.create` never listed it. Convex
   validates arguments strictly, so every create from the Meetings screen
   failed with "Object contains extra field `is_active`", and the screen said
   only "That meeting could not be saved."

   It went unnoticed because onboarding creates meetings with a payload of its
   own that happens to omit the field, so the first meetings an account has
   are made down a path that works.

   A mismatch here is invisible in TypeScript: the action's payload is a plain
   object and Convex's validator is data, so nothing compares them until a
   request is in flight. This reads both and compares them.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const ACTION = read("src/lib/actions/meetings.ts");
const MUTATION = read("convex/meetingTypes.ts");

/** The keys of the object literal the action sends. */
function payloadKeys(): string[] {
  const at = ACTION.indexOf("const payload = {");
  expect(at, "saveMeeting no longer builds a `payload` object").toBeGreaterThan(-1);
  const body = ACTION.slice(at, ACTION.indexOf("\n  };", at));
  return [...body.matchAll(/^\s{4}([a-z_]+):/gm)].map((m) => m[1]);
}

/** The argument names one mutation declares. */
function argNames(name: string): string[] {
  const at = MUTATION.indexOf(`export const ${name} = mutation({`);
  expect(at, `no such mutation: ${name}`).toBeGreaterThan(-1);
  const args = MUTATION.slice(MUTATION.indexOf("args: {", at), MUTATION.indexOf("handler:", at));
  return [...args.matchAll(/([a-z_]+):\s*v\./g)].map((m) => m[1]);
}

describe("saveMeeting and the mutations agree", () => {
  it("reads something from both", () => {
    // Guards the guard: a renamed object passes everything below vacuously.
    expect(payloadKeys().length).toBeGreaterThan(8);
    expect(argNames("create").length).toBeGreaterThan(8);
    expect(argNames("update").length).toBeGreaterThan(8);
  });

  it.each(["create", "update"])("%s accepts every field the form sends", (name) => {
    const accepted = new Set(argNames(name));
    const missing = payloadKeys().filter((k) => !accepted.has(k));
    expect(missing, `${name} would reject: ${missing.join(", ")}`).toEqual([]);
  });

  /* The specific one. Named as well as covered by the sweep above, because
     this is the field that was wrong and a future edit to the sweep must not
     quietly stop checking it. */
  it("create accepts is_active", () => {
    expect(argNames("create")).toContain("is_active");
  });

  it("honours it rather than forcing a new meeting active", () => {
    const fn = MUTATION.slice(MUTATION.indexOf("export const create"), MUTATION.indexOf("export const update"));
    expect(fn).toContain("is_active: a.is_active ?? true");
  });
});
