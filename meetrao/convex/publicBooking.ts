import { query, mutation, internalQuery } from "./_generated/server";
import { fail } from "./lib/errors";
import { v } from "convex/values";
import { bookingOut } from "./lib/serialize";
import { uuid } from "./lib/ids";
import { insertBooking, moveBooking } from "./bookings";
import { rulesForMeeting } from "./availability";
import { zonedWeekdayMinute } from "./lib/zoned";
import { notifyBookingCancelled, logActivity } from "./lib/effects";
import { consume } from "./lib/rateLimit";

/* ─────────────────────────────────────────────────────────────────────────────
   The guest path — every function here is reachable with NO session, exactly
   as the `anon` grants made the SQL RPCs reachable.

   Two things follow, and both were true in Postgres too:

   · These functions must never return anything a guest should not see. The
     host projection below is deliberately narrow — it is not `profileOut`,
     because a profile carries an email, notification preferences and admin
     flags. `get_public_host` had the same shape for the same reason.

   · create_booking re-validates EVERYTHING. The slot engine in
     src/lib/booking/slots.ts already filtered the times on the way in, but
     anyone can call this directly, so notice, window, availability and overlap
     are all checked again here. Migration 0005 exists because that check was
     once missing and a Sunday 10:00 booking was accepted for a weekday host.
   ───────────────────────────────────────────────────────────────────────────── */

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const getHost = query({
  args: { username: v.string() },
  handler: async (ctx, a) => {
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("username_lower", a.username.trim().toLowerCase()))
      .unique();
    if (!p) return null;
    // Narrow on purpose. See the note above.
    return {
      id: p.id,
      username: p.username,
      full_name: p.full_name,
      job_title: p.job_title,
      avatar_url: p.avatar_url,
      timezone: p.timezone,
      is_suspended: p.is_suspended,
    };
  },
});

export const getMeetingTypes = query({
  args: { username: v.string() },
  handler: async (ctx, a) => {
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("username_lower", a.username.trim().toLowerCase()))
      .unique();
    if (!p || p.is_suspended) return [];
    const rows = await ctx.db.query("meeting_types").withIndex("by_user", (q) => q.eq("user_id", p.id)).collect();
    return rows
      .filter((m) => m.is_active)
      .sort((x, y) => x.created_at - y.created_at)
      .map((m) => ({
        id: m.id, name: m.name, description: m.description, slug: m.slug,
        duration_minutes: m.duration_minutes, location: m.location,
      }));
  },
});

/** public.get_meeting_availability — the rules a booking page renders from. */
export const getMeetingAvailability = query({
  args: { username: v.string(), slug: v.string() },
  handler: async (ctx, a) => {
    const host = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("username_lower", a.username.trim().toLowerCase()))
      .unique();
    if (!host || host.is_suspended) return null;

    const meeting = await ctx.db
      .query("meeting_types")
      .withIndex("by_user_slug", (q) => q.eq("user_id", host.id).eq("slug", a.slug.trim().toLowerCase()))
      .unique();
    if (!meeting || !meeting.is_active) return null;

    const rules = await rulesForMeeting(ctx, host.id, meeting.schedule_id);
    return {
      host: { id: host.id, username: host.username, full_name: host.full_name, job_title: host.job_title, avatar_url: host.avatar_url, timezone: host.timezone },
      meeting: {
        id: meeting.id, name: meeting.name, description: meeting.description, slug: meeting.slug,
        duration_minutes: meeting.duration_minutes, buffer_minutes: meeting.buffer_minutes,
        minimum_notice_minutes: meeting.minimum_notice_minutes, booking_window_days: meeting.booking_window_days,
        location: meeting.location,
      },
      rules: rules.map((r) => ({ weekday: r.weekday, start_minute: r.start_minute, end_minute: r.end_minute })),
    };
  },
});

/** The hours behind ONE meeting, by its id — a meeting's own schedule, or the
 *  host's default when it has none. Only hours; a schedule's name is the
 *  host's private note to themselves. */
export const availabilityForMeeting = query({
  args: { meetingId: v.string() },
  handler: async (ctx, a) => {
    const meeting = await ctx.db.query("meeting_types").withIndex("by_uuid", (q) => q.eq("id", a.meetingId)).unique();
    if (!meeting || !meeting.is_active) return [];
    const rules = await rulesForMeeting(ctx, meeting.user_id, meeting.schedule_id);
    return rules.map((r) => ({ weekday: r.weekday, start_minute: r.start_minute, end_minute: r.end_minute }));
  },
});

