import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   The two disclosures Google's OAuth verification checks for by name.

   Both facts were already in this policy before the review, section 7 lists
   every processor, section 11 describes TLS, encryption at rest and the
   row-level security on the token table. The verification response still said
   the policy "does not state with whom you share, transfer, or disclose Google
   user data" and "does not specify any data protection mechanisms for
   sensitive data".

   That is not a contradiction, and the lesson is worth keeping: a reviewer
   works a checklist against the phrase "Google user data", and a disclosure
   written about "your data" in general does not answer it. The same facts had
   to be restated inside the Google section, in the reviewer's own vocabulary.

   Which makes this duplication load-bearing. It looks redundant, a future
   tidy-up would remove it, and removing it costs another verification round
   trip measured in weeks.
   ───────────────────────────────────────────────────────────────────────────── */

const PAGE = readFileSync(
  path.join(process.cwd(), "src", "app", "(marketing)", "privacy", "page.tsx"),
  "utf8",
);

describe("the Google user data disclosures", () => {
  it("reads the policy at all", () => {
    // Guards the guard: a renamed file passes everything below by finding
    // nothing to check.
    expect(PAGE.length).toBeGreaterThan(5000);
    expect(PAGE).toContain("Google Limited Use");
  });

  it.each([
    ["p-google-share", "who receives Google user data"],
    ["p-google-protect", "how Google user data is protected"],
  ])("keeps the %s section", (id, what) => {
    expect(PAGE, `the section on ${what} is gone`).toContain(`id="${id}"`);
  });

  it("is reachable from the contents rail, not only by scrolling", () => {
    for (const id of ["p-google-share", "p-google-protect"]) {
      expect(PAGE).toMatch(new RegExp(`\\{ id: "${id}", label:`));
    }
  });

  /* The checklist phrase itself. Without it, a reviewer scanning for "Google
     user data" finds a policy that talks only about "your data". */
  it("uses the phrase a reviewer searches for, more than once", () => {
    const times = PAGE.split(/Google user data/gi).length - 1;
    expect(times, "the policy barely says 'Google user data'").toBeGreaterThanOrEqual(6);
  });

  it("names every recipient, and says what each one gets", () => {
    const block = PAGE.slice(PAGE.indexOf("GOOGLE_DATA_RECIPIENTS"), PAGE.indexOf("const PROCESSORS"));
    for (const name of ["Convex", "Vercel", "Resend", "Google"]) {
      expect(block, `${name} is not named as a recipient`).toContain(name);
    }
    // A name with no explanation beside it is not a disclosure.
    const entries = block.match(/\[\s*\n\s*"[^"]+",\s*\n\s*"[^"]+"/g) ?? [];
    expect(entries.length).toBeGreaterThanOrEqual(4);
  });

  /* Analytics must never appear on the recipient list. It is on the general
     processor list, receives no Google user data, and saying otherwise would
     be both false and a Limited Use problem. */
  it("never lists an analytics provider as receiving Google user data", () => {
    const block = PAGE.slice(PAGE.indexOf("GOOGLE_DATA_RECIPIENTS"), PAGE.indexOf("const PROCESSORS"));
    expect(block.toLowerCase()).not.toContain("analytics");
  });

  it("states the negative as well as the positive", () => {
    // "Who we share it with" is only half a disclosure without "and nobody
    // else, and never for these purposes".
    for (const phrase of ["Nobody else", "advertisers", "not sold", "machine-learning models"]) {
      expect(PAGE, `the sharing section does not rule out ${phrase}`).toContain(phrase);
    }
  });

  it("lists concrete protection mechanisms, not adjectives", () => {
    /* "row-level security" was here until the move off Postgres. The claim it
       stood for (a token no browser session can read) is now made by
       function-level authorization instead, so the phrase to pin is the one
       that is still true. Pinning the old one would have kept a false
       sentence in a legal document green. */
    for (const mechanism of ["Encrypted in transit", "Encrypted at rest", "internal database functions", "two-factor"]) {
      expect(PAGE, `${mechanism} is no longer stated`).toContain(mechanism);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   The calendar feed, said consistently.

   Meetrao no longer connects to Google Calendar. Conflicts come from a
   calendar feed the host pastes in, and only busy times are kept from it.
   /privacy is written for a reviewer, /help for a host who is hesitating, and
   they are different lengths, but they cannot say different things about what
   Meetrao keeps.

   The failure this guards is the old promise surviving somewhere: a page that
   still names calendar.events, or still says Meetrao writes to a calendar.
   ───────────────────────────────────────────────────────────────────────────── */

const strip = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("what Meetrao keeps from a calendar, said consistently", () => {
  const help = readFileSync(path.join(process.cwd(), "src", "app", "help", "page.tsx"), "utf8");
  const guide = readFileSync(
    path.join(process.cwd(), "src", "app", "(marketing)", "guides", "calendar-privacy", "page.tsx"),
    "utf8",
  );
  const terms = readFileSync(path.join(process.cwd(), "src", "app", "(marketing)", "terms", "page.tsx"), "utf8");

  it("reads every surface", () => {
    // Guards the guard: a renamed file passes every assertion below.
    expect(PAGE.length).toBeGreaterThan(5000);
    expect(help.length).toBeGreaterThan(5000);
    expect(guide.length).toBeGreaterThan(3000);
    expect(terms.length).toBeGreaterThan(3000);
  });

  it("describes the calendar feed in the policy, reachable from the rail", () => {
    expect(PAGE).toContain('id="p-calendar-feed"');
    expect(PAGE).toMatch(/\{ id: "p-calendar-feed", label:/);
    // What the host gives, how it is stored, what is kept, how to remove it.
    for (const phrase of ["feed", ".ics", "masked", "busy periods", "Settings"]) {
      expect(PAGE, `the policy no longer mentions ${phrase}`).toContain(phrase);
    }
    expect(PAGE).toMatch(/titles,\s+descriptions,\s+attendees\s+and\s+locations/);
    expect(PAGE, "the policy does not say earlier Google tokens were deleted").toMatch(/revoked[\s\S]{0,80}tokens deleted/);
  });

  it("says emailed invites carry the meeting details", () => {
    expect(PAGE).toContain('id="p-invites"');
    expect(PAGE).toMatch(/calendar invite/);
  });

  it("asks Google for the basic profile only", () => {
    for (const scope of ["openid", "email", "profile"]) {
      expect(PAGE).toContain(scope);
    }
  });

  /* No surface may promise or disclose a calendar scope Meetrao no longer holds.
     Comments are stripped: an explanation of history is not a claim. */
  it.each(["calendar.events", "calendar.freebusy", "userinfo.email"])("no longer requests %s", (scope) => {
    expect(strip(PAGE), `the policy still names ${scope}`).not.toContain(scope);
    expect(strip(help), `the help centre still names ${scope}`).not.toContain(scope);
    expect(strip(terms), `the terms still name ${scope}`).not.toContain(scope);
  });

  it("does not promise to read a guest's RSVP any more", () => {
    for (const [name, text] of [["policy", PAGE], ["help", help], ["terms", terms]] as const) {
      expect(strip(text).toLowerCase(), `${name} still says Meetrao reads a guest's answer`).not.toMatch(
        /whether (your|the) guest accepted/,
      );
    }
  });

  it("says Meetrao never writes to the calendar, on the policy and the help page", () => {
    expect(PAGE).toMatch(/never writes to your calendar/);
    expect(help).toMatch(/never writes to your calendar/);
  });

  it("keeps the help centre's feed, video and invite sections reachable from its contents", () => {
    expect(help).toMatch(/\{ id: "calendar", icon: "calendar", label: "Your calendar feed" \}/);
    for (const id of ["calendar", "video", "invites"]) {
      expect(help).toContain(`id="${id}"`);
    }
  });

  it("walks through finding the feed in each provider", () => {
    for (const phrase of ["Secret address in iCal format", "Publish a calendar", "ICS link", "Public Calendar"]) {
      expect(help, `the help centre no longer explains "${phrase}"`).toContain(phrase);
    }
  });
});

/* No marketing copy may still promise the calendar.events scope. The
   calendar-privacy guide is left out on purpose: it explains the scope as a
   general fact about Google's API, not as something Meetrao asks for. */
describe("marketing never promises the old Google Calendar integration", () => {
  const files = [
    ["lib/pricing.ts"],
    ["lib/comparisons.ts"],
    ["lib/faq.ts"],
    ["lib/seo.ts"],
    ["lib/audiences.ts"],
    ["components/marketing/pricing-band.tsx"],
    ["components/marketing/use-cases.tsx"],
    ["components/marketing/walkthrough.tsx"],
  ].map(([f]) => [f, strip(readFileSync(path.join(process.cwd(), "src", f), "utf8"))] as const);

  it.each(files)("%s promises no calendar.events, no Meet link per booking, no 'both calendars' event", (_f, text) => {
    expect(text).not.toContain("calendar.events");
    expect(text).not.toMatch(/Google Meet link (on|created on) every/i);
    expect(text).not.toMatch(/Connect (your )?Google Calendar/i);
  });
});
