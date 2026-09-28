/* ─────────────────────────────────────────────────────────────────────────────
   Google, from inside Convex.

   A port of the fetch calls in src/lib/google/{oauth,calendar}.ts, so that the
   refresh token can live in `calendar_connections` and be USED without ever
   being returned to the application. That is the whole point of moving this:
   the app had no privileged channel into Convex, and the alternatives were an
   admin key in the app or a function that hands out tokens.

   Convex functions cannot import from src/, so this is a copy rather than a
   shared module. The behaviour it must preserve is noted at each function.
   ───────────────────────────────────────────────────────────────────────────── */

export type GoogleTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAtMs: number;
  scopes: string[];
};

/** The connection is dead and only a reconnect will fix it. */
export class GoogleAuthError extends Error {}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

function credentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google credentials are not configured on this deployment.");
  return { clientId, clientSecret };
}

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return (await response.json()) as TokenResponse;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<GoogleTokens> {
  const { clientId, clientSecret } = credentials();
  const json = await tokenRequest(
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  );
  if (!json.access_token) {
    throw new Error(json.error_description ?? json.error ?? "Google did not return an access token.");
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAtMs: Date.now() + (json.expires_in ?? 3600) * 1000,
    scopes: (json.scope ?? "").split(" ").filter(Boolean),
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const { clientId, clientSecret } = credentials();
  const json = await tokenRequest(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  );
  if (!json.access_token) {
    // A revoked or expired refresh token is unrecoverable: the host has to
    // reconnect, and the caller marks the connection accordingly.
    throw new GoogleAuthError(json.error_description ?? json.error ?? "Google refused to refresh the token.");
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAtMs: Date.now() + (json.expires_in ?? 3600) * 1000,
    scopes: (json.scope ?? "").split(" ").filter(Boolean),
  };
}

/**
 * Never throws, and never waits long. The caller is in the middle of
 * disconnecting a calendar or deleting an account, and neither of those may
 * fail — or hang — because Google is having a bad afternoon.
 */
export async function revokeToken(token: string): Promise<"revoked" | "already-invalid" | "failed"> {
  if (!token) return "already-invalid";
  try {
    const response = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.timeout(5_000),
    });
    if (response.ok) return "revoked";
    // 400 invalid_token: already revoked, or expired. The grant is gone either
    // way, which is the outcome we were asking for — not a failure.
    if (response.status === 400) return "already-invalid";
    return "failed";
  } catch {
    return "failed";
  }
}

export async function fetchAccountEmail(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { email?: string };
    return json.email ?? null;
  } catch {
    return null;
  }
}

/** Every scope we asked for was granted. Google lets a user tick only some. */
export function hasCalendarWrite(scopes: string[]): boolean {
  return scopes.includes("https://www.googleapis.com/auth/calendar.events");
}

/* ── Calendar ──────────────────────────────────────────────────────────────── */

export type Interval = { start: number; end: number };

export async function freeBusy(
  accessToken: string,
  calendarId: string,
  fromMs: number,
  toMs: number,
): Promise<Interval[]> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      timeMin: new Date(fromMs).toISOString(),
      timeMax: new Date(toMs).toISOString(),
      items: [{ id: calendarId }],
    }),
  });
  if (!response.ok) throw new Error(`freeBusy failed: ${response.status}`);

  const json = (await response.json()) as {
    calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
  };
  const busy = json.calendars?.[calendarId]?.busy ?? [];
  return busy.map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
}

export type CreatedEvent = { eventId: string; meetUrl: string | null; htmlLink: string | null };

export async function createEvent(
  accessToken: string,
  calendarId: string,
  event: {
    summary: string;
    description: string;
    startMs: number;
    endMs: number;
    timeZone: string;
    attendees: { email: string; name: string }[];
  },
): Promise<CreatedEvent> {
  const requestId = crypto.randomUUID();
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
    `?conferenceDataVersion=1&sendUpdates=all`;

  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      start: { dateTime: new Date(event.startMs).toISOString(), timeZone: event.timeZone },
      end: { dateTime: new Date(event.endMs).toISOString(), timeZone: event.timeZone },
      attendees: event.attendees.map((a) => ({ email: a.email, displayName: a.name || undefined })),
      conferenceData: { createRequest: { requestId, conferenceSolutionKey: { type: "hangoutsMeet" } } },
    }),
  });

  if (!response.ok) throw new Error(`createEvent failed: ${response.status}`);
  const json = (await response.json()) as {
    id: string;
    hangoutLink?: string;
    htmlLink?: string;
    conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
  };
  const meet =
    json.hangoutLink ??
    json.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
    null;
  return { eventId: json.id, meetUrl: meet, htmlLink: json.htmlLink ?? null };
}

/**
 * Moves an existing event, keeping everything else about it.
 *
 * PATCH rather than delete-and-recreate, because recreating mints a new Meet
 * link: the old one is already in the guest's calendar entry and in the
 * confirmation email, and booking-changed.html promises it still works. A
 * missing event (404/410) is reported rather than recreated here — the caller
 * knows whether recreating is the right answer.
 */
export async function patchEventTime(
  accessToken: string,
  calendarId: string,
  eventId: string,
  when: { startMs: number; endMs: number; timeZone: string },
): Promise<"patched" | "missing" | "failed"> {
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}` +
    `/events/${encodeURIComponent(eventId)}?sendUpdates=all`;
  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        start: { dateTime: new Date(when.startMs).toISOString(), timeZone: when.timeZone },
        end: { dateTime: new Date(when.endMs).toISOString(), timeZone: when.timeZone },
      }),
    });
    if (response.ok) return "patched";
    if (response.status === 404 || response.status === 410) return "missing";
    return "failed";
  } catch {
    return "failed";
  }
}

/** "Already gone" is success: the caller wanted the event not to exist. */
export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<"deleted" | "already-deleted" | "failed"> {
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}` +
    `/events/${encodeURIComponent(eventId)}?sendUpdates=all`;
  try {
    const response = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
    if (response.ok || response.status === 404 || response.status === 410) {
      return response.ok ? "deleted" : "already-deleted";
    }
    return "failed";
  } catch {
    return "failed";
  }
}
