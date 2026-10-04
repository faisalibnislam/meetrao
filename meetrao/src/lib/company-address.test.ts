import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { bookingLink, companyBookingLink } from "./username";

/* ─────────────────────────────────────────────────────────────────────────────
   A company's links are not its members' links.

   Before this, a company's meetings were only reachable at their HOST's
   personal address, meetrao.com/<username>/<meeting>, unless the company had
   bought and verified a domain. So a company and the people in it shared one
   set of links, the rail handed out whichever it happened to have, and the
   People screen showed somebody their own address labelled as the company's.

   NOW EVERY COMPANY HAS ITS OWN ADDRESS, meetrao.com/<company>/<handle>/<meeting>,
   whether or not it has a domain. A custom domain is a prettier alias for the
   same page rather than the only way to have one.

   THE OLD ADDRESS STILL WORKS. A company meeting reached at its host's
   personal address is sent on to the company's, so every link already in
   somebody's email signature keeps working and each page has one canonical
   home instead of two that differ only in branding.

   HANDLES, NOT USERNAMES, in a company address. A handle is who somebody is
   inside that company; usernames are global and first come first served, so a
   company cannot be promised one.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

/* Nested under the personal route's own parameters: Next refuses two
   different parameter names at the same position, so `[username]/[slug]`
   there forces `[username]/[slug]/[meeting]` here. The names are Next's; the
   segments mean company, handle and meeting. */
const COMPANY_ROUTE = read("src/app/(public)/[username]/[slug]/[meeting]/page.tsx");
const PERSONAL_ROUTE = read("src/app/(public)/[username]/[slug]/page.tsx");
const QUERIES = read("convex/publicBooking.ts");

const acme = { slug: "acme", domain: null, domainVerified: false };

describe("where a link points", () => {
  it("a personal meeting is at the person's own address", () => {
    expect(bookingLink("sarah", "intro")).toBe("meetrao.com/sarah/intro");
  });

  /* The whole change: a company with no domain used to have no address of its
     own at all. */
  it("a company's meeting is at the company's, with no domain needed", () => {
    expect(companyBookingLink(acme, "sarah", "intro")).toBe("meetrao.com/acme/sarah/intro");
  });

  it("uses the handle, not the username", () => {
    expect(companyBookingLink(acme, "sarah", "intro")).not.toContain("sarah-jones");
  });

  it("prefers the company's own domain once it is verified", () => {
    expect(
      companyBookingLink({ slug: "acme", domain: "meet.acme.com", domainVerified: true }, "sarah", "intro"),
    ).toBe("meet.acme.com/sarah/intro");
  });

  /* An unverified domain does not resolve yet, so offering it would be handing
     somebody an address that 404s. */
  it("ignores a domain that is not verified yet", () => {
    expect(
      companyBookingLink({ slug: "acme", domain: "meet.acme.com", domainVerified: false }, "sarah", "intro"),
    ).toBe("meetrao.com/acme/sarah/intro");
  });

  /* The two are never interchangeable, which is the rule the screens kept
     breaking. */
  it("never produces the personal address for a company", () => {
    expect(companyBookingLink(acme, "sarah", "intro")).not.toBe(bookingLink("sarah", "intro"));
  });
});

describe("the company route", () => {
  /* Resolving an arbitrary username here would serve a stranger's booking
     page under somebody else's logo, and make every company slug a way to
     enumerate the product's hosts. */
  it("refuses a handle that is not this company's", () => {
    expect(COMPANY_ROUTE).toContain("hostOnCompany(companySlug, handle)");
    expect(COMPANY_ROUTE).toContain("if (!username) return null;");
    expect(COMPANY_ROUTE).toContain("notFound()");
  });

  it("refuses a company that does not exist", () => {
    expect(COMPANY_ROUTE).toContain("if (!company) return null;");
  });

  /* The owner's plan serves every page on the company, including a free
     member's, exactly as on a custom domain. Nobody's page resolves when the
     owner stops paying. */
  it("gates on the owner's plan, not the member's", () => {
    const fn = QUERIES.slice(QUERIES.indexOf("export const hostOnCompany"));
    const body = fn.slice(0, fn.indexOf("export const companyPlaceOf"));
    expect(body).toContain("company.owner_id");
    expect(body).toContain("isPro(owner)");
  });

  it("has no suspended host on it either", () => {
    const fn = QUERIES.slice(QUERIES.indexOf("export const hostOnCompany"));
    expect(fn.slice(0, fn.indexOf("export const companyPlaceOf"))).toContain("member.is_suspended");
  });

  /* Canonical to this address, because the personal one redirects here.
     Pointing back at it would send a crawler in a circle. */
  it("canonicalises to itself", () => {
    expect(COMPANY_ROUTE).toContain("publicUrl(`/${found.company.slug}/${found.handle}/${meeting.slug}`)");
  });
});

describe("the old address keeps working", () => {
  it("sends a company's meeting on to the company's address", () => {
    expect(PERSONAL_ROUTE).toContain("companyPlaceOf(username, slug)");
    expect(PERSONAL_ROUTE).toContain(
      "permanentRedirect(`/${place.companySlug}/${place.handle}/${slug}`)",
    );
  });

  /* On a custom domain this path IS the company's address, after the proxy
     has rewritten it. Redirecting there would bounce every guest off the
     domain the company paid for. */
  it("does not redirect on a company's own domain", () => {
    expect(PERSONAL_ROUTE).toContain("if (!company) {");
  });

  /* A personal meeting has no company address to be sent to, and must keep
     the address it has always had. */
  it("leaves a personal meeting where it is", () => {
    const fn = QUERIES.slice(QUERIES.indexOf("export const companyPlaceOf"));
    const body = fn.slice(0, fn.indexOf("export const companyBrandBySlug"));
    expect(body).toContain("if (!meeting || !meeting.company_id) return null;");
  });

  /* Somebody removed from a company while their meeting still points at it
     has no handle there. Sending them nowhere beats sending them to a 404. */
  it("sends nobody to a handle that no longer exists", () => {
    const fn = QUERIES.slice(QUERIES.indexOf("export const companyPlaceOf"));
    expect(fn.slice(0, fn.indexOf("export const companyBrandBySlug"))).toContain("if (!mine) return null;");
  });
});

describe("the screens that hand links out", () => {
  const RAIL = read("src/components/app/app-shell.tsx");
  const MEETINGS = read("src/app/(app)/meetings/page.tsx");
  const DASHBOARD = read("src/app/(app)/dashboard/page.tsx");

  /* The rail used to list every active meeting whatever workspace you were
     standing in, so Personal handed out the company's links and the company
     handed out your own. It disagreed with the Meetings screen, which has
     always been scoped. */
  it("the rail lists only the workspace in force", () => {
    expect(RAIL).toContain("(m.company_id ?? null) === context.companyId");
  });

  it("the rail builds the workspace's own kind of address", () => {
    expect(RAIL).toContain("companyBookingLink(");
    expect(RAIL).toContain("bookingLink(profile.username, m.slug)");
  });

  it("the personal dashboard drops anything filed under a company", () => {
    expect(DASHBOARD).toContain("filter((m) => !m.company_id)");
  });

  /* The Meetings list was already scoped, but every row still showed
     meetrao.com/<username>/<meeting>, including the Preview link. */
  it("the Meetings screen shows and previews the company's address", () => {
    expect(MEETINGS).toContain("companyBookingLink(");
    expect(MEETINGS).toContain("`/${here.slug}/${here.handle}/${m.slug}`");
  });
});
