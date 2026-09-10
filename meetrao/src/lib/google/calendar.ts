import "server-only";

import type { Interval } from "@/lib/booking/slots";
import { accessTokenFor, markNeedsReconnect } from "./connection";

/* ─────────────────────────────────────────────────────────────────────────────
   Google Calendar.

   One event, both calendars. On confirmation Meetrao creates a single event on
   the host's calendar and adds the guest as an ATTENDEE, with sendUpdates:'all'
   so Google issues the invitation. The meeting name, description and Meet link
   therefore appear on both calendars, and cancelling patches or deletes that
   same event so neither side accumulates a stale invitation.

   Every failure path is handled and named, because a silent calendar-write
   failure on a live booking is the worst outcome in the product.
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
    text: "Google stopped accepting our access. Reconnect from Settings — bookings still work in the meantime.",
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
    text: "Nothing to remove from the calendar — the booking is cancelled either way.",
  },
  "rate-limited": {
    title: "Google is rate-limiting us",
    text: "The booking is confirmed. The calendar event will need adding by hand.",
  },
};

const API = "https://www.googleapis.com/calendar/v3";

async function call<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new CalendarError("api-unavailable", "Could not reach Google Calendar.");
  }

  if (response.status === 401) throw new CalendarError("token-expired", "Google rejected the access token.");
  if (response.status === 403) {
    const body = await response.text();
    throw new CalendarError(
      body.includes("rateLimitExceeded") || body.includes("userRateLimitExceeded")
        ? "rate-limited"
        : "scope-insufficient",
      "Google refused the request.",
    );
  }
  if (response.status === 404 || response.status === 410) {
    throw new CalendarError("already-deleted", "That event no longer exists.");
  }
  if (!response.ok) throw new CalendarError("api-unavailable", `Google Calendar returned ${response.status}.`);

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * The host's busy periods. A host with no connection returns an empty list and
 * the caller decides what that means — it must never be read as "free".
 */
export async function busyPeriods(userId: string, from: Date, to: Date): Promise<Interval[]> {
  const auth = await accessTokenFor(userId);
  if (!auth) return [];

  try {
    const json = await call<{ calendars?: Record<string, { busy?: { start: string; end: string }[] }> }>(
      auth.token,
      "/freeBusy",
      {
        method: "POST",
        body: JSON.stringify({
          timeMin: from.toISOString(),
          timeMax: to.toISOString(),
          items: [{ id: auth.calendarId }],
        }),
      },
    );

    const slots = json.calendars?.[auth.calendarId]?.busy ?? [];
    return slots.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  } catch (cause) {
    if (cause instanceof CalendarError && cause.kind === "token-expired") {
      await markNeedsReconnect(userId, cause.message);
    }
    // Offering a slot the host cannot make is worse than offering none, but so
    // is refusing every booking because Google blinked. The caller pairs this
    // with the bookings table, which is authoritative for Meetrao's own slots.
    throw cause;
  }
}

export type CreatedEvent = { eventId: string; meetUrl: string | null; htmlLink: string | null };

export async function createBookingEvent(input: {
  userId: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  timeZone: string;
  /** Everyone invited. The first is the guest of record on the booking row. */
  attendees: { email: string; name?: string }[];
}): Promise<CreatedEvent> {
  const auth = await accessTokenFor(input.userId);
  if (!auth) throw new CalendarError("not-connected", "No Google Calendar connection.");

  const json = await call<{
    id: string;
    hangoutLink?: string;
    htmlLink?: string;
    conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
  }>(
    auth.token,
    `/calendars/${encodeURIComponent(auth.calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start.toISOString(), timeZone: input.timeZone },
        end: { dateTime: input.end.toISOString(), timeZone: input.timeZone },
        // Invitees are attendees, which is how the event reaches their
        // calendars. Everyone on an invitation sees everyone else's address —
        // inherent to a Google invitation, and disclosed in the privacy policy.
        // It matters more now that a host can invite several people at once.
        attendees: input.attendees.map((a) => ({ email: a.email, displayName: a.name || undefined })),
        guestsCanModify: false,
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    },
  );

  const entry = json.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri;
  return { eventId: json.id, meetUrl: json.hangoutLink ?? entry ?? null, htmlLink: json.htmlLink ?? null };
}

export async function deleteBookingEvent(userId: string, eventId: string): Promise<void> {
  const auth = await accessTokenFor(userId);
  if (!auth) throw new CalendarError("not-connected", "No Google Calendar connection.");

  await call<void>(
    auth.token,
    `/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    { method: "DELETE" },
  );
}

/** The guest's RSVP as Google has it. Nothing in the UI surfaces it yet. */
export async function readGuestRsvp(
  userId: string,
  eventId: string,
  guestEmail: string,
): Promise<string | null> {
  const auth = await accessTokenFor(userId);
  if (!auth) return null;

  try {
    const json = await call<{ attendees?: { email?: string; responseStatus?: string }[] }>(
      auth.token,
      `/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(eventId)}`,
    );
    const match = json.attendees?.find((a) => a.email?.toLowerCase() === guestEmail.toLowerCase());
    return match?.responseStatus ?? null;
  } catch {
    return null;
  }
}
