import { describe, expect, it } from "vitest";
import { POSTAL_ADDRESS } from "@/lib/contact";
import { humanExpiry, renderReset, renderVerify } from "@/convex/lib/emails";

/* ─────────────────────────────────────────────────────────────────────────────
   The two emails Convex Auth sends.

   They live in convex/lib/emails.ts rather than src/emails, because Convex
   sends them and Convex functions cannot read from disk. That put them outside
   render.verify.test.ts's reach, which is how they went out as Auth.js's
   default template (unbranded, and with no postal address) for the whole
   window between the auth cutover and this file.

   The rendering half is pure on purpose so it can be tested here, with no
   deployment and no network.
   ───────────────────────────────────────────────────────────────────────────── */

const base = {
  to: "adam@example.com",
  code: "T4e83j6CSrzBo2tJPXSfyJbIKPVUetzr",
  expires: new Date("2026-09-21T07:43:00Z"),
  now: new Date("2026-09-20T07:43:00Z").getTime(),
  site: "https://meetrao.com",
  postalAddress: POSTAL_ADDRESS,
};

const both = [
  ["verify", renderVerify(base)],
  ["reset", renderReset(base)],
] as const;

describe("the emails Convex Auth sends", () => {
  it("leaves no merge token unfilled", () => {
    // render() throws on this, so reaching the assertion is most of the test.
    for (const [name, r] of both) {
      expect(r.html, `${name} shipped a raw token`).not.toMatch(/\{\{[a-z_]+\}\}/);
    }
  });

  it("is branded as Meetrao, not as the auth library", () => {
    for (const [name, r] of both) {
      expect(r.subject, `${name} kept a default subject`).not.toMatch(/sign in to/i);
      expect(r.html, `${name} has no logo`).toContain("/brand/meetrao-email-logo.png");
    }
  });

  /* The defect that shipped on the Supabase template for weeks: a footer with
     the company name and no address. It is the one thing anti-spam law asks
     to be in there. */
  it("carries the postal address", () => {
    for (const [name, r] of both) {
      expect(r.html, `no postal address in the ${name} email`).toContain(POSTAL_ADDRESS);
    }
  });

  /* An unsubscribe pointing at /settings/notifications needs the account the
     recipient is in the middle of confirming or recovering. One that cannot
     work is worse than none, and neither message is one anybody may opt out
     of, without it they cannot get into their own account. */
  it("offers no unsubscribe on either, because both are transactional", () => {
    for (const [name, r] of both) {
      expect(r.html.toLowerCase(), `${name} offers an unsubscribe`).not.toContain("unsubscribe");
      expect(r.html.toLowerCase(), `${name} links email preferences`).not.toContain("preferences");
    }
  });

  /* Each link has to reach the page that can spend its code, and they are
     different pages. Sending a reset to /verify would dead-end every recovery. */
  it("points each link at the page that can spend its code", () => {
    expect(renderVerify(base).html).toContain("https://meetrao.com/verify?email=");
    expect(renderReset(base).html).toContain("https://meetrao.com/reset?email=");
    for (const [name, r] of both) {
      expect(r.html, `${name} dropped the code`).toContain(`code=${base.code}`);
    }
  });

  /* The address reaches the markup only inside the link, so encodeURIComponent
     is the first defence and escapeHtml the second. a hostile address comes
     out percent-encoded, not as `&lt;script&gt;`. Both layers are asserted:
     nothing executable survives, and the encoding is the reason. */
  it("neutralises a hostile address rather than interpolating it", () => {
    const nasty = renderVerify({ ...base, to: '"><script>alert(1)</script>@x.com' });
    // No tag is formed: the angle brackets are percent-encoded...
    expect(nasty.html).not.toContain("<script>");
    expect(nasty.html).toContain("%3Cscript%3E");
    // ...and the quote that would have closed the href is too. The payload's
    // letters survive as inert text inside the URL, which is the point,
    // encoding neutralises it rather than removing it.
    expect(nasty.html).toContain("%22");
  });

  /* The postal address is NOT url-encoded. It is visible text in the footer,
     so escapeHtml is the only thing standing between it and the markup. */
  it("escapes a value that renders as visible text", () => {
    const r = renderVerify({ ...base, postalAddress: 'Somewhere <b>& "there"' });
    expect(r.html).toContain("Somewhere &lt;b&gt;&amp; &quot;there&quot;");
    expect(r.html).not.toContain("<b>&");
  });

  /* A trailing slash on SITE_URL would otherwise produce meetrao.com//verify,
     which is a different path to anything registered. */
  it("tolerates a trailing slash on the site URL", () => {
    expect(renderVerify({ ...base, site: "https://meetrao.com/" }).html).toContain(
      "https://meetrao.com/verify?email=",
    );
  });
});

describe("humanExpiry", () => {
  const at = (ms: number) => humanExpiry(new Date(1_000_000 + ms), 1_000_000);

  it("rounds hours once it is worth doing", () => {
    expect(at(24 * 3600_000)).toBe("24 hours");
    expect(at(2 * 3600_000)).toBe("2 hours");
  });

  it("stays in minutes while minutes are the useful unit", () => {
    expect(at(45 * 60_000)).toBe("45 minutes");
    expect(at(60_000)).toBe("1 minute");
  });

  /* An already-expired code should not read "-3 minutes" in a real email. */
  it("never reads as negative", () => {
    expect(at(-60 * 60_000)).toBe("1 minute");
  });
});
