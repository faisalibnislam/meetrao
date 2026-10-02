import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* ─────────────────────────────────────────────────────────────────────────────
   The custom domain has to say which thing went wrong.

   WHAT THIS GUARDS, AND HOW IT WAS FOUND. Claiming a domain the Vercel API
   refuses looked identical to claiming one on a deployment with no Vercel
   credentials at all: both ended at "Could not check. Try again shortly."
   Worse, Claim had no branch for a refusal, so a domain Vercel had rejected
   reported "Domain claimed" and then never verified.

   Vercel's own message was being fetched and dropped. It is the only sentence
   that distinguishes "ring your DNS provider" from "ring the operator", and
   without it the feature cannot be debugged by the person using it, or by
   anybody helping them.
   ───────────────────────────────────────────────────────────────────────────── */

const PANEL = readFileSync(
  path.join(process.cwd(), "src/components/app/branding-panel.tsx"),
  "utf8",
);

const STATES = ["verified", "pending", "unconfigured", "error"] as const;

describe("every DomainState is answered", () => {
  const reader = PANEL.slice(PANEL.indexOf("function readDomainState"));
  const body = reader.slice(0, reader.indexOf("\n}"));

  it.each(STATES)("%s has its own branch", (state) => {
    expect(body, `${state} falls through to the default`).toContain(`case "${state}":`);
  });

  it("shows Vercel's own message rather than a generic line", () => {
    // The whole point: state.message names the real cause, usually the TLD, a
    // name already in use, or a token that may not add domains.
    const errorCase = body.slice(body.indexOf('case "error":'));
    expect(errorCase).toContain("state.message");
  });

  it("does not report a refusal as a success", () => {
    const errorCase = body.slice(body.indexOf('case "error":'));
    expect(errorCase.slice(0, errorCase.indexOf("};"))).toContain('tone: "bad"');
  });

  it("tells a host that an unconfigured deployment is not theirs to fix", () => {
    const unconfigured = body.slice(body.indexOf('case "unconfigured":'));
    expect(unconfigured.slice(0, unconfigured.indexOf("};"))).toMatch(/operator/i);
  });
});

describe("both actions read the state the same way", () => {
  /* They did not, which is how the two paths disagreed. Claim handled
     unconfigured and pending; Check DNS handled verified and pending. */
  it("neither handler re-implements the branching", () => {
    const calls = PANEL.match(/reportDomain\(/g) ?? [];
    // One definition plus the two call sites.
    expect(calls.length).toBeGreaterThanOrEqual(3);

    const afterHelper = PANEL.slice(PANEL.indexOf("export function BrandingPanel"));
    expect(afterHelper, "a handler is branching on status again").not.toMatch(
      /result\.state\?\.status === "(unconfigured|error)"/,
    );
  });
});

describe("the message stays on screen", () => {
  it("a failure is persisted, not only toasted", () => {
    /* A toast is gone in a few seconds. A DNS or credentials problem is read,
       acted on somewhere else, and come back to. */
    expect(PANEL).toContain("setDomainNote");
    expect(PANEL).toContain("persist");
  });

  it("clears when the domain is removed", () => {
    const remove = PANEL.slice(PANEL.indexOf("await removeDomain()"));
    expect(remove.slice(0, 400)).toContain("setDomainNote(null)");
  });
});

describe("the two Remove buttons are told apart", () => {
  /* Not a nicety. Both buttons read "Remove", a script clicked by label, and a
     host's logo was deleted instead of their domain claim. */
  it("each names what it removes", () => {
    expect(PANEL).toContain('aria-label="Remove your logo"');
    expect(PANEL).toMatch(/aria-label=\{`Remove the domain/);
  });
});
