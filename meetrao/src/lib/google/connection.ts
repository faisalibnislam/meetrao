import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { convexServes } from "@/lib/backend";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { GoogleAuthError, refreshAccessToken, revokeToken } from "./oauth";
import type { CalendarConnection } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────────────────────
   THIS MODULE STAYS ON SUPABASE, ON PURPOSE.

   Everything else has moved to Convex. This has not, because it reads Google
   refresh tokens, and the app's server code has no privileged channel into
   Convex: an internalQuery cannot be reached from Next.js, and the only ways
   to change that are both worse than the problem —

     · ship a Convex admin key into the app, which hands every caller of any
       route the keys to the whole deployment; or
     · expose a public function that returns tokens, which is the disclosure
       the policy-free `calendar_connections` table existed to prevent.

   The right end state is to move the Google calls themselves into Convex
   actions, so tokens are read and used without ever leaving. Until then this
   stays where the service role already protects it — Supabase is alive anyway
   for auth. The rows ARE mirrored into Convex and the internal functions in
   convex/calendarConnections.ts are ready for that move.

   The one thing that must stay in step: deleting a connection has to happen on
   BOTH sides, or a stale mirror outlives the real row. See disconnect() below.
   ───────────────────────────────────────────────────────────────────────────── */


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
  if (convexServes("google")) {
    const c = await convexServer();
    const r = await c.query(api.calendarConnections.statusOwn, {});
    return {
      connected: Boolean(r?.connected),
      accountEmail: r?.google_account_email ?? null,
      needsReconnect: Boolean(r?.needs_reconnect),
      lastError: r?.last_error ?? null,
    };
  }

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

/**
 * Ends the connection: tells Google to forget the grant, then deletes our copy.
 *
 * That order is the whole function. Delete first and the token is gone before
 * it can be handed back, so the grant would live on in the host's Google
 * account with nothing left to revoke it with — which is exactly the state the
 * Privacy Policy now promises does not happen.
 *
 * The revoke is best effort and cannot fail the disconnect. If Google is down,
 * our copy still goes, the calendar is still unreachable from Meetrao, and the
 * host can finish the job at myaccount.google.com/permissions. Refusing to
 * disconnect because a third party is unreachable would be the worse outcome.
 *
 * Safe to call for a user who has no connection: it reads nothing, revokes
 * nothing and deletes nothing.
 */
export async function disconnect(userId: string): Promise<void> {
  if (convexServes("google")) {
    // Revoke and delete happen inside Convex, so the refresh token is used
    // where it lives and never crosses back out. Never throws, by the same
    // reasoning as the Supabase path below.
    try {
      const c = await convexServer();
      await c.action(api.google.disconnectFor, { userId });
    } catch (cause) {
      console.error("convex disconnect failed", {
        userId,
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
    return;
  }

  const row = await getConnection(userId);

  if (row) {
    // The refresh token revokes the entire grant. The access token is the
    // fallback for a row that somehow has no refresh token — it revokes the
    // grant too, but only while it is still valid.
    const outcome = await revokeToken(row.refresh_token || row.access_token || "");
    if (outcome === "failed") {
      // Logged, not thrown. The host is told the calendar is disconnected,
      // which is true; this is the part they may need to finish by hand.
      console.warn("google: revoke failed on disconnect; the grant may remain in the user's Google account");
    }
  }

  await supabaseAdmin().from("calendar_connections").delete().eq("user_id", userId);
  // And the mirror, so a revoked grant cannot look connected on the other side.
  await dropConvexMirror(userId);
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

/**
 * Removes the Convex mirror of a connection.
 *
 * Best effort and deliberately quiet: Supabase is authoritative here, and a
 * failed mirror delete must not make a successful disconnect look broken to
 * the host. It is logged so a drift has a trail.
 */
async function dropConvexMirror(userId: string): Promise<void> {
  if (!convexServes("session")) return;
  try {
    const convex = await convexServer();
    await convex.mutation(api.calendarConnections.disconnectOwn, {});
  } catch (cause) {
    console.error("convex calendar mirror delete failed", {
      userId,
      error: cause instanceof Error ? cause.message : String(cause),
    });
  }
}
