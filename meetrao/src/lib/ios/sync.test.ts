import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { TIMEZONES } from "@/lib/timezones";
import { APP_AUTH_REDIRECT } from "@/convex/lib/authRedirect";

/* ─────────────────────────────────────────────────────────────────────────────
   The iOS app and this backend, kept in step.

   The app calls Convex by name, as a string, so nothing at compile time
   notices when a function it calls is renamed or removed here. These do:
   every "module:function" the Swift code names must be exported from that
   module, and the lists both sides offer must be the same lists.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const IOS = path.join(ROOT, "..", "ios");

function swiftFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name.endsWith(".xcodeproj") || name === "build" ? [] : swiftFiles(full);
    return name.endsWith(".swift") ? [full] : [];
  });
}

const swift = swiftFiles(IOS).map((file) => readFileSync(file, "utf8")).join("\n");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const called = [...new Set([...swift.matchAll(/"([a-zA-Z]+):([a-zA-Z]+)"/g)].map((m) => `${m[1]}:${m[2]}`))]
  // URL schemes and the like, not function names.
  .filter((name) => !name.startsWith("meetrao:") && !name.startsWith("message:") && !name.startsWith("mailto:"));

describe("every Convex function the app calls exists", () => {
  it("finds the calls at all", () => {
    expect(called.length).toBeGreaterThan(20);
  });

  it.each(called)("%s", (name) => {
    const [module, fn] = name.split(":");
    const source = read(`convex/${module}.ts`);
    // Convex Auth's are exported in one destructuring line.
    const exported =
      new RegExp(`export const ${fn} = (query|mutation|action)\\(`).test(source) ||
      new RegExp(`export const \\{[^}]*\\b${fn}\\b[^}]*\\} = convexAuth`).test(source);
    expect(exported, `${name} is not a public function in convex/${module}.ts`).toBe(true);
  });
});

describe("both sides offer the same choices", () => {
  it("the same timezones", () => {
    const list = readFileSync(path.join(IOS, "Meetrao/Models/Timezones.swift"), "utf8");
    const zones = [...list.slice(list.indexOf("static let all"), list.indexOf("]\n")).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(zones).toEqual([...TIMEZONES]);
  });

  /* The web's server action refuses anything else, so the app must not offer it. */
  it("the same meeting lengths, buffers, notices and windows", () => {
    const web = read("src/lib/actions/meetings.ts");
    const app = readFileSync(path.join(IOS, "Meetrao/Models/Meeting.swift"), "utf8");
    for (const name of ["BUFFERS", "NOTICES", "WINDOWS"]) {
      const webList = web.match(new RegExp(`const ${name} = \\[([^\\]]+)\\]`))?.[1].replace(/\s/g, "");
      const appList = app.match(new RegExp(`static let ${name.toLowerCase()} = \\[([^\\]]+)\\]`))?.[1].replace(/\s/g, "");
      expect(appList, name).toBe(webList);
    }
  });

  /* Durations are a RANGE on the web now, not a list: the editor offers the
     four presets plus a typed custom length, and the action accepts any whole
     number of minutes inside the bounds. So the app's presets need not equal
     a web list any more; each one must be a length the web accepts. */
  it("meeting lengths the app offers are ones the web accepts", () => {
    const web = read("src/lib/actions/meetings.ts");
    const app = readFileSync(path.join(IOS, "Meetrao/Models/Meeting.swift"), "utf8");
    const min = Number(web.match(/const MIN_DURATION = (\d+);/)?.[1]);
    const max = Number(web.match(/const MAX_DURATION = (\d+);/)?.[1]);
    const appList = app
      .match(/static let durations = \[([^\]]+)\]/)?.[1]
      .split(",")
      .map((s) => Number(s.trim()));
    expect(min, "MIN_DURATION").toBeGreaterThan(0);
    expect(max, "MAX_DURATION").toBeGreaterThan(min);
    expect(appList?.length, "the app's duration list").toBeGreaterThan(0);
    for (const d of appList ?? []) {
      expect(Number.isInteger(d) && d >= min && d <= max, `${d} min`).toBe(true);
    }
  });

  it("the sign-in return address the backend allows is the app's", () => {
    expect(swift).toContain(`"${APP_AUTH_REDIRECT}"`);
    expect(readFileSync(path.join(IOS, "project.yml"), "utf8")).toContain("CFBundleURLSchemes: [meetrao]");
  });

  /* The Apple provider's id is what the app names when it signs in with Apple. */
  it("the Apple provider has the name the app uses", () => {
    expect(swift).toContain('"provider": .string("apple-native")');
    expect(read("convex/auth.ts")).toContain('id: "apple-native"');
  });
});
