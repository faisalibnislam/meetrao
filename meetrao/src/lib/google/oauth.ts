import "server-only";

import { googleEnv, siteUrl } from "@/lib/env";

/**
 * Calendar access is a SEPARATE OAuth grant from "Sign in with Google".
 * Supabase Auth gives us an identity; it does not reliably persist a refresh
 * token for a third-party API. So Meetrao runs its own authorization-code flow
 * with `access_type=offline`, and stores the refresh token itself.
 *
 * Exactly two scopes, matching the connect dialog's promise that "Meetrao never
 * reads the contents of your events":
 *
 *   calendar.freebusy — when you are busy, not what you are doing
 *   calendar.events   — create and delete the bookings Meetrao itself makes
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/calendar.events",
] as const;

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

export function googleRedirectUri() {
  return siteUrl("/api/google/callback");
}

export function buildConsentUrl(state: string) {
  const { googleClientId } = googleEnv();
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    // offline + consent is what actually yields a refresh token; without
    // prompt=consent Google omits it on repeat authorisations.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export type GoogleTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scopes: string[];
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

export class GoogleAuthError extends Error {
  /**
   * Google's machine-readable `error` field — redirect_uri_mismatch,
   * invalid_client, invalid_grant and friends. The human description varies and
   * is not safe to put in a URL; this is, and it is what tells a deployment
   * which of its three moving parts is actually wrong.
   */
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "GoogleAuthError";
    this.code = code;
  }
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.error) {
    throw new GoogleAuthError(
      json.error_description ?? json.error ?? `Token request failed (${res.status})`,
      json.error ?? `http_${res.status}`,
    );
  }
  return json;
}

export async function exchangeCode(code: string): Promise<GoogleTokens> {
  const { googleClientId, googleClientSecret } = googleEnv();
  const json = await postToken(
    new URLSearchParams({
      code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  );

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: new Date(Date.now() + json.expires_in * 1000),
    scopes: json.scope ? json.scope.split(" ") : [...GOOGLE_SCOPES],
  };
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<GoogleTokens> {
  const { googleClientId, googleClientSecret } = googleEnv();
  const json = await postToken(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      grant_type: "refresh_token",
    }),
  );

  return {
    accessToken: json.access_token,
    // A refresh response usually omits the refresh token; keep the stored one.
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + json.expires_in * 1000),
    scopes: json.scope ? json.scope.split(" ") : [...GOOGLE_SCOPES],
  };
}

/** Best-effort revocation on disconnect. Failure here is not fatal. */
export async function revokeToken(token: string): Promise<void> {
  try {
    await fetch(REVOKE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      cache: "no-store",
    });
  } catch {
    // The local connection is deleted regardless; the grant can also be
    // removed from the user's Google account settings.
  }
}

/**
 * The connected Google account's email, for the "Calendar" settings row.
 * Requires no extra scope — it is derived from the token's own info endpoint.
 */
export async function fetchGoogleAccountEmail(
  accessToken: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { email?: string };
    return json.email ?? null;
  } catch {
    return null;
  }
}
