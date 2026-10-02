import { describe, expect, it } from "vitest";
import { rewriteForDomain } from "@/lib/custom-domain";

/* null means "serve this path as it stands". A string means "serve that path
   instead", and the proxy rewrites rather than redirects, a guest on
   meeting.acme.com must never be bounced to meetrao.com. */

describe("the shape a host advertises", () => {
  it("serves meeting.acme.com/alex as it stands", () => {
    expect(rewriteForDomain("/alex", "alex")).toBeNull();
    expect(rewriteForDomain("/alex/intro", "alex")).toBeNull();
  });

  it("does not double the username, which is the bug this replaced", () => {
    // The first version appended the username to every path, so the shape the
    // host was told to use resolved to /alex/alex and 404'd.
    expect(rewriteForDomain("/alex", "alex")).not.toBe("/alex/alex");
  });

  it("reaches the right host when a phone capitalises the link", () => {
    expect(rewriteForDomain("/Alex", "alex")).toBeNull();
    expect(rewriteForDomain("/ALEX/intro", "alex")).toBeNull();
  });
});

describe("the bare domain", () => {
  it("serves the owner's page", () => {
    expect(rewriteForDomain("/", "alex")).toBe("/alex");
  });

  it("keeps the username's own capitalisation in the path it serves", () => {
    // The route looks up case-insensitively, but the page renders links from
    // what it is given and a host's name should not be lowercased on them.
    expect(rewriteForDomain("/", "AlexSmith")).toBe("/AlexSmith");
  });
});

describe("a short link straight to a meeting", () => {
  it("reads a bare segment as one of the owner's slugs", () => {
    expect(rewriteForDomain("/intro", "alex")).toBe("/alex/intro");
    expect(rewriteForDomain("/30-minute-chat", "alex")).toBe("/alex/30-minute-chat");
  });
});

describe("one domain, one account", () => {
  it("is not a door into somebody else's page", () => {
    /* The whole point: on Alex's domain, /dana is read as Alex's meeting named
       "dana", which does not exist, so it 404s. It must NOT resolve to Dana's
       booking page, or every custom domain becomes a mirror of the product. */
    expect(rewriteForDomain("/dana", "alex")).toBe("/alex/dana");
    expect(rewriteForDomain("/dana/intro", "alex")).toBe("/alex/dana/intro");
  });
});

describe("paths that mean the same thing everywhere", () => {
  it("leaves a guest's booking link alone", () => {
    // Built from the site URL and mailed out. Rewriting it would make a
    // confirmation link 404 on the host's own domain.
    expect(rewriteForDomain("/booking/ABC123", "alex")).toBeNull();
    expect(rewriteForDomain("/booking/ABC123/cancel", "alex")).toBeNull();
    expect(rewriteForDomain("/booking/ABC123/reschedule", "alex")).toBeNull();
  });

  it("leaves the plumbing alone", () => {
    for (const path of [
      "/api/google/callback",
      "/_next/static/chunk.js",
      "/embed/alex/intro",
      "/team/acme/intro",
      "/auth/callback",
      "/brand/meetrao-logo.svg",
    ]) {
      expect(rewriteForDomain(path, "alex"), path).toBeNull();
    }
  });

  it("leaves the legal pages alone, because a guest has nowhere else to find them", () => {
    for (const path of ["/terms", "/privacy", "/support"]) {
      expect(rewriteForDomain(path, "alex"), path).toBeNull();
    }
  });

  it("leaves crawler and icon files alone", () => {
    for (const path of ["/robots.txt", "/sitemap.xml", "/favicon.ico", "/icon.png", "/apple-icon.png"]) {
      expect(rewriteForDomain(path, "alex"), path).toBeNull();
    }
  });

  it("matches a shared prefix on a segment boundary only", () => {
    /* "/teamwork" is a perfectly good meeting slug and must not be mistaken
       for the /team area. This is the bug a naive startsWith() produces. */
    expect(rewriteForDomain("/teamwork", "alex")).toBe("/alex/teamwork");
    expect(rewriteForDomain("/booking-with-me", "alex")).toBe("/alex/booking-with-me");
    expect(rewriteForDomain("/supportive", "alex")).toBe("/alex/supportive");
  });
});

describe("no username", () => {
  it("changes nothing, rather than serving /undefined", () => {
    expect(rewriteForDomain("/", "")).toBeNull();
    expect(rewriteForDomain("/intro", "   ")).toBeNull();
  });
});
