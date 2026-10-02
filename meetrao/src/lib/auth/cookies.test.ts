import { describe, expect, it } from "vitest";
import { clearedAuthCookies, isLocalHost } from "./cookies";

/* ─────────────────────────────────────────────────────────────────────────────
   Signing out worked locally and did nothing on the live site.

   Two reasons, and the same cause behind both: the deletion was written as if
   cookie attributes did not matter.

   Off localhost Convex Auth prefixes its session cookies with `__Host-`. That
   prefix is a browser-enforced contract. a Set-Cookie for a `__Host-` name is
   rejected unless it carries Secure and Path=/. A deletion missing either is
   not a deletion: the browser drops the write, the cookie survives, and the
   next page load is still signed in. Locally there is no prefix and no https,
   so nothing was ever wrong in development.

   These tests are about the ATTRIBUTES, not the names. The names are easy to
   get right and were.
   ───────────────────────────────────────────────────────────────────────────── */

const LIVE = "meetrao.com";
const LOCAL = "localhost:3000";

describe("isLocalHost", () => {
  it("recognises the development hosts", () => {
    expect(isLocalHost("localhost:3000")).toBe(true);
    expect(isLocalHost("127.0.0.1:3000")).toBe(true);
  });

  it("treats everything else as live", () => {
    expect(isLocalHost("meetrao.com")).toBe(false);
    expect(isLocalHost("meetrao-abc123.vercel.app")).toBe(false);
    expect(isLocalHost(null)).toBe(false);
  });
});

describe("clearing the session cookies on a live host", () => {
  const cleared = clearedAuthCookies(LIVE);

  /* The bug, stated as a test. Without Secure the browser rejects the write
     for a `__Host-` name and the session cookie stays exactly where it was. */
  it("marks every cookie Secure, because __Host- is refused without it", () => {
    expect(cleared.length).toBeGreaterThan(0);
    for (const c of cleared) expect(c.options.secure, `${c.name} was not Secure`).toBe(true);
  });

  it("scopes every cookie to the root path, which __Host- also requires", () => {
    for (const c of cleared) expect(c.options.path, `${c.name} had the wrong path`).toBe("/");
  });

  it("expires them in the past rather than relying on delete()", () => {
    for (const c of cleared) {
      expect(c.value).toBe("");
      expect(c.options.expires.getTime()).toBeLessThan(Date.now());
    }
  });

  it("clears the prefixed spelling the live site actually sets", () => {
    const names = cleared.map((c) => c.name);
    expect(names).toContain("__Host-__convexAuthJWT");
    expect(names).toContain("__Host-__convexAuthRefreshToken");
  });

  /* Both halves, or the session outlives the sign-out: the JWT expires on its
     own within the hour, the refresh token does not. */
  it("clears the refresh token, not only the access token", () => {
    expect(cleared.filter((c) => c.name.includes("RefreshToken")).length).toBeGreaterThan(0);
  });
});

describe("clearing the session cookies on localhost", () => {
  const cleared = clearedAuthCookies(LOCAL);

  /* Not pedantry: Safari refuses to send Secure cookies over http, so a
     hardcoded `secure: true` would break sign-out in development instead,
     the same bug, pointed the other way. */
  it("does not mark them Secure, because http would reject them", () => {
    for (const c of cleared) expect(c.options.secure, `${c.name} was Secure on http`).toBe(false);
  });

  it("uses the bare names, which is what the package sets there", () => {
    expect(cleared.map((c) => c.name).sort()).toEqual(
      ["__convexAuthJWT", "__convexAuthRefreshToken"].sort(),
    );
  });
});
