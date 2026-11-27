/* ─────────────────────────────────────────────────────────────────────────────
   Where a meeting happens.

   Four kinds, and the app-side mirror of this list is src/lib/locations.ts,
   Convex functions cannot import from src/, so the vocabulary is written twice
   and pinned by a test, the same arrangement convex/lib/zones.ts has with
   src/lib/timezones.ts.

   "google_meet" is the default and was the only kind at first; every meeting
   written before the others existed holds it. The NAME is historical: it now
   means "Video call", using the link the host saved in Settings (Meetrao no
   longer creates Google Meet links). The stored value stays as it is, so no
   meeting or booking needed rewriting.
   ───────────────────────────────────────────────────────────────────────────── */

export const LOCATION_KINDS = ["google_meet", "phone", "in_person", "custom"] as const;
export type LocationKind = (typeof LOCATION_KINDS)[number];

export function isLocationKind(value: string): value is LocationKind {
  return (LOCATION_KINDS as readonly string[]).includes(value);
}

/** A video call uses the host's saved link; the rest carry their own detail. */
export function usesVideoLink(kind: string): boolean {
  return kind === "google_meet";
}

/** The refusal when a video call is booked from a host with no link saved. */
export const NO_VIDEO_LINK = "This host hasn't added a video link yet, so this meeting can't be booked.";

/** What the "Where" line reads as, given the kind and its detail. */
export function whereText(kind: string, detail: string, meetUrl: string | null): string {
  if (kind === "phone") return detail ? `Phone: ${detail}` : "Phone call";
  if (kind === "in_person") return detail || "In person";
  if (kind === "custom") return detail || "Details to follow";
  return meetUrl ? meetUrl.replace(/^https?:\/\//, "") : "Video call";
}
