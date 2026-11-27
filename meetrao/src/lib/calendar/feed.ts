import "server-only";

import type { Interval } from "@/lib/booking/slots";
import { convexAnonymous, convexServer, serverSecret } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/* ─────────────────────────────────────────────────────────────────────────────
   The host's calendar feed, from the app's side.

   The feed address, the fetch and the parse all live in convex/calendarFeed.ts.
   What comes back here is busy time (for the slot engine) or a masked status
   (for Settings and the dashboard), never the address.
   ───────────────────────────────────────────────────────────────────────────── */

export class FeedUnavailable extends Error {}

/**
 * The host's busy times from their feed. Throws FeedUnavailable when there is
 * no feed or it could not be read, so callers can fall back to Meetrao's own
 * bookings and say the calendar was not checked.
 */
export async function busyPeriods(userId: string, from: Date, to: Date): Promise<Interval[]> {
  // The guest path has no session, so this goes through the anonymous client,
  // with the server secret that makes the busy lookup server-only.
  const r = await convexAnonymous().action(api.calendarFeed.busyForHost, {
    hostId: userId,
    from: from.getTime(),
    to: to.getTime(),
    secret: serverSecret(),
  });
  if (!r.checked) throw new FeedUnavailable("The host's calendar feed could not be checked.");
  return r.busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

export type FeedStatus = {
  /** True once a feed address is saved. */
  connected: boolean;
  /** e.g. "calendar.google.com/••••.ics". */
  hint: string | null;
  state: "ok" | "unreachable" | null;
  fetchedAt: number | null;
  lastError: string | null;
};

const NO_FEED: FeedStatus = { connected: false, hint: null, state: null, fetchedAt: null, lastError: null };

/** What the Settings and dashboard cards show, for the signed-in host. */
export async function feedStatus(): Promise<FeedStatus> {
  try {
    const convex = await convexServer();
    const r = await convex.query(api.calendarFeed.statusOwn, {});
    if (!r) return NO_FEED;
    return { connected: true, hint: r.hint, state: r.state, fetchedAt: r.fetchedAt, lastError: r.lastError };
  } catch {
    // A status card that cannot load is not a reason to fail the page.
    return NO_FEED;
  }
}