/**
 * Busy blocks for a host, for the booking page.
 *
 * ── A deliberate, bounded widening, and worth understanding ─────────────────
 * `get_busy_intervals` was revoked from anon and authenticated in migration
 * 0003 precisely because it returned ANY host's occupied blocks over an
 * ARBITRARY window to anyone holding the publishable key. The internal version
 * below preserves that. But the booking page has no session, and a Convex
 * internalQuery cannot be reached from the app's server code without shipping
 * an admin key into the app — which would be worse than the problem.
 *
 * So this is public, and the teeth from 0003 are kept as constraints instead:
 *   · the host must exist and not be suspended
 *   · the window is clamped, and capped at 90 days of span
 *   · only start/end are returned — never a guest name, email or meeting
 *
 * What it discloses is therefore what the booking page already discloses by
 * showing which slots are gone. The stricter alternative is to move slot
 * computation itself into Convex so intervals never leave; that is the right
 * end state and is noted in docs/convex-migration-status.md.
 */
export const busyForHost = query({
  args: { hostId: v.string(), from: v.number(), to: v.number() },
  handler: async (ctx, a) => {
    const host = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.hostId)).unique();
    if (!host || host.is_suspended) return [];

    const now = Date.now();
    const from = Math.max(a.from, now - DAY);
    const to = Math.min(a.to, now + 365 * DAY, from + 90 * DAY);
    if (to <= from) return [];

    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_host_starts", (q) => q.eq("host_id", a.hostId).gte("starts_at", from - DAY).lte("starts_at", to))
      .collect();

    return rows
      .filter((b) => b.status === "confirmed" && b.ends_at > from && b.starts_at < to)
      .map((b) => ({ starts_at: new Date(b.starts_at).toISOString(), ends_at: new Date(b.ends_at).toISOString() }));
  },
});

/**
 * public.get_busy_intervals.
 *
 * Migration 0003 revoked this from anon and authenticated after it was found
 * callable by anyone with the publishable key: it returns a host's occupied
 * blocks over an arbitrary window. internalQuery is the equivalent — it cannot
 * be called from a client at all, only by server code.
 */
export const getBusyIntervals = internalQuery({
  args: { hostId: v.string(), from: v.number(), to: v.number() },
  handler: async (ctx, a) => {
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_host_starts", (q) => q.eq("host_id", a.hostId).gte("starts_at", a.from - DAY).lte("starts_at", a.to))
      .collect();
    return rows
      .filter((b) => b.status === "confirmed" && b.ends_at > a.from && b.starts_at < a.to)
      .map((b) => ({ start: b.starts_at, end: b.ends_at }));
  },
});

export const recordPageView = mutation({
  args: { hostId: v.string(), meetingTypeId: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => {
    const id = uuid();
    await ctx.db.insert("booking_page_views", {
      id, host_id: a.hostId, meeting_type_id: a.meetingTypeId, opened_at: Date.now(),
    });
    return id;
  },
});

/** public.create_booking. Every guard from migration 0005, in order. */
export const createBooking = mutation({
  args: {
    username: v.string(), slug: v.string(), startsAt: v.number(),
    guestName: v.string(), guestEmail: v.string(),
    guestNote: v.optional(v.string()), guestTimezone: v.optional(v.union(v.string(), v.null())),
    pageViewId: v.optional(v.union(v.string(), v.null())),
    /** A coarse caller key from our own route handler, which can see the IP. */
    callerKey: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const host = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("username_lower", a.username.trim().toLowerCase()))
      .unique();
    if (!host) fail("unknown host");
    if (host.is_suspended) fail("host is not accepting bookings");

    const meeting = await ctx.db
      .query("meeting_types")
      .withIndex("by_user_slug", (q) => q.eq("user_id", host.id).eq("slug", a.slug.trim().toLowerCase()))
      .unique();
    if (!meeting || !meeting.is_active) fail("unknown meeting");

    const now = Date.now();
    if (a.startsAt < now + meeting.minimum_notice_minutes * MINUTE) fail("inside minimum notice");
    if (a.startsAt > now + meeting.booking_window_days * DAY) fail("beyond booking window");

    // The host's own weekday and minute-of-day, as create_booking computed them.
    const { weekday, minute } = zonedWeekdayMinute(a.startsAt, host.timezone);
    const rules = await rulesForMeeting(ctx, host.id, meeting.schedule_id);
    const fits = rules.some(
      (r) => r.weekday === weekday && minute >= r.start_minute && minute + meeting.duration_minutes <= r.end_minute,
    );
    if (!fits) fail("outside availability");

    /* Limits are consumed only once the booking is known to be legitimate, so
       a guest cannot be locked out by someone else's malformed attempts at the
       same host — but before the insert, so a flood cannot land rows. */
    const guestKey = a.guestEmail.trim().toLowerCase();
    await consume(ctx, [
      { key: `host:${host.id}`, limit: 30, windowMs: 60 * 60_000, message: "This host has taken too many bookings just now. Try again shortly." },
      { key: `guest:${guestKey}`, limit: 5, windowMs: 60 * 60_000, message: "You have made several bookings just now. Try again shortly." },
      ...(a.callerKey ? [{ key: `caller:${a.callerKey}`, limit: 20, windowMs: 60 * 60_000, message: "Too many requests. Try again shortly." }] : []),
    ]);

    const booking = await insertBooking(ctx, {
      hostId: host.id,
      meetingTypeId: meeting.id,
      meetingName: meeting.name,
      durationMinutes: meeting.duration_minutes,
      guestName: a.guestName,
      guestEmail: a.guestEmail,
      guestNote: a.guestNote ?? "",
      guestTimezone: a.guestTimezone ?? null,
      startsAt: a.startsAt,
      bufferMinutes: meeting.buffer_minutes,
      hostCreated: false,
      pageViewId: a.pageViewId ?? null,
    });

    return {
      reference: booking.reference, id: booking.id,
      starts_at: new Date(booking.starts_at).toISOString(),
      ends_at: new Date(booking.ends_at).toISOString(),
      meeting_name: booking.meeting_name, duration: booking.duration_minutes, host_id: booking.host_id,
    };
  },
});

