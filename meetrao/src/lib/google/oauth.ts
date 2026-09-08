import "server-only";

import { env, siteUrl } from "@/lib/env";

/* ─────────────────────────────────────────────────────────────────────────────
   Google OAuth — calendar access.

   Two separate concerns share one Google Cloud project, and confusing them
   costs a day:

     · "Sign in with Google" is Supabase Auth's. Its callback is registered in
       the Supabase dashboard.
     · Calendar access is ours. Its redirect URI is the route below and must be
       registered for EVERY origin — localhost, the Vercel preview domain and
       production. A missing one fails as redirect_uri_mismatch and nothing else.

   The scope is write-with-attendees, not read-only free/busy, because the guest
   is an attendee on the event. Expect a higher drop-off at the permission step
   than a read-only scope would see.
   ───────────────────────────────────────────────────────────────────────────── */

export const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function redirectUri(): string {
  return `${siteUrl()}/api/google/callback`;
}

export function consentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env().GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: CALENDAR_SCOPES.join(" "),
    // offline + consent so a refresh token comes back every time, including on
    // a reconnect where Google would otherwise omit it.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export type GoogleTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scopes: string[];
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  return (await response.json()) as TokenResponse;
}

export async function exchangeCode(code: string): Promise<GoogleTokens> {
  const e = env();
  const json = await tokenRequest(
    new URLSearchParams({
      code,
      client_id: e.GOOGLE_CLIENT_ID,
      client_secret: e.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  );

  if (!json.access_token) {
    throw new Error(json.error_description ?? json.error ?? "Google did not return an access token.");
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000),
    scopes: (json.scope ?? "").split(" ").filter(Boolean),
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const e = env();
  const json = await tokenRequest(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: e.GOOGLE_CLIENT_ID,
      client_secret: e.GOOGLE_CLIENT_SECRET,
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
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000),
    scopes: (json.scope ?? "").split(" ").filter(Boolean),
  };
}

/** The connection is dead and only a reconnect will fix it. */
export class GoogleAuthError extends Error {}

export async function fetchAccountEmail(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
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
