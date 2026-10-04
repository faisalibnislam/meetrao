import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   Rules from the design audit, written down where they cannot quietly drift.

   Each one was found by measuring the running app rather than by reading the
   code, and each is a rule a reasonable change would break without noticing:
   a new form wrapped in `mx-auto`, a dialog that forgets to trap focus, a
   chip copied into a feature file with its own selected colour.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("every screen's content starts where its title does", () => {
  /* Measured at 1280px: titles at x=268 on every screen, but Settings,
     Availability and New meeting centred a narrower column, landing at 331,
     397 and 430. Three different left edges for one product. A narrow column
     is right for a form; drifting it to the middle is not. */
  it.each([
    "src/components/app/meeting-form.tsx",
    "src/components/app/availability-screen.tsx",
    "src/components/app/schedule-form.tsx",
    "src/app/(app)/settings/[[...tab]]/page.tsx",
    "src/app/(app)/settings/loading.tsx",
  ])("%s does not centre its column", (file) => {
    expect(read(file)).not.toMatch(/mx-auto (flex|grid) w-full max-w-\[(560|600|660|780)px\]/);
  });

  /* A skeleton of a different layout is a layout shift with extra steps. */
  it("loads Availability in the shape it renders", () => {
    const skeleton = read("src/app/(app)/availability/loading.tsx");
    expect(skeleton).toContain("max-w-[660px]");
    expect(skeleton, "the real screen has no metric cards").not.toContain("CardsSkeleton");
  });
});

describe("nothing pans sideways on a phone", () => {
  /* The app scrolls inside a div, not the window, so a window-width check
     passed while Settings was 751px wide at 375. The tab strip took its
     natural width because the wrapper's desktop `items-start` carried into
     the stacked layout. */
  it("the settings tabs scroll inside their own strip", () => {
    expect(read("src/components/app/settings-nav.tsx")).toContain("max-[820px]:w-full max-[820px]:min-w-0");
  });

  /* A 190px floor inside a 164px grid track. */
  it("no rule field on the meeting form has a floor wider than its track", () => {
    expect(read("src/components/app/meeting-form.tsx")).not.toContain("min-w-[190px]");
  });
});

describe("one chip, one selected state", () => {
  /* Duration and Seats filled solid green when chosen while Location, on the
     same form, used a pale tint: two local copies of the shared chip. */
  it("the meeting form uses the shared chip for location", () => {
    const form = read("src/components/app/meeting-form.tsx");
    expect(form).toContain("<ChoiceChip key={o.value} selected={locationKind === o.value}");
    expect(form).not.toContain("border-accent bg-accent-soft font-semibold text-accent-ink");
  });

  it("the time-off dialog does too", () => {
    const screen = read("src/components/app/availability-screen.tsx");
    expect(screen).not.toContain("function ChoiceRow");
    expect(screen).not.toContain("border-accent bg-accent-soft font-semibold text-accent-ink");
  });
});

