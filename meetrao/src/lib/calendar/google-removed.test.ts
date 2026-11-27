import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* Meetrao no longer connects to Google Calendar (2026-11-27): conflicts come
   from the host's calendar feed and invites go out by email. These pin the
   removal, so the sensitive scopes cannot quietly come back, and pin the
   rules that keep the feed address a secret. */

const root = process.cwd();
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(root, dir))) {
    const rel = path.join(dir, name);
    if (name === "_generated" || name === "node_modules") continue;
    if (statSync(path.join(root, rel)).isDirectory()) files(rel, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(rel);
  }
  return out;
}

describe("the Google Calendar connection is gone", () => {
  it("has no OAuth routes, client module or Convex calendar functions", () => {
    for (const gone of [
      "src/app/api/google/connect/route.ts",
      "src/app/api/google/callback/route.ts",
      "src/lib/google",
      "convex/google.ts",
      "convex/rsvp.ts",
      "convex/lib/googleApi.ts",
      "convex/calendarConnections.ts",
    ]) {
      expect(existsSync(path.join(root, gone)), gone).toBe(false);
    }
  });

  it("requests no calendar scope anywhere in the code", () => {
    for (const file of [...files("src"), ...files("convex")]) {
      const text = read(file);
      expect(text, file).not.toMatch(/auth\/calendar\.(events|freebusy|readonly)/);
      expect(text, file).not.toContain("/api/google/connect");
    }
  });

  it("no longer syncs RSVPs on a schedule", () => {
    expect(read("convex/crons.ts")).not.toContain("rsvp");
  });

  it("keeps Sign in with Google, which asks only for the basic profile", () => {
    const auth = read("convex/auth.ts");
    expect(auth).toContain("@auth/core/providers/google");
    expect(auth).not.toMatch(/calendar/i);
  });

  it("has a one-off migration that revokes each stored grant before deleting it", () => {
    const m = read("convex/revokeGoogleCalendar.ts");
    expect(m).toContain("https://oauth2.googleapis.com/revoke");
    // A network failure keeps the row so a rerun retries it.
    expect(m).toMatch(/if \(outcome === "failed"\) \{\s*counts\.failed\+\+;\s*continue;/);
    expect(m).toContain("export const run = internalAction(");
  });
});

describe("the calendar feed address stays secret", () => {
  const FEED = read("convex/calendarFeed.ts");
  const exported = (kind: string) => [...FEED.matchAll(new RegExp(`export const (\\w+) = ${kind}\\(`, "g"))].map((m) => m[1]);

  it("returns busy times only to our own server", () => {
    const fn = FEED.slice(FEED.indexOf("export const busyForHost"), FEED.indexOf("export const statusOwn"));
    expect(fn).toContain("assertServerCall(a.secret)");
  });

  it("never hands the address to a client", () => {
    const status = FEED.slice(FEED.indexOf("export const statusOwn"), FEED.indexOf("export const saveOwn"));
    expect(status).toContain("hint: feed.url_hint");
    expect(status).not.toMatch(/feed\.url\b(?!_hint)/);
    // Public entry points are exactly these; anything else is internal.
    expect(exported("query").sort()).toEqual(["statusOwn"]);
    expect(exported("mutation").sort()).toEqual(["removeOwn"]);
    expect(exported("action").sort()).toEqual(["busyForHost", "refreshOwn", "saveOwn"]);
  });

  it("never logs", () => {
    expect(FEED).not.toMatch(/console\.(log|error|warn|info)/);
  });

  it("is removed with the account", () => {
    expect(read("convex/admin.ts")).toMatch(/query\("calendar_feeds"\)[\s\S]{0,120}ctx\.db\.delete/);
  });
});
