import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { MOVED_TABS, PERSONAL_TABS, SETTINGS_TABS } from "@/lib/settings-tabs";
import { LONG_OPTIONS, SHORT_OPTIONS, leadLabel, leadsOf, remindersText } from "@/lib/reminder-timing";
import { LONG_CHOICES, SHORT_CHOICES } from "@/convex/lib/reminderWindow";

/* ─────────────────────────────────────────────────────────────────────────────
   Settings saying one thing in one place.

   Each block here is a screen that used to contradict itself or another one:
   a help line pointing at a control that did not exist, a timezone editable
   in two places, reminder times described as fixed on one tab and editable
   on another, a plan named three times without its price, an address that
   said billing under a label that said Plan.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const PANELS = read("src/components/app/settings-panels.tsx");
const BILLING = read("src/components/app/billing-panel.tsx");
const PAGE = read("src/app/(app)/settings/[[...tab]]/page.tsx");

/** The source of one exported panel, up to the next section marker. */
function panel(name: string): string {
  const start = PANELS.indexOf(`export function ${name}`);
  expect(start, `missing ${name}`).toBeGreaterThan(-1);
  const next = PANELS.indexOf("/* ── ", start + 1);
  return PANELS.slice(start, next === -1 ? undefined : next);
}

describe("the Plan tab's address", () => {
  it("is /settings/plan, under the label Plan", () => {
    expect(PERSONAL_TABS.find((t) => t.key === "plan")?.label).toBe("Plan");
    expect(SETTINGS_TABS.some((t) => (t.key as string) === "billing")).toBe(false);
  });

  /* Polar checkouts already in flight return to /settings/billing?welcome=1,
     and the welcome note depends on that query surviving the hop. */
  it("redirects the old address, keeping the query string", () => {
    expect(MOVED_TABS.billing).toBe("plan");
    expect(PAGE).toContain("MOVED_TABS[segments[0]]");
    expect(PAGE).toMatch(/permanentRedirect\(`\/settings\/\$\{moved\}\$\{rest \? `\?\$\{rest\}` : ""\}`\)/);
    // Before the session check, so a signed-out visitor is asked to sign in on the new URL.
    expect(PAGE.indexOf("permanentRedirect(")).toBeLessThan(PAGE.indexOf("await requireOnboardedSession()"));
  });

  it("is what every internal link and the checkout return point at", () => {
    for (const file of [
      "src/lib/actions/billing.ts",
      "src/components/app/upgrade.tsx",
      "src/components/app/branding-panel.tsx",
      "src/components/app/meeting-form.tsx",
      "src/components/onboarding/steps.tsx",
    ]) {
      expect(read(file), file).not.toContain("/settings/billing");
    }
    expect(read("src/lib/actions/billing.ts")).toContain("/settings/plan?welcome=1");
  });
});

describe("the email address", () => {
  /* There is no change-email control anywhere; the line used to say there was. */
  it("does not point at a control that does not exist", () => {
    expect(PANELS).not.toContain("Change this from the Account tab");
  });

  it("says the same thing on Profile and Account, with a way to get it changed", () => {
    expect(PANELS).toContain('href="/support"');
    expect(panel("ProfilePanel")).toContain("help={<EmailHelp />}");
    expect(panel("AccountPanel")).toContain("<EmailHelp />");
  });
});

describe("the Calendar tab", () => {
  const CAL = panel("CalendarPanel");

  it("says the connection status once, beside one button", () => {
    expect(CAL).not.toContain('"Disconnected"');
    expect(CAL).not.toContain("<Badge");
    expect(CAL).toContain('"Not connected"');
  });

  /* Edited on Availability only, where the hours it is read in live. */
  it("shows the timezone read-only, with a way to Availability", () => {
    expect(CAL).not.toContain("saveTimezone");
    expect(CAL).not.toContain("<MenuSelect");
    expect(CAL).toContain('href="/availability"');
    expect(CAL).toContain("Change on Availability");
  });
});

describe("booking defaults", () => {
  const BOOK = panel("BookingPanel");

  it("sets all four rules a meeting carries", () => {
    for (const label of ["Duration", "Buffer after each meeting", "Minimum notice", "Booking window"]) {
      expect(BOOK).toContain(`label="${label}"`);
    }
  });

  it("are what a new meeting starts with", () => {
    const NEW = read("src/app/(app)/meetings/new/page.tsx");
    expect(NEW).toContain("buffer: profile.default_buffer_minutes ?? 0");
    expect(NEW).toContain("window: profile.default_window_days ?? 30");
  });

  /* The meeting form offers these lists; a default it cannot show would be
     a blank menu on the next new meeting. */
  it("are checked against the meeting form's own lists", () => {
    const action = read("src/lib/actions/settings.ts");
    expect(action).toContain("![0, 5, 10, 15].includes(input.buffer)");
    expect(action).toContain("![7, 14, 30, 60].includes(input.window)");
    const convex = read("convex/profiles.ts");
    expect(convex).toContain("![0, 5, 10, 15].includes(buffer)");
    expect(convex).toContain("![7, 14, 30, 60].includes(windowDays)");
  });
});

