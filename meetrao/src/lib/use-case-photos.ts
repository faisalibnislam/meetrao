import "server-only";

import { readdirSync } from "node:fs";
import { join } from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   Which use cases have a photograph yet.

   The design leaves the Use cases section's images to real photography, and
   none was supplied with the handoff. Rather than make each arrival a code
   change, this reads the directory: drop `public/use-cases/<id>.jpg` and that
   card renders the photo on the next build. A card with no file keeps the
   labelled frame, so a half-filled set degrades one card at a time instead of
   breaking the row.

   The ids are the `id` values in src/components/marketing/use-cases.tsx:
   freelancers · consultants · agencies · sales-teams · coaches · remote-teams
   ───────────────────────────────────────────────────────────────────────────── */

const DIR = "use-cases";
const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

export type PhotoMap = Record<string, string>;

/** Maps use-case id to its public path, for whichever photos exist. */
export function useCasePhotos(): PhotoMap {
  let entries: string[];
  try {
    entries = readdirSync(join(process.cwd(), "public", DIR));
  } catch {
    // No directory at all is the normal state until the first photo lands.
    return {};
  }

  const found: PhotoMap = {};
  for (const name of entries) {
    const dot = name.lastIndexOf(".");
    if (dot <= 0) continue;

    const id = name.slice(0, dot);
    const ext = name.slice(dot).toLowerCase();
    if (!EXTENSIONS.has(ext)) continue;

    // First match wins, so a stray second format for one id cannot flip the
    // rendered photo between builds depending on directory order.
    found[id] ??= `/${DIR}/${name}`;
  }
  return found;
}
