import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   The company you are working in.

   A COOKIE IS A PREFERENCE, NOT A PERMISSION, and that is the whole of the
   security story here. The cookie is read, then checked against the caller's
   real memberships, so a forged one selects a context the person is already
   in or falls back to personal. It never grants access to a company they are
   not in.

   Checked in two places on purpose: the action refuses a bad value so one is
   never written, and every read re-checks so a value written before somebody
   was removed from a company stops working the moment they are. Validating
   only on write would leave a removed member working in a company they have
   left until they happened to switch.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const CONTEXT = read("src/lib/data/context.ts");
const ACTION = read("src/lib/actions/context.ts");
const MEETINGS_PAGE = read("src/app/(app)/meetings/page.tsx");
const MEETINGS_ACTION = read("src/lib/actions/meetings.ts");
const SWITCHER = read("src/components/app/context-switcher.tsx");

describe("the cookie is checked, not trusted", () => {
  it("validates on every read", () => {
    const fn = CONTEXT.slice(CONTEXT.indexOf("export async function activeContext"));
    expect(fn).toContain("contextChoices()");
    expect(fn).toContain("choices.find((c) => c.id === wanted)");
  });

  /* A company somebody was removed from must stop being selectable the moment
     they are removed, not the next time they switch. */
  it("falls back to personal when the cookie names a company they are not in", () => {
    const fn = CONTEXT.slice(CONTEXT.indexOf("export async function activeContext"));
    expect(fn).toContain('{ companyId: null, name: "Personal" }');
  });

  it("also refuses a bad value on write, so one is never stored", () => {
    expect(ACTION).toContain("choices.some((c) => c.id === companyId)");
    expect(ACTION).toContain("That is not one of your companies.");
  });

  it("builds its choices from real memberships", () => {
    const fn = CONTEXT.slice(CONTEXT.indexOf("export async function contextChoices"));
    expect(fn).toContain("api.companies.mine");
  });

  it("keeps the cookie off the client", () => {
    expect(ACTION).toContain("httpOnly: true");
    expect(ACTION).toContain('sameSite: "lax"');
  });
});

describe("switching changes what you are working on", () => {
  /* The point of the switcher. Without this it would change a label and
     nothing else, which is worse than not having it. */
  it("files a new meeting under the context in force", () => {
    expect(MEETINGS_ACTION).toContain("const context = await activeContext();");
    expect(MEETINGS_ACTION).toContain("company_id: context.companyId,");
  });

  /* Showing every meeting under a company heading would make it look as
     though a personal meeting is published on that company's domain, which is
     the one thing company scoping exists to make false. */
  it("lists only the meetings of the context in force", () => {
    expect(MEETINGS_PAGE).toContain("(m.company_id ?? null) === context.companyId");
  });

  /* Absent and null both mean personal: every row written before companies
     existed has neither, and `undefined === null` is false. */
  it("treats an absent company as personal", () => {
    expect(MEETINGS_PAGE).toContain("m.company_id ?? null");
  });
});

describe("the switcher itself", () => {
  /* Most accounts have no companies. A control offering one choice teaches
     people the product has a concept they do not have, every time they open
     it. */
  it("renders nothing when there is only one context", () => {
    expect(SWITCHER).toContain("if (options.length < 2) return null;");
  });

  it("says where you are, for a screen reader as well", () => {
    expect(SWITCHER).toContain("aria-label={`Working in ${active.name}. Switch company.`}");
    expect(SWITCHER).toContain('role="menuitemradio"');
    expect(SWITCHER).toContain("aria-checked={o.id === activeId}");
  });
});
