import { action, internalAction, internalMutation, internalQuery, mutation, query, type ActionCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fail } from "./lib/errors";
import { currentUserId, requireProfile } from "./lib/auth";
import { logActivity } from "./lib/effects";
import { assertServerCall } from "./lib/serverSecret";
import {
  busyFromIcs, FeedParseError, maskFeedUrl, normalizeFeedUrl, type BusyInterval,
} from "./lib/icalFeed";

/* ─────────────────────────────────────────────────────────────────────────────
   The host's calendar feed: where booking-page conflicts come from.

   It replaced the Google Calendar connection. Instead of an OAuth grant, the
   host pastes their calendar's private iCal address; this file fetches it,
   keeps only busy start/end times, and caches them on the row for a few
   minutes so a busy booking page does not fetch the feed on every view.

   THE ADDRESS IS A SECRET. Whoever holds it can read the whole calendar. So:
     · it is stored here and nowhere else, and only internal functions read it;
     · what a client sees is `url_hint`, the host plus four characters;
     · it is never logged, and no error message carries it (fetch errors are
       mapped to fixed sentences before they go anywhere).

   `busyForHost` returns a host's busy times to anyone who can call it, so it
   is server-only, exactly as the Google lookup it replaced was.
   ───────────────────────────────────────────────────────────────────────────── */

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** How long a read is trusted before the next booking page re-reads the feed. */
export const FRESH_FOR_MS = 5 * MINUTE;
/** After a failed read, how long before trying again rather than failing fast. */
const RETRY_AFTER_MS = MINUTE;
/** The span each read covers: yesterday to a year out, the longest booking window. */
const LOOK_BACK_MS = DAY;
const LOOK_AHEAD_MS = 366 * DAY;
const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 15_000;

/* ── reading the feed ──────────────────────────────────────────────────────── */

type ReadResult = { ok: true; busy: BusyInterval[]; from: number; to: number } | { ok: false; error: string };

/** Fetch and parse. Never throws, and no message it returns names the address. */
async function readFeed(url: string, hostZone: string): Promise<ReadResult> {
  const now = Date.now();
  const window = { from: now - LOOK_BACK_MS, to: now + LOOK_AHEAD_MS };
  let text: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "text/calendar, text/plain;q=0.9, */*;q=0.5", "User-Agent": "Meetrao-Calendar-Feed/1.0" },
        redirect: "follow",
      });
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        return { ok: false, error: "The calendar said this address is not valid (it may have been reset)." };
      }
      if (!response.ok) return { ok: false, error: `The calendar could not be reached (HTTP ${response.status}).` };
      const length = Number(response.headers.get("content-length") ?? 0);
      if (length > MAX_BYTES) return { ok: false, error: "The calendar is too large to read." };
      text = await response.text();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { ok: false, error: "The calendar could not be reached." };
  }
  if (text.length > MAX_BYTES) return { ok: false, error: "The calendar is too large to read." };

  try {
    return { ok: true, busy: busyFromIcs(text, window, hostZone), ...window };
  } catch (cause) {
    return {
      ok: false,
      error: cause instanceof FeedParseError ? cause.message : "The calendar could not be read.",
    };
  }
}

function inWindow(busy: BusyInterval[], from: number, to: number): BusyInterval[] {
  return busy.filter((b) => b.end > from && b.start < to);
}

/* ── internal plumbing ─────────────────────────────────────────────────────── */

export const feedContext = internalQuery({
  args: { hostId: v.string() },
  handler: async (ctx, a) => {
    const host = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.hostId)).unique();
    if (!host || host.is_suspended) return null;
    const feed = await ctx.db.query("calendar_feeds").withIndex("by_user", (q) => q.eq("user_id", a.hostId)).unique();
    return { timezone: host.timezone, feed };
  },
});

/** Records a read, if the address it read is still the host's address. */
export const recordRead = internalMutation({
  args: {
    userId: v.string(),
    url: v.string(),
    busy: v.array(v.object({ start: v.number(), end: v.number() })),
    from: v.number(),
    to: v.number(),
  },
  handler: async (ctx, a) => {
    const feed = await ctx.db.query("calendar_feeds").withIndex("by_user", (q) => q.eq("user_id", a.userId)).unique();
    if (!feed || feed.url !== a.url) return false;
    const now = Date.now();
    await ctx.db.patch(feed._id, {
      busy: a.busy, window_from: a.from, window_to: a.to,
      fetched_at: now, last_error: null, last_error_at: null, updated_at: now,
    });
    return true;
  },
});

