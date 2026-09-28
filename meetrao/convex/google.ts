import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fail } from "./lib/errors";
import { currentUserId } from "./lib/auth";
import {
  exchangeCode, refreshAccessToken, revokeToken, fetchAccountEmail, hasCalendarWrite,
  freeBusy, createEvent, deleteEvent, patchEventTime, GoogleAuthError,
} from "./lib/googleApi";

/* ─────────────────────────────────────────────────────────────────────────────
   Google Calendar, entirely inside Convex.

   THE RULE: a refresh token never leaves this deployment. Nothing here returns
   one, and nothing returns an access token either — the actions do the Google
   call themselves and return only the result. `calendar_connections` therefore
   needs no privileged channel out, which is what kept it on Supabase.

   Public entry points are scoped by something the caller already legitimately
   holds: a session, or a booking reference (32 hex characters of CSPRNG, the
   guest's only credential). Everything else is internal.
   ───────────────────────────────────────────────────────────────────────────── */

const DAY = 24 * 60 * 60 * 1000;

/* ── internal plumbing ─────────────────────────────────────────────────────── */

export const connectionFor = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, a) =>
    await ctx.db.query("calendar_connections").withIndex("by_user", (q) => q.eq("user_id", a.userId)).unique(),
});

export const storeTokens = internalMutation({
  args: {
    userId: v.string(),
    accessToken: v.string(),
    refreshToken: v.union(v.string(), v.null()),
    expiresAtMs: v.number(),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, a) => {
    const c = await ctx.db.query("calendar_connections").withIndex("by_user", (q) => q.eq("user_id", a.userId)).unique();
    if (!c) return false;
    await ctx.db.patch(c._id, {
      access_token: a.accessToken,
      // Google omits the refresh token on re-consent; keeping the old one is
      // the difference between a working connection and a reconnect loop.
      refresh_token: a.refreshToken ?? c.refresh_token,
      token_expires_at: a.expiresAtMs,
      scopes: a.scopes.length ? a.scopes : c.scopes,
      needs_reconnect: false,
      last_error: null,
      last_error_at: null,
      updated_at: Date.now(),
    });
    return true;
  },
});

export const flagReconnect = internalMutation({
  args: { userId: v.string(), message: v.string() },
  handler: async (ctx, a) => {
    const c = await ctx.db.query("calendar_connections").withIndex("by_user", (q) => q.eq("user_id", a.userId)).unique();
    if (!c) return false;
    await ctx.db.patch(c._id, {
      needs_reconnect: true, last_error: a.message, last_error_at: Date.now(), updated_at: Date.now(),
    });
    return true;
  },
});

/**
 * A usable access token for one host — INTERNAL, and it stays internal.
 *
 * Mirrors accessTokenFor() in src/lib/google/connection.ts: use the stored one
 * while it has more than a minute left, otherwise refresh and store. A refusal
 * from Google is unrecoverable, so the connection is flagged and the caller
 * degrades rather than retrying.
 */
export const accessTokenFor = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, a): Promise<{ token: string; calendarId: string } | null> => {
    const row = await ctx.runQuery(internal.google.connectionFor, { userId: a.userId });
    if (!row || row.needs_reconnect) return null;

    if (row.access_token && (row.token_expires_at ?? 0) > Date.now() + 60_000) {
      return { token: row.access_token, calendarId: row.calendar_id };
    }
    if (!row.refresh_token) {
      await ctx.runMutation(internal.google.flagReconnect, {
        userId: a.userId, message: "No refresh token — reconnect Google Calendar.",
      });
      return null;
    }

    try {
      const tokens = await refreshAccessToken(row.refresh_token);
      await ctx.runMutation(internal.google.storeTokens, {
        userId: a.userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAtMs: tokens.expiresAtMs,
        scopes: tokens.scopes,
      });
      return { token: tokens.accessToken, calendarId: row.calendar_id };
    } catch (cause) {
      const message = cause instanceof GoogleAuthError ? cause.message : "Google Calendar could not be reached.";
      await ctx.runMutation(internal.google.flagReconnect, { userId: a.userId, message });
      return null;
    }
  },
});

/* ── public entry points ───────────────────────────────────────────────────── */

/**
 * Busy blocks from the host's Google calendar, for the booking page.
 *
 * Keyed by username + slug rather than a host id, and clamped, so it discloses
 * no more than the booking page already does by showing which slots are gone.
 * Returns [] rather than throwing when the calendar cannot be reached — the
 * caller says "we could not check Google" instead of failing the page.
 */
