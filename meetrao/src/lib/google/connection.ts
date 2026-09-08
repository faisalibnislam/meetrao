import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { GoogleAuthError, refreshAccessToken } from "./oauth";
import type { CalendarConnection } from "@/lib/types";

/* Calendar connections live behind the service role: `calendar_connections`
   deliberately has no RLS policy, so OAuth tokens are unreachable from any
   browser session. Everything that touches them goes through here. */

export async function getConnection(userId: string): Promise<CalendarConnection | null> {
  const { data } = await supabaseAdmin()
    .from("calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as CalendarConnection | null) ?? null;
}

export type ConnectionStatus = {
  connected: boolean;
  accountEmail: string | null;
  needsReconnect: boolean;
  lastError: string | null;
};

/** What the UI needs, with no token ever leaving this module. */
export async function connectionStatus(userId: string): Promise<ConnectionStatus> {
  const row = await getConnection(userId);
  if (!row) return { connected: false, accountEmail: null, needsReconnect: false, lastError: null };
  return {
    connected: !row.needs_reconnect && Boolean(row.refresh_token),
    accountEmail: row.google_account_email,
    needsReconnect: row.needs_reconnect,
    lastError: row.last_error,
  };
}

export async function saveConnection(input: {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scopes: string[];
  accountEmail: string | null;
}): Promise<void> {
  const existing = await getConnection(input.userId);

  await supabaseAdmin()
    .from("calendar_connections")
    .upsert(
      {
        user_id: input.userId,
        provider: "google",
        google_account_email: input.accountEmail,
        calendar_id: "primary",
        access_token: input.accessToken,
        // Google omits the refresh token on a re-consent it considers
        // unnecessary; keeping the old one is the difference between a working
        // connection and a silent expiry a week later.
        refresh_token: input.refreshToken ?? existing?.refresh_token ?? null,
        token_expires_at: input.expiresAt.toISOString(),
        scopes: input.scopes,
        needs_reconnect: false,
        last_error: null,
        last_error_at: null,
      },
      { onConflict: "user_id" },
    );
}

export async function disconnect(userId: string): Promise<void> {
  await supabaseAdmin().from("calendar_connections").delete().eq("user_id", userId);
}

export async function markNeedsReconnect(userId: string, message: string): Promise<void> {
  await supabaseAdmin()
    .from("calendar_connections")
    .update({ needs_reconnect: true, last_error: message, last_error_at: new Date().toISOString() })
    .eq("user_id", userId);
}

/**
 * A usable access token, refreshed if it is within a minute of expiry.
 * Returns null when the host has no connection or when it needs reconnecting —
 * callers treat that as "no calendar", never as "no conflicts".
 */
export async function accessTokenFor(userId: string): Promise<{ token: string; calendarId: string } | null> {
  const row = await getConnection(userId);
  if (!row || row.needs_reconnect) return null;

  const expires = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  if (row.access_token && expires > Date.now() + 60_000) {
    return { token: row.access_token, calendarId: row.calendar_id };
  }

  if (!row.refresh_token) {
    await markNeedsReconnect(userId, "No refresh token — reconnect Google Calendar.");
    return null;
  }

  try {
    const tokens = await refreshAccessToken(row.refresh_token);
    await supabaseAdmin()
      .from("calendar_connections")
      .update({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: tokens.expiresAt.toISOString(),
        scopes: tokens.scopes.length ? tokens.scopes : row.scopes,
        needs_reconnect: false,
        last_error: null,
      })
      .eq("user_id", userId);

    return { token: tokens.accessToken, calendarId: row.calendar_id };
  } catch (cause) {
    const message = cause instanceof GoogleAuthError ? cause.message : "Google Calendar could not be reached.";
    await markNeedsReconnect(userId, message);
    return null;
  }
}