/** public.get_booking_by_reference — the guest's own confirmation screen. */
export const getByReference = query({
  args: { reference: v.string() },
  handler: async (ctx, a) => {
    const b = await ctx.db.query("bookings").withIndex("by_reference", (q) => q.eq("reference", a.reference.trim())).unique();
    if (!b) return null;
    const host = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", b.host_id)).unique();
    /* The meeting's slug, so the guest's own screen can offer to move the
       booking: the slot query is keyed by username and slug, and the booking
       row carries only an id. `null` when the meeting has since been deleted
       or switched off, which is what the screen reads as "cannot be moved". */
    const meeting = b.meeting_type_id
      ? await ctx.db
          .query("meeting_types")
          .withIndex("by_uuid", (q) => q.eq("id", b.meeting_type_id as string))
          .unique()
      : null;
    return {
      ...bookingOut(b),
      meeting_slug: meeting && meeting.is_active ? meeting.slug : null,
      host: host ? { username: host.username, full_name: host.full_name, timezone: host.timezone, avatar_url: host.avatar_url } : null,
    };
  },
});

/** public.cancel_booking_by_reference. The reference IS the authorisation. */
export const cancelByReference = mutation({
  args: { reference: v.string() },
  handler: async (ctx, a) => {
    const b = await ctx.db.query("bookings").withIndex("by_reference", (q) => q.eq("reference", a.reference.trim())).unique();
    if (!b) fail("unknown booking", "NOT_FOUND");
    // `was_open` mirrors the RPC: cancelling twice is not a failure from the
    // guest's side, but only the first time should send mail or touch Google.
    if (b.status === "cancelled") return { booking: bookingOut(b), was_open: false };

    const now = Date.now();
    await ctx.db.patch(b._id, { status: "cancelled", cancelled_at: now, cancelled_by: "guest", updated_at: now });
    const after = (await ctx.db.get(b._id))!;

    await notifyBookingCancelled(ctx, after);
    await logActivity(ctx, {
      actorId: after.host_id, kind: "booking_cancelled",
      summary: `${after.guest_name} cancelled ${after.meeting_name}`,
    });
    return { booking: bookingOut(after), was_open: true };
  },
});

/**
 * The guest moving their own booking. The reference IS the authorisation, as
 * it is for cancelling — and moving is the gentler of the two, so nothing
 * stricter is warranted.
 *
 * Every guard `createBooking` applies runs again here, for the same reason it
 * runs there: the slot engine filtered the times on the way in, and anyone can
 * call this directly. Migration 0005 is what a missing check looks like.
 *
 * A booking with no live meeting type behind it — a meeting the host has since
 * deleted, or one the host arranged themselves — is refused rather than moved
 * against rules that no longer exist. The guest can still cancel.
 */