export const busyForHost = action({
  args: { hostId: v.string(), from: v.number(), to: v.number() },
  handler: async (ctx, a): Promise<{ busy: Array<{ start: number; end: number }>; checked: boolean }> => {
    const host = await ctx.runQuery(internal.google.bookableHost, { hostId: a.hostId });
    if (!host) return { busy: [], checked: false };

    const now = Date.now();
    const from = Math.max(a.from, now - DAY);
    const to = Math.min(a.to, now + 365 * DAY, from + 90 * DAY);
    if (to <= from) return { busy: [], checked: false };

    const creds = await ctx.runAction(internal.google.accessTokenFor, { userId: a.hostId });
    if (!creds) return { busy: [], checked: false };

    try {
      const busy = await freeBusy(creds.token, creds.calendarId, from, to);
      return { busy, checked: true };
    } catch {
      return { busy: [], checked: false };
    }
  },
});

export const bookableHost = internalQuery({
  args: { hostId: v.string() },
  handler: async (ctx, a) => {
    const host = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.hostId)).unique();
    if (!host || host.is_suspended) return null;
    return { hostId: host.id, timezone: host.timezone };
  },
});

export const bookingByReference = internalQuery({
  args: { reference: v.string() },
  handler: async (ctx, a) => {
    const b = await ctx.db.query("bookings").withIndex("by_reference", (q) => q.eq("reference", a.reference.trim())).unique();
    if (!b) return null;
    const host = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", b.host_id)).unique();
    const invitees = await ctx.db
      .query("booking_invitees").withIndex("by_booking", (q) => q.eq("booking_id", b.id)).collect();
    return {
      booking: b,
      hostTimezone: host?.timezone ?? "UTC",
      invitees: invitees.map((i) => ({ email: i.email, name: i.name })),
    };
  },
});