export const recordError = internalMutation({
  args: { userId: v.string(), url: v.string(), error: v.string() },
  handler: async (ctx, a) => {
    const feed = await ctx.db.query("calendar_feeds").withIndex("by_user", (q) => q.eq("user_id", a.userId)).unique();
    if (!feed || feed.url !== a.url) return false;
    const now = Date.now();
    await ctx.db.patch(feed._id, { last_error: a.error, last_error_at: now, updated_at: now });
    return true;
  },
});

export const saveFeed = internalMutation({
  args: {
    userId: v.string(),
    url: v.string(),
    busy: v.array(v.object({ start: v.number(), end: v.number() })),
    from: v.number(),
    to: v.number(),
  },
  handler: async (ctx, a) => {
    const now = Date.now();
    const row = {
      url: a.url, url_hint: maskFeedUrl(a.url), busy: a.busy, window_from: a.from, window_to: a.to,
      fetched_at: now, last_error: null, last_error_at: null, updated_at: now,
    };
    const existing = await ctx.db.query("calendar_feeds").withIndex("by_user", (q) => q.eq("user_id", a.userId)).unique();
    if (existing) {
      await ctx.db.patch(existing._id, row);
    } else {
      await ctx.db.insert("calendar_feeds", { user_id: a.userId, created_at: now, ...row });
      await logActivity(ctx, { actorId: a.userId, kind: "calendar_feed_added", summary: `Added a calendar feed (${row.url_hint})` });
    }
    return row.url_hint;
  },
});

export const callerId = internalQuery({
  args: {},
  handler: async (ctx) => await currentUserId(ctx),
});

/** Reads the feed now and stores what it found. */
async function refresh(
  ctx: ActionCtx,
  userId: string,
  feed: Doc<"calendar_feeds">,
  timezone: string,
): Promise<ReadResult> {
  const read = await readFeed(feed.url, timezone);
  if (read.ok) {
    await ctx.runMutation(internal.calendarFeed.recordRead, {
      userId, url: feed.url, busy: read.busy, from: read.from, to: read.to,
    });
  } else {
    await ctx.runMutation(internal.calendarFeed.recordError, { userId, url: feed.url, error: read.error });
  }
  return read;
}

/* ── the booking page's question ───────────────────────────────────────────── */

/**
 * Busy blocks from the host's calendar feed, for the booking page, slots and
 * booking creation.
 *
 * Server only (CONVEX_SERVER_SECRET): without it, anyone holding a host id
 * could read their busy times and make us fetch their feed on demand.
 *
 * `checked: false` means "we could not consult the host's calendar": no feed,
 * or a feed that could not be read. The caller still applies Meetrao's own
 * bookings. A cached read younger than FRESH_FOR_MS is used as it is.
 */
export const busyForHost = action({
  args: { hostId: v.string(), from: v.number(), to: v.number(), secret: v.optional(v.string()) },
  handler: async (ctx, a): Promise<{ busy: BusyInterval[]; checked: boolean }> => {
    assertServerCall(a.secret);
    const found = await ctx.runQuery(internal.calendarFeed.feedContext, { hostId: a.hostId });
    if (!found?.feed) return { busy: [], checked: false };
    const { feed, timezone } = found;

    const now = Date.now();
    /* Each read covers yesterday to a year out. The past needs no checking
       (nothing can be booked there), and a request past a year is answered as
       far as the read goes, so neither forces a re-read on every view. */
    const needTo = Math.min(a.to, now + LOOK_AHEAD_MS - DAY);
    const covers = (f: { window_to: number }) => f.window_to >= needTo;
    const fresh = feed.fetched_at !== null && now - feed.fetched_at < FRESH_FOR_MS;
    if (fresh && covers({ window_to: feed.window_to })) return { busy: inWindow(feed.busy, a.from, a.to), checked: true };

    // A read failed a moment ago: do not make every page view wait on it again.
    const failedRecently =
      feed.last_error_at !== null && now - feed.last_error_at < RETRY_AFTER_MS &&
      (feed.fetched_at === null || feed.last_error_at > feed.fetched_at);
    if (failedRecently) return { busy: [], checked: false };

    const read = await refresh(ctx, a.hostId, feed, timezone);
    if (!read.ok) return { busy: [], checked: false };
    return { busy: inWindow(read.busy, a.from, a.to), checked: true };
  },
});

