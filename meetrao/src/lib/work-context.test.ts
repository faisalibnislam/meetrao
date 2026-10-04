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
const SWITCHER = read("src/components/app/workspace-menu.tsx");

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

describe("the workspace switcher", () => {
  /* TWO CONTROLS, and the split is the point. One answers "which company am
     I working in", which changes what every screen shows and is something
     somebody does several times an hour. The other answers "where do I go to
     change my own things", which changes nothing until you arrive and is
     something they do once a month. Logging out does not belong beside
     switching. */
  it("is a switcher, and nothing else", () => {
    expect(SWITCHER).toContain('role="menuitemradio"');
    expect(SWITCHER).toContain("aria-checked={w.id === activeId}");
    for (const gone of ["Log out", "Help centre", "Support", "onSignOut"]) {
      expect(SWITCHER, `${gone} moved to the settings menu`).not.toContain(gone);
    }
  });

  /* Most accounts have no companies. A menu offering a single choice teaches
     people the product has a concept they do not have, every time they open
     it, so with one workspace this stops being a control at all. */
  it("is a plain label when there is only one workspace", () => {
    expect(SWITCHER).toContain("const only = workspaces.length <= 1;");
    expect(SWITCHER).toContain("if (only) {");
  });

  it("says where you are and whose account it is", () => {
    expect(SWITCHER).toContain(
      "aria-label={`${active.name}, signed in as ${email}. Switch workspace.`}",
    );
  });
});

describe("the settings menu", () => {
  const RAIL = read("src/components/app/sidebar.tsx");
  const MENU = read("src/components/app/settings-menu.tsx");

  it("sits at the foot of the rail, not on the switcher", () => {
    expect(RAIL).toContain("<SettingsMenu");
    const at = RAIL.indexOf("<SettingsMenu");
    const switcher = RAIL.indexOf("<WorkspaceMenu");
    expect(at, "below everything a host uses daily").toBeGreaterThan(switcher);
  });

  it("carries the four things that left the switcher", () => {
    for (const label of ["Help centre", "Support", "Log out"]) {
      expect(MENU).toContain(label);
    }
    expect(MENU).toContain('href="/settings"');
  });

  /* Settings belong to the workspace in force, which is why the label still
     names its KIND. Pasting the company's name in reads as a thing belonging
     to that company, and the row changes width on every switch. */
  it("labels settings by workspace kind, not by name", () => {
    expect(RAIL).toContain('settingsLabel={activeContextId ? "Company settings" : "Settings"}');
    expect(RAIL).not.toContain("`${active.name} settings`");
  });

  /* It is pinned to the bottom of the rail, so a menu opening downward would
     run off the screen. */
  it("opens upward", () => {
    expect(MENU).toContain("bottom-[calc(100%+6px)]");
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   State that belongs to one workspace must not survive into another.

   Both screens below seed their fields from props ONCE. Switching company,
   or switching workspace while staying on the same page, re-renders with new
   props and keeps the old fields, so the screen showed one company's values
   under another's name and Save wrote them onto the wrong one. Found with two
   companies both called "Airly Studio": editing either changed both.
   ───────────────────────────────────────────────────────────────────────────── */

describe("one workspace's fields never carry into another", () => {
  const PANEL = read("src/components/app/companies-panel.tsx");
  const SETTINGS = read("src/app/(app)/settings/[[...tab]]/page.tsx");

  it("gives each company its own card", () => {
    expect(PANEL).toContain("key={current.id}");
  });

  it("starts every settings panel again when the workspace changes", () => {
    expect(SETTINGS).toContain('key={context.companyId ?? "personal"}');
  });

  /* Two companies can share a display name; only the link name is unique. */
  it("tells two same-named companies apart", () => {
    expect(PANEL).toContain("/{c.slug}");
  });
});
