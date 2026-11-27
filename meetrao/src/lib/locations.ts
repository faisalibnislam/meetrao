/* ─────────────────────────────────────────────────────────────────────────────
   Where a meeting happens.

   Four kinds. Convex/lib/locations.ts is the same list, because a Convex
   function cannot import from src/. The two are pinned to each other by
   src/lib/locations.test.ts, exactly as the timezone list is.

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

/** What the host picks from, in the order the form offers them. */
export const LOCATION_OPTIONS: { value: LocationKind; label: string; hint: string }[] = [
  { value: "google_meet", label: "Video call", hint: "Guests get your video link from Settings." },
  { value: "phone", label: "Phone call", hint: "Give the number, or say who calls whom." },
  { value: "in_person", label: "In person", hint: "The address guests should come to." },
  { value: "custom", label: "Something else", hint: "Zoom, Teams, a note: whatever you tell guests." },
];

