import { describe, expect, it } from "vitest";
import { routeForDomain, type DomainHandle } from "@/lib/custom-domain";

/* ─────────────────────────────────────────────────────────────────────────────
   What a path means on a company's domain.

   Rewritten when companies replaced the one-domain-one-host model. The
   previous version of this file asserted that `meeting.example.com/alex` and
   the bare domain both served Alex's list of meetings. Neither is true any
   more: every link names a specific meeting, and there is no index page on any
   domain.

   THE ASSERTION THAT MATTERS MOST is that a name which is not one of this
   company's handles is a 404. Resolving an arbitrary username would serve a
   stranger's booking page under somebody else's logo, and would turn any
   custom domain into a way to enumerate every host on the product.
   ───────────────────────────────────────────────────────────────────────────── */

const ACME: DomainHandle[] = [
  { handle: "sarah", username: "sarah-jones-1988" },
  { handle: "alex", username: "alex" },
];

describe("the advertised shape", () => {
  it("serves a member's meeting from their company handle", () => {
    expect(routeForDomain("/sarah/intro", ACME)).toEqual({
      kind: "rewrite",
      path: "/sarah-jones-1988/intro",
    });
  });

  /* The handle is not the username, and that is the point of having one:
     usernames are global and first come first served, so a company cannot be
     promised "sarah". */
  it("resolves the handle, not the username", () => {
    expect(routeForDomain("/sarah/intro", ACME)).toEqual({
      kind: "rewrite",
      path: "/sarah-jones-1988/intro",
    });
    // Her global username is NOT a way in on this domain.
    expect(routeForDomain("/sarah-jones-1988/intro", ACME)).toEqual({ kind: "notFound" });
  });

  /* A link in an email signature gets capitalised by a phone keyboard. */
  it("is case insensitive about the handle", () => {
    expect(routeForDomain("/Sarah/intro", ACME)).toEqual({
      kind: "rewrite",
      path: "/sarah-jones-1988/intro",
    });
  });

  it("leaves the meeting slug exactly as typed", () => {
    // Slugs are matched by the page, not here, so case is not ours to change.
    expect(routeForDomain("/alex/Intro-Call", ACME)).toEqual({
      kind: "rewrite",
      path: "/alex/Intro-Call",
    });
  });
});

describe("there is no index page", () => {
  it("404s the bare domain", () => {
    expect(routeForDomain("/", ACME)).toEqual({ kind: "notFound" });
    expect(routeForDomain("", ACME)).toEqual({ kind: "notFound" });
  });

  it("404s a handle on its own", () => {
    expect(routeForDomain("/sarah", ACME)).toEqual({ kind: "notFound" });
  });

  it("404s anything deeper than a meeting", () => {
    expect(routeForDomain("/sarah/intro/extra", ACME)).toEqual({ kind: "notFound" });
  });
});

describe("no enumerating the product", () => {
  /* The one that would serve a stranger's page under somebody else's logo. */
  it("404s a username that is not in this company", () => {
    expect(routeForDomain("/somebody-else/intro", ACME)).toEqual({ kind: "notFound" });
  });

  it("404s everything when the company has nobody in it", () => {
    expect(routeForDomain("/sarah/intro", [])).toEqual({ kind: "notFound" });
    expect(routeForDomain("/", [])).toEqual({ kind: "notFound" });
  });
});

describe("paths that mean the same thing everywhere", () => {
  /* A guest's confirmation link is built from the site URL and may be followed
     on the custom domain. Rewriting it would break the booking it confirms. */
  it.each([
    "/booking/abc123",
    "/booking/abc123/cancel",
    "/team/acme/intro",
    "/embed/sarah/intro",
    "/api/polar/webhook",
    "/_next/static/chunk.js",
    "/terms",
    "/privacy",
    "/support",
    "/auth/callback",
  ])("passes %s through", (path) => {
    expect(routeForDomain(path, ACME)).toEqual({ kind: "pass" });
  });

  it.each(["/robots.txt", "/sitemap.xml", "/favicon.ico", "/manifest.webmanifest", "/icon.png", "/apple-icon.png"])(
    "passes %s through",
    (path) => {
      expect(routeForDomain(path, ACME)).toEqual({ kind: "pass" });
    },
  );

  /* Exact, not a prefix: somebody may legitimately slug a meeting "terms". */
  it("treats a meeting named like a shared path as a meeting", () => {
    expect(routeForDomain("/sarah/terms", ACME)).toEqual({
      kind: "rewrite",
      path: "/sarah-jones-1988/terms",
    });
  });
});

describe("a company's domain is an alias for its address", () => {
  /* The page a custom domain serves is the same page meetrao.com serves at
     the company's own address. Rewriting to the HOST's personal address
     instead would serve it, then have that route notice the meeting belongs
     to a company and send the guest on: a redirect on every single visit to a
     domain somebody paid for. */
  it("rewrites to the company's address, not the host's", () => {
    expect(routeForDomain("/sarah/intro", ACME, "acme")).toEqual({
      kind: "rewrite",
      path: "/acme/sarah/intro",
    });
  });

  /* The handle, not the username. They are different on purpose: a handle is
     who somebody is inside this company, and usernames are global. */
  it("keeps the handle in the path", () => {
    const route = routeForDomain("/sarah/intro", ACME, "acme");
    expect(route).toHaveProperty("path");
    if (route.kind === "rewrite") expect(route.path).toContain("/sarah/");
  });

  /* A profile's own custom domain is one person and has no company address,
     so it still points at the only thing it can. */
  it("still rewrites a profile's domain to that person", () => {
    expect(routeForDomain("/sarah/intro", ACME, null)).toEqual({
      kind: "rewrite",
      path: "/sarah-jones-1988/intro",
    });
  });

  /* The refusals are unchanged by any of this: a name that is not one of this
     company's handles is still a 404 rather than a door to another account. */
  it("refuses a stranger's name whichever address it would rewrite to", () => {
    expect(routeForDomain("/nobody/intro", ACME, "acme")).toEqual({ kind: "notFound" });
    expect(routeForDomain("/acme", ACME, "acme")).toEqual({ kind: "notFound" });
    expect(routeForDomain("/sarah", ACME, "acme")).toEqual({ kind: "notFound" });
    expect(routeForDomain("/sarah/intro/extra", ACME, "acme")).toEqual({ kind: "notFound" });
  });
});
