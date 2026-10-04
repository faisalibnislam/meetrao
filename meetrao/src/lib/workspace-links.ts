import { bookingLink, companyBookingLink } from "@/lib/username";

/* ─────────────────────────────────────────────────────────────────────────────
   The links a workspace hands out, built in one place.

   This logic used to be written out wherever a screen needed it, and the
   copies disagreed: the rail listed every meeting from every workspace, the
   Meetings screen scoped them but printed the personal address for a
   company's meeting, and a company's branding screen showed the viewer's own
   link. Each was a separate bug with the same cause, which is that there
   were several places deciding what a link is.

   Pure, and given the workspace rather than reading it, so the rule is
   testable and a caller cannot accidentally pass the wrong one.
   ───────────────────────────────────────────────────────────────────────── */

export type WorkspaceLinkPlace = {
  /** null is Personal. */
  companyId: string | null;
  /** Everything a company link is built from. Null fields for Personal. */
  slug: string | null;
  domain: string | null;
  domainVerified: boolean;
  handle: string | null;
};

export type ShareableLink = { id: string; name: string; link: string };

/**
 * One row per meeting that belongs to THIS workspace, at this workspace's
 * kind of address.
 *
 * `meetings` is every meeting the account has; the filter is here so no
 * caller can forget it. Inactive meetings are the caller's to drop, since
 * some screens list them and only shareable links leave them out.
 */
export function workspaceLinks(
  meetings: readonly { id: string; name: string; slug: string; company_id?: string | null }[],
  place: WorkspaceLinkPlace,
  username: string,
): ShareableLink[] {
  return meetings
    .filter((m) => (m.company_id ?? null) === place.companyId)
    .map((m) => ({ id: m.id, name: m.name, link: addressFor(place, username, m.slug) }));
}

/** One meeting's address in the given workspace. */
export function addressFor(place: WorkspaceLinkPlace, username: string, slug: string): string {
  return place.companyId && place.slug
    ? companyBookingLink(
        { slug: place.slug, domain: place.domain, domainVerified: place.domainVerified },
        place.handle ?? username,
        slug,
      )
    : bookingLink(username, slug);
}
