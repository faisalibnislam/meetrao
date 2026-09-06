import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/env";
import { CalendarStoreError } from "./errors";
import type { Interval } from "@/lib/booking/time";
import {
  GoogleAuthError,
  fetchGoogleAccountEmail,
  refreshAccessToken,
  revokeToken,
  type GoogleTokens,
} from "./oauth";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

/** Refresh a little early so a long request cannot straddle the expiry. */
const REFRESH_MARGIN_MS = 60_000;

export type CalendarConnection = {
  userId: string;
  calendarId: string;
  accountEmail: string | null;
  accessToken: string;
};

export class CalendarNotConnectedError extends Error {
  constructor() {
    super("Google Calendar is not connected for this account.");
    this.name = "CalendarNotConnectedError";
  }
}

/* ── Connection storage ──────────────────────────────────────────────────── */

export async function saveConnection(
  userId: string,
  tokens: GoogleTokens,
): Promise<void> {
  const admin = createAdminClient();
  const accountEmail = await fetchGoogleAccountEmail(tokens.accessToken);

  const { error } = await admin.from("calendar_connections").upsert(
    {
      user_id: userId,
      provider: "google",
      google_account_email: accountEmail,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_expires_at: tokens.expiresAt.toISOString(),
      scopes: tokens.scopes,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    // Log every field: supabase-js reports a failed fetch as an error value
    // rather than throwing, so `code` is the only thing that separates "the
    // database said no" from "the request never left the process".
    console.error("[calendar] calendar_connections upsert failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      userId,
    });
    throw new CalendarStoreError(
      `Could not store the calendar connection: ${error.message}`,
      error.code || "network",
    );
  }
}

export async function deleteConnection(userId: string): Promise<void> {
  if (!hasServiceRole()) return;
  const admin = createAdminClient();

  const { data } = await admin
    .from("calendar_connections")
    .select("refresh_token, access_token")
    .eq("user_id", userId)
    .maybeSingle();

  const token = data?.refresh_token ?? data?.access_token;
  if (token) await revokeToken(token);

  await admin.from("calendar_connections").delete().eq("user_id", userId);
}

export async function isCalendarConnected(userId: string): Promise<boolean> {
  if (!hasServiceRole()) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("calendar_connections")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function getConnectionSummary(
  userId: string,
): Promise<{ connected: boolean; accountEmail: string | null }> {
  // Connection state lives behind the service role. Without it, report "not
  // connected" rather than throwing — every screen still renders, and the
  // dashboard's amber banner already says the calendar is not wired up.
  if (!hasServiceRole()) return { connected: false, accountEmail: null };

  const admin = createAdminClient();
  const { data } = await admin
    .from("calendar_connections")
    .select("google_account_email")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    connected: Boolean(data),
    accountEmail: data?.google_account_email ?? null,
  };
}

/**
 * Returns a connection whose access token is valid right now, refreshing and
 * persisting a new one when the stored token is close to expiry.
 */
export async function getFreshConnection(
  userId: string,
): Promise<CalendarConnection> {
  if (!hasServiceRole()) throw new CalendarNotConnectedError();

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Could not read the calendar connection: ${error.message}`);
  if (!data || !data.access_token) throw new CalendarNotConnectedError();

  const expiresAt = data.token_expires_at
    ? new Date(data.token_expires_at).getTime()
    : 0;

  if (expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return {
      userId,
      calendarId: data.calendar_id,
      accountEmail: data.google_account_email,
      accessToken: data.access_token,
    };
  }

  if (!data.refresh_token) {
    // Expired with nothing to refresh from — the grant must be re-established.
    throw new CalendarNotConnectedError();
  }

  const refreshed = await refreshAccessToken(data.refresh_token);
  await admin
    .from("calendar_connections")
    .update({
      access_token: refreshed.accessToken,
      refresh_token: refreshed.refreshToken,
      token_expires_at: refreshed.expiresAt.toISOString(),
      scopes: refreshed.scopes,
    })
    .eq("user_id", userId);

  return {
    userId,
    calendarId: data.calendar_id,
    accountEmail: data.google_account_email,
    accessToken: refreshed.accessToken,
  };
}

/* ── API calls ───────────────────────────────────────────────────────────── */

async function callCalendar<T>(
  connection: CalendarConnection,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    throw new GoogleAuthError(
      "Google rejected the calendar credentials. Reconnect the calendar.",
      // Not one of Google's OAuth error codes — this is the Calendar API
      // refusing a token, not the token endpoint refusing to issue one.
      res.status === 401 ? "calendar_unauthorized" : "calendar_forbidden",
    );
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Calendar API ${res.status}: ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Busy intervals from the host's Google Calendar. Returns [] rather than
 * throwing when the calendar is not connected — an unconnected host can still
 * take bookings, they just are not conflict-checked (and the UI warns loudly
 * about exactly that).
 */
export async function fetchBusyIntervals(
  userId: string,
  from: Date,
  to: Date,
): Promise<Interval[]> {
  let connection: CalendarConnection;
  try {
    connection = await getFreshConnection(userId);
  } catch (err) {
    if (err instanceof CalendarNotConnectedError) return [];
    throw err;
  }

  type FreeBusyResponse = {
    calendars?: Record<
      string,
      { busy?: Array<{ start: string; end: string }>; errors?: unknown[] }
    >;
  };

  const json = await callCalendar<FreeBusyResponse>(connection, "/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      items: [{ id: connection.calendarId }],
    }),
  });

  const busy = json.calendars?.[connection.calendarId]?.busy ?? [];
  return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

export type CreatedEvent = { eventId: string; meetUrl: string | null };

/**
 * Creates the calendar event and asks Google to mint a Meet link for it.
 * `conferenceDataVersion=1` is required, otherwise the request is accepted but
 * the conference is silently dropped.
 */
export async function createCalendarEvent(params: {
  userId: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  timezone: string;
  guestName: string;
  guestEmail: string;
  /** Idempotency key for the conference request. */
  requestId: string;
}): Promise<CreatedEvent> {
  const connection = await getFreshConnection(params.userId);

  type EventResponse = {
    id: string;
    hangoutLink?: string;
    conferenceData?: {
      entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
    };
  };

  const event = await callCalendar<EventResponse>(
    connection,
    `/calendars/${encodeURIComponent(connection.calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      body: JSON.stringify({
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.start.toISOString(), timeZone: params.timezone },
        end: { dateTime: params.end.toISOString(), timeZone: params.timezone },
        attendees: [
          { email: params.guestEmail, displayName: params.guestName },
        ],
        conferenceData: {
          createRequest: {
            requestId: params.requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: { useDefault: true },
      }),
    },
  );

  const entryPoint = event.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === "video",
  );

  return {
    eventId: event.id,
    meetUrl: event.hangoutLink ?? entryPoint?.uri ?? null,
  };
}

/** Removes the event and notifies attendees. Missing events are not an error. */
export async function deleteCalendarEvent(
  userId: string,
  eventId: string,
): Promise<void> {
  let connection: CalendarConnection;
  try {
    connection = await getFreshConnection(userId);
  } catch (err) {
    if (err instanceof CalendarNotConnectedError) return;
    throw err;
  }

  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(connection.calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${connection.accessToken}` },
      cache: "no-store",
    },
  );

  // 410 Gone / 404 Not Found mean it is already off the calendar.
  if (res.ok || res.status === 404 || res.status === 410) return;
  throw new Error(`Google Calendar delete failed (${res.status})`);
}
