import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   The two disclosures Google's OAuth verification checks for by name.

   Both facts were already in this policy before the review — section 7 lists
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
       stood for — a token no browser session can read — is now made by
       function-level authorization instead, so the phrase to pin is the one
       that is still true. Pinning the old one would have kept a false
       sentence in a legal document green. */
    for (const mechanism of ["Encrypted in transit", "Encrypted at rest", "internal database functions", "two-factor"]) {
      expect(PAGE, `${mechanism} is no longer stated`).toContain(mechanism);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   The same claim in three places.

   /privacy is written for a reviewer, /help for a host who is hesitating, and
   the onboarding step for one who is about to click Allow. They are different
   audiences and different lengths, and that is fine — but they cannot say
   different things about what Meetrao does with the permission.

   The failure this guards is the ordinary one: somebody improves the wording
   in a single place, and the product now makes two promises.
   ───────────────────────────────────────────────────────────────────────────── */

describe("what the Google permission does, said consistently", () => {
  const help = readFileSync(path.join(process.cwd(), "src", "app", "help", "page.tsx"), "utf8");
  const onboarding = readFileSync(
    path.join(process.cwd(), "src", "components", "onboarding", "steps.tsx"),
    "utf8",
  );

  it("reads all three surfaces", () => {
    // Guards the guard: a renamed file passes every assertion below.
    expect(PAGE.length).toBeGreaterThan(5000);
    expect(help.length).toBeGreaterThan(5000);
    expect(onboarding.length).toBeGreaterThan(2000);
  });

  it("names the three scopes on both the policy and the help page", () => {
    for (const scope of ["calendar.freebusy", "calendar.events", "userinfo.email"]) {
      expect(PAGE, `the policy no longer names ${scope}`).toContain(scope);
      expect(help, `the help centre no longer names ${scope}`).toContain(scope);
    }
  });

  /* Reading a guest's answer is the narrow exception to "only busy or free",
     and it was added deliberately. All three have to carry it, or one of them
     is making the old, wider promise. */
  it("discloses the attendee read everywhere it is claimed", () => {
    for (const [name, text] of [["policy", PAGE], ["help", help], ["onboarding", onboarding]] as const) {
      expect(text.toLowerCase(), `${name} does not mention reading a guest's answer`).toMatch(
        /accepted or declined|whether your guest accepted|accepted the invitation|accepted or declined it/,
      );
    }
  });

  it("says disconnecting revokes with Google, not only with us", () => {
    for (const [name, text] of [["help", help], ["onboarding", onboarding]] as const) {
      expect(text, `${name} does not say the permission is revoked with Google`).toMatch(
        /revoke[sd]? (the permission )?with Google|not only with (us|Meetrao)|not just with (us|Meetrao)/i,
      );
    }
  });

  it("keeps the help centre's section reachable from its contents", () => {
    expect(help).toMatch(/\{ id: "calendar", icon: "calendar", label: "Google Calendar" \}/);
    expect(help).toContain('id="calendar"');
  });
});