export const rescheduleByReference = mutation({
  args: {
    reference: v.string(),
    startsAt: v.number(),
    /** A coarse caller key from our own route handler, which can see the IP. */
    callerKey: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const b = await ctx.db
      .query("bookings")
      .withIndex("by_reference", (q) => q.eq("reference", a.reference.trim()))
      .unique();
    if (!b) fail("unknown booking", "NOT_FOUND");
    if (b.status !== "confirmed") fail("This meeting has been cancelled.");

    const host = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", b.host_id)).unique();
    if (!host) fail("unknown host");
    if (host.is_suspended) fail("host is not accepting bookings");

    const meeting = b.meeting_type_id
      ? await ctx.db
          .query("meeting_types")
          .withIndex("by_uuid", (q) => q.eq("id", b.meeting_type_id as string))
          .unique()
      : null;
    if (!meeting || !meeting.is_active) fail("This meeting can no longer be moved online.");

    const now = Date.now();
    if (a.startsAt < now + meeting.minimum_notice_minutes * MINUTE) fail("inside minimum notice");
    if (a.startsAt > now + meeting.booking_window_days * DAY) fail("beyond booking window");

    const { weekday, minute } = zonedWeekdayMinute(a.startsAt, host.timezone);
    const rules = await rulesForMeeting(ctx, host.id, meeting.schedule_id);
    const fits = rules.some(
      (r) => r.weekday === weekday && minute >= r.start_minute && minute + b.duration_minutes <= r.end_minute,
    );
    if (!fits) fail("outside availability");

    /* Tighter than booking, on purpose: moving is cheap for the guest and
       expensive for the host, whose calendar and guests are notified each
       time. Consumed after validation, before the write, as create does. */
    await consume(ctx, [
      { key: `move:${b.reference}`, limit: 5, windowMs: 24 * 60 * 60_000, message: "This meeting has been moved several times. Contact the host instead." },
      { key: `host:${host.id}`, limit: 30, windowMs: 60 * 60_000, message: "This host has taken too many bookings just now. Try again shortly." },
      ...(a.callerKey ? [{ key: `caller:${a.callerKey}`, limit: 20, windowMs: 60 * 60_000, message: "Too many requests. Try again shortly." }] : []),
    ]);

    const oldStartsAt = b.starts_at;
    const after = await moveBooking(ctx, {
      booking: b,
      startsAt: a.startsAt,
      bufferMinutes: meeting.buffer_minutes,
      byHost: false,
    });

    return {
      reference: after.reference,
      id: after.id,
      starts_at: new Date(after.starts_at).toISOString(),
      ends_at: new Date(after.ends_at).toISOString(),
      old_starts_at: new Date(oldStartsAt).toISOString(),
    };
  },
});

/**
 * Just enough of the host to address a cancellation email.
 *
 * Scoped by the booking's reference — the guest's own credential — and it
 * returns ONLY the fields the mail template needs. The host's email is in
 * that list because the mail is addressed to them; nothing else about the
 * account comes back.
 */
export const hostForCancellationMail = query({
  args: { reference: v.string() },
  handler: async (ctx, a) => {
    const b = await ctx.db
      .query("bookings").withIndex("by_reference", (q) => q.eq("reference", a.reference.trim())).unique();
    if (!b || b.status !== "cancelled") return null;
    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", b.host_id)).unique();
    if (!p) return null;
    return {
      full_name: p.full_name,
      username: p.username,
      email: p.email,
      timezone: p.timezone,
      notify_booking_cancelled: p.notify_booking_cancelled,
    };
  },
});

/**
 * Just enough of the host to address a reschedule email. Same shape and same
 * reasoning as the two beside it.
 */
export const hostForRescheduleMail = query({
  args: { reference: v.string() },
  handler: async (ctx, a) => {
    const b = await ctx.db
      .query("bookings").withIndex("by_reference", (q) => q.eq("reference", a.reference.trim())).unique();
    if (!b) return null;
    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", b.host_id)).unique();
    if (!p) return null;
    return {
      full_name: p.full_name,
      username: p.username,
      email: p.email,
      timezone: p.timezone,
      notify_booking_changed: p.notify_booking_changed,
    };
  },
});

/**
 * Just enough of the host to address a new-booking email.
 *
 * Same shape and same reasoning as `hostForCancellationMail`: scoped by the
 * booking's reference, and only the fields the template needs.
 */
export const hostForBookingMail = query({
  args: { reference: v.string() },
  handler: async (ctx, a) => {
    const b = await ctx.db
      .query("bookings").withIndex("by_reference", (q) => q.eq("reference", a.reference.trim())).unique();
    if (!b) return null;
    const p = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", b.host_id)).unique();
    if (!p) return null;
    return {
      full_name: p.full_name,
      username: p.username,
      email: p.email,
      notify_new_booking: p.notify_new_booking,
    };
  },
});