/* ── the host's own feed ───────────────────────────────────────────────────── */

/** What Settings shows. Never the address itself. */
export const statusOwn = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const feed = await ctx.db.query("calendar_feeds").withIndex("by_user", (q) => q.eq("user_id", me.id)).unique();
    if (!feed) return null;
    const failing = feed.last_error_at !== null && (feed.fetched_at === null || feed.last_error_at > feed.fetched_at);
    return {
      hint: feed.url_hint,
      state: failing ? ("unreachable" as const) : ("ok" as const),
      fetchedAt: feed.fetched_at,
      lastError: failing ? feed.last_error : null,
      lastErrorAt: failing ? feed.last_error_at : null,
      busyCount: feed.busy.length,
    };
  },
});

/**
 * Saves the host's feed address, after reading it once.
 *
 * Reading first means a typo, a login page or a revoked address is caught
 * while the host is still looking at the field, instead of surfacing later as
 * a booking page that quietly ignores their calendar.
 */
export const saveOwn = action({
  args: { url: v.string() },
  handler: async (ctx, a): Promise<{ ok: true; hint: string; busyCount: number } | { ok: false; error: string }> => {
    const userId = await ctx.runQuery(internal.calendarFeed.callerId, {});
    if (!userId) fail("Not signed in.", "UNAUTHENTICATED");
    const normal = normalizeFeedUrl(a.url);
    if (!normal.ok) return normal;
    const context = await ctx.runQuery(internal.calendarFeed.feedContext, { hostId: userId });
    if (!context) fail("Not permitted.", "FORBIDDEN");

    const read = await readFeed(normal.url, context.timezone);
    if (!read.ok) return { ok: false, error: read.error };
    const hint = await ctx.runMutation(internal.calendarFeed.saveFeed, {
      userId, url: normal.url, busy: read.busy, from: read.from, to: read.to,
    });
    return { ok: true, hint, busyCount: read.busy.length };
  },
});

/** Saves a feed for a named host: verification scripts and support only. */
export const saveFor = internalAction({
  args: { userId: v.string(), url: v.string() },
  handler: async (ctx, a): Promise<{ ok: true; hint: string; busyCount: number } | { ok: false; error: string }> => {
    const normal = normalizeFeedUrl(a.url);
    if (!normal.ok) return normal;
    const context = await ctx.runQuery(internal.calendarFeed.feedContext, { hostId: a.userId });
    if (!context) return { ok: false, error: "No such host." };
    const read = await readFeed(normal.url, context.timezone);
    if (!read.ok) return read;
    const hint = await ctx.runMutation(internal.calendarFeed.saveFeed, {
      userId: a.userId, url: normal.url, busy: read.busy, from: read.from, to: read.to,
    });
    return { ok: true, hint, busyCount: read.busy.length };
  },
});

/** "Check now" in Settings. */
export const refreshOwn = action({
  args: {},
  handler: async (ctx): Promise<{ ok: true; busyCount: number } | { ok: false; error: string }> => {
    const userId = await ctx.runQuery(internal.calendarFeed.callerId, {});
    if (!userId) fail("Not signed in.", "UNAUTHENTICATED");
    const context = await ctx.runQuery(internal.calendarFeed.feedContext, { hostId: userId });
    if (!context?.feed) return { ok: false, error: "No calendar feed is set." };
    const read = await refresh(ctx, userId, context.feed, context.timezone);
    return read.ok ? { ok: true, busyCount: read.busy.length } : { ok: false, error: read.error };
  },
});

/** Removes the address and every busy time read from it. */
export const removeOwn = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const feed = await ctx.db.query("calendar_feeds").withIndex("by_user", (q) => q.eq("user_id", me.id)).unique();
    if (!feed) return false;
    await ctx.db.delete(feed._id);
    await logActivity(ctx, { actorId: me.id, kind: "calendar_feed_removed", summary: "Removed their calendar feed" });
    return true;
  },
});
