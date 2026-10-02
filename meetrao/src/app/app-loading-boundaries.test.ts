import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { globSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   Every app route needs a loading boundary.

   Next skips prefetching a dynamic route entirely unless it has one, and paints
   nothing at all until the server responds. Every route in the (app) group is
   dynamic (they all read cookies) so a new screen added without a boundary
   silently reintroduces the exact bug this suite exists to prevent: click a
   tab, watch nothing happen for the length of a round trip.

   Measured, before the boundaries existed: 445ms from click to the first pixel
   changing. After: single digits.

   The check is "at or above", not "in the same folder", because a boundary on
   an ancestor segment covers everything beneath it, (app)/loading.tsx is the
   catch-all that makes this pass for the new and edit screens.
   ───────────────────────────────────────────────────────────────────────────── */

const APP = path.join(process.cwd(), "src/app/(app)");

/** Walks up from a page's folder to the group root looking for loading.tsx. */
function boundaryFor(pageDir: string): string | null {
  let dir = pageDir;
  for (;;) {
    if (existsSync(path.join(dir, "loading.tsx"))) return path.relative(APP, dir) || "(app)";
    if (dir === APP) return null;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

describe("app route loading boundaries", () => {
  const pages = globSync("**/page.tsx", { cwd: APP }).sort();

  it("finds the app routes at all", () => {
    // Guards the guard: a moved route group would otherwise make every
    // assertion below vacuously true.
    expect(pages.length).toBeGreaterThan(5);
  });

  it("covers every route with a loading.tsx at or above it", () => {
    const uncovered = pages.filter((p) => boundaryFor(path.join(APP, path.dirname(p))) === null);
    expect(uncovered).toEqual([]);
  });

  it("gives each sidebar destination its own, so the skeleton fits the screen", () => {
    // The catch-all would technically cover these, but it cannot know the
    // title, and a real header that never moves is most of the effect.
    for (const tab of ["dashboard", "bookings", "meetings", "contacts", "notifications", "availability"]) {
      expect(existsSync(path.join(APP, tab, "loading.tsx")), `${tab}/loading.tsx`).toBe(true);
    }
  });
});
