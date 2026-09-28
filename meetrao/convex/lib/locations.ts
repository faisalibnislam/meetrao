/* ─────────────────────────────────────────────────────────────────────────────
   Where a meeting happens.

   Four kinds, and the app-side mirror of this list is src/lib/locations.ts —
   Convex functions cannot import from src/, so the vocabulary is written twice
   and pinned by a test, the same arrangement convex/lib/zones.ts has with
   src/lib/timezones.ts.

   "google_meet" is the default and was the only kind until now; every meeting
   written before the others existed holds it.
   ───────────────────────────────────────────────────────────────────────────── */

export const LOCATION_KINDS = ["google_meet", "phone", "in_person", "custom"] as const;
export type LocationKind = (typeof LOCATION_KINDS)[number];

export function isLocationKind(value: string): value is LocationKind {
  return (LOCATION_KINDS as readonly string[]).includes(value);
}

/** Only Meet mints a conference; the rest carry the host's own detail. */
export function needsMeetLink(kind: string): boolean {
  return kind === "google_meet";
}

/** What the "Where" line reads as, given the kind and its detail. */
export function whereText(kind: string, detail: string, meetUrl: string | null): string {
  if (kind === "phone") return detail ? `Phone — ${detail}` : "Phone call";
  if (kind === "in_person") return detail || "In person";
  if (kind === "custom") return detail || "Details to follow";
  return meetUrl ? meetUrl.replace(/^https?:\/\//, "") : "Link to follow by email";
}