describe("the Account tab", () => {
  const ACCOUNT = panel("AccountPanel");

  it("puts Log out before the danger zone, and the danger zone last", () => {
    const logOut = ACCOUNT.indexOf("onClick={onSignOut}");
    const danger = ACCOUNT.indexOf("Danger zone");
    const del = ACCOUNT.indexOf('onClick={() => setDialog("delete")}');
    expect(logOut).toBeGreaterThan(-1);
    expect(danger).toBeGreaterThan(logOut);
    expect(del).toBeGreaterThan(danger);
  });
});

describe("reminder timing", () => {
  it("lives on Notifications, not on Plan", () => {
    expect(BILLING).not.toContain("saveReminderTiming");
    expect(BILLING).not.toContain('aria-label="First reminder"');
    const NOTIFY = panel("NotificationsPanel");
    expect(NOTIFY).toContain('aria-label="First reminder"');
    expect(NOTIFY).toContain('aria-label="Second reminder"');
    expect(NOTIFY).toContain("saveReminderTiming");
  });

  /* Free still sees the controls, disabled, with the upgrade line. Convex
     refuses the write for Free either way. */
  it("keeps the plan gate", () => {
    const NOTIFY = panel("NotificationsPanel");
    expect(NOTIFY).toContain("disabled={!pro}");
    expect(NOTIFY).toContain('<UpgradeHint to="pro"');
    expect(NOTIFY).toContain("if (pro && timingChanged)");
    expect(PAGE).toContain("<NotificationsPanel profile={session.profile} pro={await isProNow()} />");
  });

  it("describes the times actually in force, not fixed copy", () => {
    expect(PANELS).not.toContain("A nudge the day before and an hour before");
    expect(remindersText(1440, 60)).toBe(
      "Emailed 1 day before and 1 hour before each meeting. Your guest is reminded at the same times either way.",
    );
    expect(remindersText(2880, 30)).toContain("2 days before and 30 minutes before");
  });

  it("reads absent as the free schedule", () => {
    expect(leadsOf({})).toEqual({ long: 1440, short: 60 });
    expect(leadsOf({ reminder_long_minutes: 720, reminder_short_minutes: 15 })).toEqual({ long: 720, short: 15 });
  });

  /* Built from the lists Convex enforces, so the menu cannot offer a time
     the mutation refuses. */
  it("offers exactly what Convex accepts", () => {
    expect(LONG_OPTIONS.map((o) => Number(o.value))).toEqual([...LONG_CHOICES]);
    expect(SHORT_OPTIONS.map((o) => Number(o.value))).toEqual([...SHORT_CHOICES]);
    expect(leadLabel(720)).toBe("12 hours before");
    expect(leadLabel(15)).toBe("15 minutes before");
  });
});

describe("the Plan screen", () => {
  /* "Business [Active]" and then "Active" again, with no price or date. */
  it("names the plan once, without an Active badge", () => {
    expect(BILLING).not.toMatch(/>\s*Active\s*</);
    expect(BILLING).not.toContain(': "Active"');
    expect(BILLING).toContain("{PLAN_NAME[plan.plan]}");
  });

  it("shows the price, the renewal date and what the plan covers", () => {
    for (const label of ['label="Price"', "label={untilLabel}", 'label="Companies"', 'label="People per company"']) {
      expect(BILLING).toContain(label);
    }
    expect(BILLING).toContain('plan.cancelsAtPeriodEnd ? "Ends" : "Renews"');
  });

  it("has a subtitle for each plan, not one sales line for all three", () => {
    expect(BILLING).not.toContain("Pro adds the parts a business needs");
    expect(BILLING).toContain("subtitle={SUBTITLE[plan.plan]}");
    expect(BILLING).toMatch(/const SUBTITLE: Record<Plan, string> = \{\s*free:/);
  });

  /* The browser's disclosure triangle was the one control on the screen not
     drawn in the app's style. */
  it("draws the comparison toggle with the app's chevron", () => {
    expect(BILLING).not.toContain("<details");
    expect(BILLING).not.toContain("<summary");
    expect(BILLING).toContain("aria-expanded={comparing}");
    expect(BILLING).toContain('name="chevron-down"');
  });

  it("reads cadence and cancellation from the billing query", () => {
    const BILLING_CONVEX = read("convex/billing.ts");
    expect(BILLING_CONVEX).toContain("cadence: subscribed ? cadenceOf(me.polar_product_id, settings) : null");
    expect(BILLING_CONVEX).toContain("polar_product_id: a.productId ?? profile.polar_product_id ?? null");
    expect(read("src/app/api/polar/webhook/route.ts")).toContain("cancelAtPeriodEnd:");
  });
});