export const attachEvent = internalMutation({
  args: { reference: v.string(), eventId: v.union(v.string(), v.null()), meetUrl: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => {
    const b = await ctx.db.query("bookings").withIndex("by_reference", (q) => q.eq("reference", a.reference)).unique();
    if (!b) return false;
    await ctx.db.patch(b._id, { google_event_id: a.eventId, meet_url: a.meetUrl, updated_at: Date.now() });
    return true;
  },
});

/**
 * Creates the calendar event for a booking that already exists.
 *
 * Scoped by the booking's reference, the same credential that authorises
 * reading and cancelling it, and refuses if an event is already attached so a
 * leaked reference cannot repoint a booking at another event.
 *
 * Returns a failure rather than throwing: the calendar write comes AFTER the
 * booking exists, and if Google refuses, the booking is still real — the host
 * is told which part failed rather than the guest losing a confirmed meeting.
 */
export const createEventForBooking = action({
  args: { reference: v.string() },
  handler: async (
    ctx,
    a,
  ): Promise<{ ok: true; meetUrl: string | null } | { ok: false; reason: string }> => {
    const found = await ctx.runQuery(internal.google.bookingByReference, { reference: a.reference });
    if (!found) return { ok: false, reason: "unknown-booking" };
    const { booking, hostTimezone, invitees } = found;
    if (booking.google_event_id) return { ok: false, reason: "already-attached" };

    const creds = await ctx.runAction(internal.google.accessTokenFor, { userId: booking.host_id });
    if (!creds) return { ok: false, reason: "not-connected" };

    const attendees = [{ email: booking.guest_email, name: booking.guest_name }, ...invitees];
    try {
      const event = await createEvent(creds.token, creds.calendarId, {
        summary: booking.host_created ? booking.meeting_name : `${booking.meeting_name} — ${booking.guest_name}`,
        description: booking.guest_note
          ? `Booked through Meetrao.\n\nNote from ${booking.guest_name}:\n${booking.guest_note}`
          : "Booked through Meetrao.",
        startMs: booking.starts_at,
        endMs: booking.ends_at,
        timeZone: hostTimezone,
        attendees,
      });
      await ctx.runMutation(internal.google.attachEvent, {
        reference: a.reference, eventId: event.eventId, meetUrl: event.meetUrl,
      });
      return { ok: true, meetUrl: event.meetUrl };
    } catch {
      return { ok: false, reason: "api-unavailable" };
    }
  },
});

/**
 * Moves the event for a booking that has already been moved in our own data.
 *
 * Patches the existing event rather than replacing it, so the Meet link the
 * guest already holds keeps working — the promise booking-changed.html makes
 * in as many words. An event that has vanished from the host's calendar is
 * recreated instead, which is the one case where a new Meet link is the
 * honest outcome: there is no old event left to keep.
 *
 * Returns a failure rather than throwing, like its siblings: the booking has
 * already moved by the time this runs, and Google refusing does not un-move it.
 */
export const updateEventForBooking = action({
  args: { reference: v.string() },
  handler: async (
    ctx,
    a,
  ): Promise<{ ok: true; meetUrl: string | null; recreated: boolean } | { ok: false; reason: string }> => {
    const found = await ctx.runQuery(internal.google.bookingByReference, { reference: a.reference });
    if (!found) return { ok: false, reason: "unknown-booking" };
    const { booking, hostTimezone, invitees } = found;
    // Nothing to move. The booking simply never had an event.
    if (!booking.google_event_id) return { ok: false, reason: "no-event" };

    const creds = await ctx.runAction(internal.google.accessTokenFor, { userId: booking.host_id });
    if (!creds) return { ok: false, reason: "not-connected" };

    const outcome = await patchEventTime(creds.token, creds.calendarId, booking.google_event_id, {
      startMs: booking.starts_at,
      endMs: booking.ends_at,
      timeZone: hostTimezone,
    });
    if (outcome === "patched") return { ok: true, meetUrl: booking.meet_url, recreated: false };
    if (outcome === "failed") return { ok: false, reason: "api-unavailable" };

    // "missing": the host deleted the event in Google. Make a fresh one.
    try {
      const event = await createEvent(creds.token, creds.calendarId, {
        summary: booking.host_created ? booking.meeting_name : `${booking.meeting_name} — ${booking.guest_name}`,
        description: booking.guest_note
          ? `Booked through Meetrao.\n\nNote from ${booking.guest_name}:\n${booking.guest_note}`
          : "Booked through Meetrao.",
        startMs: booking.starts_at,
        endMs: booking.ends_at,
        timeZone: hostTimezone,
        attendees: [{ email: booking.guest_email, name: booking.guest_name }, ...invitees],
      });
      await ctx.runMutation(internal.google.attachEvent, {
        reference: a.reference, eventId: event.eventId, meetUrl: event.meetUrl,
      });
      return { ok: true, meetUrl: event.meetUrl, recreated: true };
    } catch {
      return { ok: false, reason: "api-unavailable" };
    }
  },
});

/** Removes the event for a booking. "Already gone" counts as done. */
export const deleteEventForBooking = action({
  args: { reference: v.string() },
  handler: async (ctx, a): Promise<{ ok: boolean; reason?: string }> => {
    const found = await ctx.runQuery(internal.google.bookingByReference, { reference: a.reference });
    if (!found?.booking.google_event_id) return { ok: true };

    const creds = await ctx.runAction(internal.google.accessTokenFor, { userId: found.booking.host_id });
    if (!creds) return { ok: false, reason: "not-connected" };

    const outcome = await deleteEvent(creds.token, creds.calendarId, found.booking.google_event_id);
    if (outcome === "failed") return { ok: false, reason: "api-unavailable" };
    await ctx.runMutation(internal.google.attachEvent, { reference: a.reference, eventId: null, meetUrl: null });
    return { ok: true };
  },
});

/* ── connect and disconnect ────────────────────────────────────────────────── */

export const upsertConnection = internalMutation({
  args: {
    userId: v.string(),
    googleAccountEmail: v.union(v.string(), v.null()),
    accessToken: v.string(),
    refreshToken: v.union(v.string(), v.null()),
    expiresAtMs: v.number(),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, a) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("calendar_connections").withIndex("by_user", (q) => q.eq("user_id", a.userId)).unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        google_account_email: a.googleAccountEmail,
        access_token: a.accessToken,
        refresh_token: a.refreshToken ?? existing.refresh_token,
        token_expires_at: a.expiresAtMs,
        scopes: a.scopes,
        needs_reconnect: false,
        last_error: null,
        last_error_at: null,
        updated_at: now,
      });
      return existing.id;
    }

    const id = crypto.randomUUID();
    await ctx.db.insert("calendar_connections", {
      id, user_id: a.userId, provider: "google",
      google_account_email: a.googleAccountEmail, calendar_id: "primary",
      access_token: a.accessToken, refresh_token: a.refreshToken, token_expires_at: a.expiresAtMs,
      scopes: a.scopes, needs_reconnect: false, last_error: null, last_error_at: null,
      created_at: now, updated_at: now,
    });
    await ctx.db.insert("admin_activity", {
      id: crypto.randomUUID(), actor_id: a.userId, kind: "calendar_connected",
      summary: `Connected ${a.googleAccountEmail ?? "a Google calendar"}`, created_at: now,
    });
    return id;
  },
});

/**
 * The OAuth callback's other half: exchange the code and store the tokens.
 *
 * The CODE is what authorises this — it is single-use, arrives from Google via
 * our own registered redirect URI, and the caller must also be signed in, so
 * the tokens can only ever be attached to the caller's own account.
 */
