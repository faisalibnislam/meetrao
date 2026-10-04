import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { safePath } from "./safe-path";

describe("a redirect target stays on this site", () => {
  it.each(["/dashboard", "/settings/calendar?calendar=connected", "/onboarding/2#top"])("keeps %s", (target) => {
    expect(safePath(target, "/x")).toBe(target);
  });

  /* Each starts with a slash, which is all the old check asked. */
  it.each(["//evil.example", "//evil.example/dashboard", "/\\evil.example", "/\\/evil.example", "/\t/evil.example"])(
    "refuses %s",
    (target) => {
      expect(safePath(target, "/login")).toBe("/login");
    },
  );

  it.each([null, undefined, "", "dashboard", "https://evil.example", "javascript:alert(1)"])("refuses %s", (target) => {
    expect(safePath(target, "/login")).toBe("/login");
  });

  it.each([
    "src/app/auth/confirm/route.ts",
    "src/app/api/google/connect/route.ts",
    "src/app/api/google/callback/route.ts",
    "src/components/auth/auth-form.tsx",
  ])("%s goes through it", (file) => {
    const text = readFileSync(path.join(process.cwd(), file), "utf8");
    expect(text).toContain("safePath(");
    expect(text).not.toMatch(/\.startsWith\("\/"\)/);
  });
});
