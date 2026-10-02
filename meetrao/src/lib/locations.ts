/* ─────────────────────────────────────────────────────────────────────────────
   Where a meeting happens.

   Four kinds. Convex/lib/locations.ts is the same list, because a Convex
   function cannot import from src/. The two are pinned to each other by
   src/lib/locations.test.ts, exactly as the timezone list is.

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
  if (kind === "phone") return detail ? `Phone: ${detail}` : "Phone call";
  if (kind === "in_person") return detail || "In person";
  if (kind === "custom") return detail || "Details to follow";
  return meetUrl ? meetUrl.replace(/^https?:\/\//, "") : "Link to follow by email";
}

/** What the host picks from, in the order the form offers them. */
export const LOCATION_OPTIONS: { value: LocationKind; label: string; hint: string }[] = [
  { value: "google_meet", label: "Google Meet", hint: "A link is created for every booking." },
  { value: "phone", label: "Phone call", hint: "Give the number, or say who calls whom." },
  { value: "in_person", label: "In person", hint: "The address guests should come to." },
  { value: "custom", label: "Something else", hint: "Zoom, Teams, a note: whatever you tell guests." },
];

/** The label on the button that opens a meeting, when there is one to open. */
export function joinLabel(kind: string, meetUrl: string | null): string | null {
  if (kind === "google_meet") return meetUrl ? "Join Google Meet" : null;
  return null;
}
