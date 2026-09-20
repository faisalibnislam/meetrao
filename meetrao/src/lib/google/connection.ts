import "server-only";

import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/* ─────────────────────────────────────────────────────────────────────────────
   Google Calendar connection state.

   The tokens live in Convex and are USED there — `convex/google.ts` does the
   exchange, the refresh, the revoke and the API calls. Nothing in this file
   has ever seen a refresh token since that move, and nothing should: the
   functions below ask about a connection or end one, and neither answer
   contains a credential.

   This module used to hold the whole token lifecycle against Postgres. What
   is left is the shape the app already imports, so the twelve call sites did
   not have to change.
   ───────────────────────────────────────────────────────────────────────────── */

export type ConnectionStatus = {
  connected: boolean;
  accountEmail: string | null;
  needsReconnect: boolean;
  lastError: string | null;
};

const DISCONNECTED: ConnectionStatus = {
  connected: false,
  accountEmail: null,
  needsReconnect: false,
  lastError: null,
};

/** What the Settings and dashboard cards show. Never a token. */
export async function connectionStatus(userId: string): Promise<ConnectionStatus> {
  void userId; // scoped by the caller's own identity
  try {
    const convex = await convexServer();
    const r = await convex.query(api.calendarConnections.statusOwn, {});
    if (!r) return DISCONNECTED;
    return {
      connected: true,
      accountEmail: r.google_account_email,
      needsReconnect: r.needs_reconnect,
      lastError: r.last_error,
    };
  } catch {
    // A connection card that cannot load is not a reason to fail the page.
    return DISCONNECTED;
  }
}

/**
 * Revoke with Google, then forget.
 *
 * Revoke FIRST — deleting the row without revoking leaves the grant alive with
 * nothing left to revoke it with. Both halves happen inside Convex, where the
 * token is. Never throws: a host disconnecting must not be blocked by Google
 * having a bad afternoon, and account deletion calls this on its way out.
 */
export async function disconnect(userId: string): Promise<void> {
  try {
    const convex = await convexServer();
    await convex.action(api.google.disconnectFor, { userId });
  } catch (cause) {
    console.error("disconnect failed", {
      userId,
      error: cause instanceof Error ? cause.message : String(cause),
    });
  }
}