export const completeConnect = action({
  args: { code: v.string(), redirectUri: v.string() },
  handler: async (ctx, a): Promise<{ ok: true; email: string | null } | { ok: false; reason: string }> => {
    const userId = await ctx.runQuery(internal.google.callerId, {});
    if (!userId) fail("Not signed in.", "UNAUTHENTICATED");

    let tokens;
    try {
      tokens = await exchangeCode(a.code, a.redirectUri);
    } catch {
      return { ok: false, reason: "exchange-failed" };
    }
    if (!hasCalendarWrite(tokens.scopes)) return { ok: false, reason: "missing-scope" };

    const email = await fetchAccountEmail(tokens.accessToken);
    await ctx.runMutation(internal.google.upsertConnection, {
      userId,
      googleAccountEmail: email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAtMs: tokens.expiresAtMs,
      scopes: tokens.scopes,
    });
    return { ok: true, email };
  },
});

export const takeTokensForRevoke = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, a) => {
    const c = await ctx.db.query("calendar_connections").withIndex("by_user", (q) => q.eq("user_id", a.userId)).unique();
    if (!c) return null;
    const tokens = { refresh: c.refresh_token, access: c.access_token };
    await ctx.db.delete(c._id);
    return tokens;
  },
});

/**
 * Disconnect: take the token, then revoke it.
 *
 * `takeTokensForRevoke` reads and deletes in ONE transaction and hands the
 * token back, which is what makes the order safe. Deleting the row on its own
 * would leave the grant alive in the host's Google account with nothing left
 * to revoke it with — the UI would say "disconnected", the calendar would be
 * unreachable, and the grant would quietly survive.
 *
 * The revoke never throws and never hangs, so a bad afternoon at Google cannot
 * block a host disconnecting. It can still leave a grant standing if this
 * action dies between the two steps; that is the residual, and it is why
 * revokeToken has a timeout rather than a retry.
 */
export const disconnect = action({
  args: {},
  handler: async (ctx): Promise<{ ok: true; revoked: string }> => {
    const userId = await ctx.runQuery(internal.google.callerId, {});
    if (!userId) fail("Not signed in.", "UNAUTHENTICATED");

    const tokens = await ctx.runMutation(internal.google.takeTokensForRevoke, { userId });
    if (!tokens) return { ok: true, revoked: "nothing-to-revoke" };

    const outcome = await revokeToken(tokens.refresh ?? tokens.access ?? "");
    return { ok: true, revoked: outcome };
  },
});

/** An admin disconnecting someone else's calendar, or account removal doing it. */
export const disconnectFor = action({
  args: { userId: v.string() },
  handler: async (ctx, a): Promise<{ ok: true; revoked: string }> => {
    const userId = await ctx.runQuery(internal.google.callerId, {});
    if (!userId) fail("Not signed in.", "UNAUTHENTICATED");

    const caller = await ctx.runQuery(internal.google.profileOf, { userId });
    // Your own, or an admin acting on someone else's. Nothing else.
    if (userId !== a.userId && !caller?.is_admin) fail("Not permitted.", "FORBIDDEN");

    const tokens = await ctx.runMutation(internal.google.takeTokensForRevoke, { userId: a.userId });
    if (!tokens) return { ok: true, revoked: "nothing-to-revoke" };
    const outcome = await revokeToken(tokens.refresh ?? tokens.access ?? "");
    return { ok: true, revoked: outcome };
  },
});

/**
 * The caller's profile id, for use from an ACTION.
 *
 * Actions have no `ctx.db`, so they cannot call `currentUserId` themselves —
 * and `identity.subject` is "<userId>|<sessionId>", which is not what any row
 * in this database is keyed by. Three actions in this file used the raw
 * subject, and every one of them failed silently:
 *
 *   · `completeConnect` stored a fresh connection under a key no screen reads,
 *     so reconnecting a calendar appeared to do nothing;
 *   · `disconnect` looked up a row that could not match, found none, and
 *     reported "nothing-to-revoke" as success;
 *   · `disconnectFor` resolved no profile, so its admin check saw a non-admin
 *     acting on someone else and refused every caller with FORBIDDEN.
 *
 * `ctx.runQuery` from an action carries the caller's identity, so this is the
 * same answer `requireProfile` gives the queries next door.
 */
export const callerId = internalQuery({
  args: {},
  handler: async (ctx) => await currentUserId(ctx),
});

export const profileOf = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, a) =>
    await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.userId)).unique(),
});

/** Connection state for the Settings and dashboard cards. Never a token. */
export const statusFor = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, a) => {
    const c = await ctx.db.query("calendar_connections").withIndex("by_user", (q) => q.eq("user_id", a.userId)).unique();
    if (!c) return { connected: false as const, email: null, needsReconnect: false, lastError: null };
    return {
      connected: true as const,
      email: c.google_account_email,
      needsReconnect: c.needs_reconnect,
      lastError: c.last_error,
    };
  },
});
