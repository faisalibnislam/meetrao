import { describe, expect, it } from "vitest";
import { accountFrom } from "@/lib/nav-account";
import type { Profile } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────────────────────
   The marketing nav decides what to draw from two things that can each be
   missing: a session, and a profile read that happens separately and can fail
   on its own.

   The failure worth guarding is the quiet one. With a session but no profile,
   the obvious code builds an account with an empty name, which renders as a
   blank avatar chip with blank initials, in place of two buttons that worked.
   Nothing throws, nothing logs, and the only person who sees it is a signed-in
   host looking at a broken control on the home page.
   ───────────────────────────────────────────────────────────────────────────── */

const profile = (over: Partial<Profile>) =>
  ({
    id: "u1",
    username: "adam-voigt",
    full_name: "Adam Voigt-Fitzgerald",
    email: "adam@example.com",
    avatar_url: null,
    ...over,
  }) as Profile;

describe("accountFrom", () => {
  it("prefers the full name", () => {
    expect(accountFrom(profile({}), "adam@example.com")).toEqual({
      name: "Adam Voigt-Fitzgerald",
      email: "adam@example.com",
      avatarUrl: null,
    });
  });

  it("falls back to the username when there is no full name", () => {
    expect(accountFrom(profile({ full_name: "" }), "adam@example.com")).toMatchObject({ name: "adam-voigt" });
  });

  it("falls back to the email's local part when there is neither", () => {
    expect(accountFrom(profile({ full_name: "", username: "" }), "adam@example.com")).toMatchObject({
      name: "adam",
    });
  });

  it("carries the avatar through", () => {
    expect(accountFrom(profile({ avatar_url: "https://x/y.png" }), "a@b.com")).toMatchObject({
      avatarUrl: "https://x/y.png",
    });
  });

  it("takes the email from the profile when the session has none", () => {
    expect(accountFrom(profile({}), null)).toMatchObject({ email: "adam@example.com" });
  });

  /* The one that matters: a session whose profile read failed. Rendering a
     nameless account chip is worse than rendering the signed-out nav. */
  it("shows the signed-out nav rather than a nameless account chip", () => {
    expect(accountFrom(null, null)).toBe("signed-out");
    expect(accountFrom(null, "")).toBe("signed-out");
    expect(accountFrom(profile({ full_name: "", username: "", email: "" }), "")).toBe("signed-out");
  });

  /* A profile read that fails is not the same as being signed out, and the
     session's email is enough to draw a correct menu on its own. */
  it("still builds a menu from the session alone when the profile is missing", () => {
    expect(accountFrom(null, "adam@example.com")).toEqual({
      name: "adam",
      email: "adam@example.com",
      avatarUrl: null,
    });
  });

  it("never produces an account with an empty name", () => {
    const cases: [Profile | null, string | null][] = [
      [null, null],
      [null, ""],
      [null, "a@b.com"],
      [profile({}), null],
      [profile({ full_name: "", username: "" }), "a@b.com"],
      [profile({ full_name: "", username: "", email: "" }), null],
    ];
    for (const [row, email] of cases) {
      const got = accountFrom(row, email);
      if (got !== "signed-out") expect(got.name, JSON.stringify([row?.full_name, email])).not.toBe("");
    }
  });
});