describe("keyboard focus can be seen", () => {
  const CSS = read("src/app/globals.css");

  /* It was a 3px halo at 12% black: about 1.3:1 on a white button and close
     to invisible around the accent one. */
  it("rings in the accent, not a faint halo", () => {
    const rule = CSS.slice(CSS.indexOf(":focus-visible {"));
    expect(rule.slice(0, 120)).toContain("outline: 2px solid var(--accent-ink)");
    expect(CSS).not.toMatch(/\*:focus-visible \{\s*outline: none;\s*box-shadow: var\(--ring\)/);
  });

  /* --accent-ink is rebound on a branded booking page to the host's colour,
     already darkened to 4.5:1, so the ring survives any brand. */
  it("uses the readable form of the accent", () => {
    expect(CSS).toContain("outline: 2px solid var(--accent-ink)");
  });

  it("leaves text fields to their own accent border", () => {
    expect(CSS).toMatch(/:where\(input:not\(\[type="checkbox"\]\)[^)]*\)[^{]*textarea, select\):focus-visible \{\s*outline: none;/);
  });
});

describe("the dialog shell", () => {
  const MODAL = read("src/components/ui/modal.tsx");

  /* aria-modal promised a trap; Tab walked out to the page behind it. */
  it("traps Tab in both directions", () => {
    expect(MODAL).toContain('if (e.key !== "Tab" || !cardRef.current) return;');
    expect(MODAL).toContain("last.focus();");
    expect(MODAL).toContain("first.focus();");
  });

  /* Read from a tracker of focus OUTSIDE dialogs, because a field with
     autoFocus inside is focused while React commits, before any effect. */
  it("hands focus back to whatever opened it", () => {
    expect(MODAL).toContain("const returnTo = lastFocusedOutside;");
    expect(MODAL).toContain("if (returnTo && document.contains(returnTo)) returnTo.focus();");
    expect(MODAL).toContain(`!target.closest('[role="dialog"]')`);
  });

  /* Restoring from the key handler's cleanup, which re-runs every render
     because onClose is passed inline, yanked focus out of the dialog after
     every keystroke. */
  it("restores from an effect keyed on `open` alone", () => {
    const at = MODAL.indexOf("const returnTo = lastFocusedOutside;");
    const effectEnd = MODAL.indexOf("}, [open]);", at);
    expect(effectEnd, "the restore effect depends on `open` only").toBeGreaterThan(at);
    expect(MODAL.slice(at, effectEnd)).not.toContain("onClose");
  });

  /* Focusing the container after an autoFocused field undid it, so every
     "type straight away" field had to be clicked first. */
  it("does not steal focus from a field that already has it", () => {
    expect(MODAL).toContain("if (card && !card.contains(document.activeElement)) card.focus();");
  });

  /* A tall dialog on a short screen had its buttons cut off below the fold,
     unreachable. */
  it("caps its height and scrolls the body, not the buttons", () => {
    expect(MODAL).toContain("max-h-[calc(100dvh-40px)]");
    expect(MODAL).toContain("overflow-y-auto px-[20px] py-[18px]");
  });

  it("renders no empty body for a header-and-buttons confirmation", () => {
    expect(MODAL).toContain("{children ? (");
  });

  it("is named and described by its own title and subtitle", () => {
    expect(MODAL).toContain("aria-labelledby={titleId}");
    expect(MODAL).toContain("aria-describedby={subtitle ? subtitleId : undefined}");
  });
});

describe("touch targets", () => {
  /* 20px tall, and the Meetings card puts it beside the title rather than in
     a label that could catch the tap. Coarse pointers only, so a widened
     target never steals a neighbour's mouse click. */
  it("the switch grows to 44px on a touch screen without changing size", () => {
    const controls = read("src/components/ui/controls.tsx");
    expect(controls).toContain("pointer-coarse:after:-inset-y-[12px]");
    expect(controls).toContain('"relative box-border h-[20px] w-[34px]');
  });
});

describe("what the screens say", () => {
  const DASHBOARD = read("src/app/(app)/dashboard/page.tsx");

  /* "No upcoming meetings" with a Create meeting button, shown to somebody
     with two meetings already live. What was empty was bookings. */
  it("the dashboard offers sharing, not a third meeting, when links exist", () => {
    expect(DASHBOARD).toContain('title="No upcoming bookings"');
    expect(DASHBOARD).toContain("active.length > 0 ? (");
    expect(DASHBOARD).toContain("action={<CopyLinkControl meetings={copyTargets} />}");
  });

  /* "0.0 hrs" read as a broken card when the truth was "under a minute". */
  it("states a reply time in the unit a person would say it in", () => {
    expect(DASHBOARD).toContain('if (minutes < 1) return { value: "<1", unit: "min" };');
    expect(DASHBOARD).not.toContain("(replyMinutes / 60).toFixed(1)");
  });

  /* meetrao.com/<username> on its own 404s: every link names a meeting. */
  it("profile does not call a 404 your current link", () => {
    const panels = read("src/components/app/settings-panels.tsx");
    expect(panels).not.toContain("This is your current link.");
    expect(panels).not.toContain("Your booking link");
  });
});
