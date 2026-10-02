import "server-only";

import type { Interval } from "@/lib/booking/slots";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/* ─────────────────────────────────────────────────────────────────────────────
   Google Calendar.

   One event, both calendars. On confirmation Meetrao creates a single event on
   the host's calendar and adds the guest as an ATTENDEE, with sendUpdates:'all'
   so Google issues the invitation. The meeting name, description and Meet link
   therefore appear on both calendars, and cancelling patches or deletes that
   same event so neither side accumulates a stale invitation.

   Every failure path is handled and named, because a silent calendar-write
   failure on a live booking is the worst outcome in the product.

   The HTTP calls themselves live in convex/google.ts, next to the tokens. What
   is left here is the vocabulary the UI speaks (the failure kinds and their
   copy) plus three thin calls.
   ───────────────────────────────────────────────────────────────────────────── */

export type CalendarFailure =
  | "not-connected"
  | "token-expired"
  | "scope-insufficient"
  | "api-unavailable"
  | "already-deleted"
  | "rate-limited";

export class CalendarError extends Error {
  constructor(
    readonly kind: CalendarFailure,
    message: string,
  ) {
    super(message);
  }
}

/** Copy the UI shows for each failure. Never a raw Google message. */
export const FAILURE_COPY: Record<CalendarFailure, { title: string; text: string }> = {
  "not-connected": {
    title: "Google Calendar isn't connected",
    text: "The booking is confirmed, but it is not on a calendar. Connect Google Calendar to fix this.",
  },
  "token-expired": {
    title: "Google Calendar needs reconnecting",
    text: "Google stopped accepting our access. Reconnect from Settings, bookings still work in the meantime.",
  },
  "scope-insufficient": {
    title: "Calendar permission is missing",
    text: "Reconnect and allow calendar access, including inviting guests.",
  },
  "api-unavailable": {
    title: "Google Calendar didn't respond",
    text: "The booking is confirmed. We could not reach Google to add it, and it is worth adding by hand.",
  },
  "already-deleted": {
    title: "That event is already gone",
    text: "Nothing to remove from the calendar: the booking is cancelled either way.",
  },
  "rate-limited": {
    title: "Google is rate-limiting us",
    text: "The booking is confirmed. The calendar event will need adding by hand.",
  },
};

export async function busyPeriods(userId: string, from: Date, to: Date): Promise<Interval[]> {
  // The guest path has no session, so this goes through the anonymous client.
  // The action clamps the window and never returns a token.
  const r = await convexAnonymous().action(api.google.busyForHost, {
    hostId: userId,
    from: from.getTime(),
    to: to.getTime(),
  });
  if (!r.checked) throw new CalendarError("api-unavailable", "Google Calendar could not be reached.");
  return r.busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

/* Both are keyed by the booking's REFERENCE rather than a user id and an event
   id, because the action reads the booking, the host and the tokens for
   itself. Nothing has to be handed to it, and no token comes back. */

export async function createEventForBooking(
  reference: string,
): Promise<{ meetUrl: string | null } | { failure: CalendarFailure }> {
  const r = await convexAnonymous().action(api.google.createEventForBooking, { reference });
  if (r.ok) return { meetUrl: r.meetUrl };
  const map: Record<string, CalendarFailure> = {
    "not-connected": "not-connected",
    "api-unavailable": "api-unavailable",
    "already-attached": "api-unavailable",
    "unknown-booking": "api-unavailable",
  };
  return { failure: map[r.reason] ?? "api-unavailable" };
}

/**
 * Moves the event to match a booking that has already moved.
 *
 * "This booking never had an event" is not a failure worth telling anyone
 * about, a host with no calendar connected books perfectly well without one,
 * so it comes back as `ok` with no Meet link rather than as a warning.
 */
export async function updateEventForBooking(
  reference: string,
): Promise<{ meetUrl: string | null } | { failure: CalendarFailure }> {
  const r = await convexAnonymous().action(api.google.updateEventForBooking, { reference });
  if (r.ok) return { meetUrl: r.meetUrl };
  if (r.reason === "no-event") return { meetUrl: null };
  const map: Record<string, CalendarFailure> = {
    "not-connected": "not-connected",
    "api-unavailable": "api-unavailable",
    "unknown-booking": "api-unavailable",
  };
  return { failure: map[r.reason] ?? "api-unavailable" };
}

export async function deleteEventForBooking(reference: string): Promise<"ok" | CalendarFailure> {
  const r = await convexAnonymous().action(api.google.deleteEventForBooking, { reference });
  if (r.ok) return "ok";
  return (r.reason as CalendarFailure) ?? "api-unavailable";
}
