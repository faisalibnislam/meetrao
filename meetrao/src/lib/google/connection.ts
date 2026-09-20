import "server-only";

import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { convexMessage } from "@/lib/convex/error";

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

export type DisconnectResult = { ok: boolean; error?: string };

/**
 * Revoke with Google, then forget.
 *
 * Both halves happen inside Convex, where the token is: the row is read and
 * deleted in one transaction that hands the token back, and the revoke follows.
 *
 * STILL DOES NOT THROW — account deletion calls this on its way out, and a
 * host must not be trapped in a connected state because Google is having a bad
 * afternoon. But it now REPORTS. It used to swallow everything into
 * console.error and return void, so when the action started refusing every
 * caller the Settings screen went on saying "Calendar disconnected" over a
 * calendar that was still connected. A failure nobody can see is worse than
 * one that is merely inconvenient.
 */
export async function disconnect(userId: string): Promise<DisconnectResult> {
  try {
    const convex = await convexServer();
    await convex.action(api.google.disconnectFor, { userId });
    return { ok: true };
  } catch (cause) {
    const error = convexMessage(cause, "Google Calendar could not be disconnected.");
    console.error("disconnect failed", { userId, error });
    return { ok: false, error };
  }
}
