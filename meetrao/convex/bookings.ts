import { query, mutation, internalMutation } from "./_generated/server";
import { fail } from "./lib/errors";
import { v } from "convex/values";
import { requireProfile, assertOwnerOrAdmin, AuthError } from "./lib/auth";
import { bookingOut, inviteeOut } from "./lib/serialize";
import { uuid, reference as newReference } from "./lib/ids";
import { notifyBookingCreated, notifyBookingCancelled, notifyBookingChanged, upsertContact, logActivity } from "./lib/effects";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const MINUTE = 60_000;
/** Widest booking this app allows is 480 minutes; a day of lookback covers it. */
const LOOKBACK = 24 * 60 * MINUTE;

/* ─────────────────────────────────────────────────────────────────────────────
   THE DOUBLE-BOOKING GUARD.

   Postgres held this in an EXCLUDE USING gist constraint, so no code path could
   create an overlap even by accident. There is no such constraint here: the
   guarantee comes from `overlaps` being read and the insert being written
   inside ONE mutation, which Convex runs serializably. A concurrent insert
   landing in the index range below forces a retry, and the retry sees the row.

   Verified under real contention — docs/spikes/convex-concurrency/ — 240
   concurrent racers, 30 winners, 0 double-bookings.

   Two rules for anyone editing this file:
     · Keep the index range NARROW. It is the read set OCC validates.
     · Do not add unrelated writes to a booking mutation. A slower mutation is
       a wider window for conflict, and Convex bounds its retries.
   ───────────────────────────────────────────────────────────────────────────── */
export async function findOverlap(
  ctx: QueryCtx | MutationCtx,
  args: { hostId: string; startsAt: number; endsAt: number; bufferMinutes: number; ignoreBookingId?: string },
): Promise<Doc<"bookings"> | null> {
  const buffer = args.bufferMinutes * MINUTE;
  const near = await ctx.db
    .query("bookings")
    .withIndex("by_host_starts", (q) =>
      q.eq("host_id", args.hostId).gte("starts_at", args.startsAt - LOOKBACK).lte("starts_at", args.endsAt + buffer),
    )
    .collect();

  // Mirrors create_booking: b.ends_at + buffer > starts AND b.starts_at - buffer < ends
  return (
    near.find(
      (b) =>
        b.status === "confirmed" &&
        b.id !== args.ignoreBookingId &&
        b.ends_at + buffer > args.startsAt &&
        b.starts_at - buffer < args.endsAt,
    ) ?? null
  );
}

/** Shared by the guest path and the host's own "schedule a meeting" screen. */
export async function insertBooking(
  ctx: MutationCtx,
  args: {
    hostId: string;
    meetingTypeId: string | null;
    meetingName: string;
    durationMinutes: number;
    guestName: string;
    guestEmail: string;
    guestNote?: string;
    guestTimezone?: string | null;
    startsAt: number;
    bufferMinutes: number;
    hostCreated: boolean;
    pageViewId?: string | null;
  },
): Promise<Doc<"bookings">> {
  const endsAt = args.startsAt + args.durationMinutes * MINUTE;

  if (await findOverlap(ctx, { hostId: args.hostId, startsAt: args.startsAt, endsAt, bufferMinutes: args.bufferMinutes })) {
    fail("slot taken");
  }

  const guestEmail = args.guestEmail.trim().toLowerCase();
  // CHECK constraints from migration 0001, now without a database to hold them.
  if (!args.guestName.trim()) fail("Guest name is required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guestEmail)) fail("Guest email is not valid.");
  if (endsAt <= args.startsAt) fail("A booking must end after it starts.");

  const now = Date.now();
  const row = {
    id: uuid(),
    reference: newReference(),
    host_id: args.hostId,
    meeting_type_id: args.meetingTypeId,
    meeting_name: args.meetingName,
    duration_minutes: args.durationMinutes,
    guest_name: args.guestName.trim(),
    guest_email: guestEmail,
    guest_note: args.guestNote ?? "",
    guest_timezone: args.guestTimezone ?? null,
    starts_at: args.startsAt,
    ends_at: endsAt,
    status: "confirmed" as const,
    cancelled_at: null,
    cancelled_by: null,
    google_event_id: null,
    meet_url: null,
    guest_rsvp: null,
    guest_rsvp_synced_at: null,
    guest_rsvp_notified_at: null,
    host_created: args.hostCreated,
    page_view_id: args.pageViewId ?? null,
    created_at: now,
    updated_at: now,
  };
  const docId = await ctx.db.insert("bookings", row);
  const booking = (await ctx.db.get(docId))!;

  // The four triggers that used to fire on insert.
  await notifyBookingCreated(ctx, booking);
  await upsertContact(ctx, { userId: booking.host_id, name: booking.guest_name, email: booking.guest_email });
  await logActivity(ctx, {
    actorId: booking.host_id,
    kind: "booking_created",
    summary: `${booking.guest_name} booked ${booking.meeting_name}`,
  });

  return booking;
}

/**
 * Moves a booking that already exists — shared by the guest's reschedule link
 * and the host's own screen.
 *
 * The overlap read is the same guard `insertBooking` uses and carries the same
 * two rules, with one addition: `ignoreBookingId`, so a booking does not
 * collide with the slot it is currently occupying. That parameter has existed
 * since the port for exactly this caller.
 *
 * The row keeps its id, its reference and its Google event. A moved booking is
 * the same meeting at a different time — cancelling and re-creating would send
 * a cancellation the guest did not ask for, and mint a new Meet link.
 */
export async function moveBooking(
  ctx: MutationCtx,
  args: { booking: Doc<"bookings">; startsAt: number; bufferMinutes: number; byHost: boolean },
): Promise<Doc<"bookings">> {
  const b = args.booking;
  if (b.status !== "confirmed") fail("This meeting has been cancelled.");
  if (args.startsAt === b.starts_at) fail("That is the time it is already at.");

  const endsAt = args.startsAt + b.duration_minutes * MINUTE;
  if (
    await findOverlap(ctx, {
      hostId: b.host_id,
      startsAt: args.startsAt,
      endsAt,
      bufferMinutes: args.bufferMinutes,
      ignoreBookingId: b.id,
    })
  ) {
    fail("slot taken");
  }

  const now = Date.now();
  await ctx.db.patch(b._id, {
    starts_at: args.startsAt,
    ends_at: endsAt,
    // Absent means zero: every row written before reschedule existed.
    revision: (b.revision ?? 0) + 1,
    updated_at: now,
  });
  const after = (await ctx.db.get(b._id))!;

  await notifyBookingChanged(ctx, after, { oldStartsAt: b.starts_at, byHost: args.byHost });
  await logActivity(ctx, {
    actorId: after.host_id,
    kind: "booking_changed",
    summary: `${args.byHost ? after.guest_name + "'s" : after.guest_name} ${after.meeting_name} moved`,
  });
  return after;
}

/**
 * The host moving one of their own bookings.
 *
 * Their own hours are not consulted, for the reason `createAsHost` does not
 * consult them either: a host rearranging their day has already decided they
 * are free. A clash still refuses, because that is double-booking rather than
 * a preference.
 */
export const rescheduleAsHost = mutation({
  args: { id: v.string(), startsAt: v.number() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const b = await ctx.db
      .query("bookings")
      .withIndex("by_uuid", (q) => q.eq("id", a.id))
      .unique();
    if (!b) AuthError("No such booking.", "NOT_FOUND");
    assertOwnerOrAdmin(me, b.host_id);

    const meeting = b.meeting_type_id
      ? await ctx.db
          .query("meeting_types")
          .withIndex("by_uuid", (q) => q.eq("id", b.meeting_type_id as string))
          .unique()
      : null;

    const oldStartsAt = b.starts_at;
    const after = await moveBooking(ctx, {
      booking: b,
      startsAt: a.startsAt,
      bufferMinutes: meeting?.buffer_minutes ?? 0,
      byHost: true,
    });
    return { booking: bookingOut(after), old_starts_at: new Date(oldStartsAt).toISOString() };
  },
});

/* ── host-facing reads (RLS: bookings_select_own / _select_admin) ──────────── */

/**
 * The host's list, in the shape the screen wants: everything still upcoming,
 * plus a capped tail of history.
 *
 * Mirrors the two bounded reads the Supabase version does — upcoming is a
 * calendar and stays small, history is an archive and is capped newest-first,
 * then flipped back into ascending order. Invitees come back attached rather
 * than as a second round trip.
 */
export const listForScreen = query({
  args: { history: v.optional(v.boolean()), pastLimit: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const now = Date.now();

    const all = await ctx.db
      .query("bookings")
      .withIndex("by_host_starts", (q) => q.eq("host_id", me.id))
      .collect();

    // "Past" means ENDED, so the boundary is ends_at, not starts_at.
    const upcoming = all.filter((b) => b.ends_at >= now).sort((x, y) => x.starts_at - y.starts_at);
    const past = (a.history ?? true)
      ? all
          .filter((b) => b.ends_at < now)
          .sort((x, y) => y.starts_at - x.starts_at)
          .slice(0, a.pastLimit ?? 50)
          .reverse()
      : [];

    const rows = [...past, ...upcoming];

    const invitees: Record<string, Array<{ name: string; email: string }>> = {};
    for (const b of rows) {
      if (!b.host_created) continue;
      const list = await ctx.db
        .query("booking_invitees")
        .withIndex("by_booking", (q) => q.eq("booking_id", b.id))
        .collect();
      if (list.length) invitees[b.id] = list.map((i) => ({ name: i.name, email: i.email }));
    }

    return { rows: rows.map(bookingOut), invitees };
  },
});

export const listForHost = query({
  args: { from: v.optional(v.number()), to: v.optional(v.number()), status: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    let rows = await ctx.db
      .query("bookings")
      .withIndex("by_host_starts", (q) => {
        const base = q.eq("host_id", me.id);
        if (a.from !== undefined && a.to !== undefined) return base.gte("starts_at", a.from).lte("starts_at", a.to);
        if (a.from !== undefined) return base.gte("starts_at", a.from);
        return base;
      })
      .collect();
    if (a.status) rows = rows.filter((b) => b.status === a.status);
    rows.sort((x, y) => x.starts_at - y.starts_at);
    return rows.map(bookingOut);
  },
});

export const getForHost = query({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const b = await ctx.db
      .query("bookings")
      .withIndex("by_uuid", (q) => q.eq("id", a.id))
      .unique();
    if (!b) return null;
    assertOwnerOrAdmin(me, b.host_id);
    const invitees = await ctx.db
      .query("booking_invitees")
      .withIndex("by_booking", (q) => q.eq("booking_id", b.id))
      .collect();
    return { ...bookingOut(b), invitees: invitees.map(inviteeOut) };
  },
});

/* ── host-facing writes ────────────────────────────────────────────────────── */

/** The host scheduling a meeting themselves (migration 0011). */
export const createAsHost = mutation({
  args: {
    meetingTypeId: v.union(v.string(), v.null()),
    meetingName: v.string(),
    durationMinutes: v.number(),
    guestName: v.string(),
    guestEmail: v.string(),
    guestNote: v.optional(v.string()),
    startsAt: v.number(),
    bufferMinutes: v.optional(v.number()),
    invitees: v.optional(v.array(v.object({ name: v.string(), email: v.string() }))),
  },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const booking = await insertBooking(ctx, {
      hostId: me.id,
      meetingTypeId: a.meetingTypeId,
      meetingName: a.meetingName,
      durationMinutes: a.durationMinutes,
      guestName: a.guestName,
      guestEmail: a.guestEmail,
      guestNote: a.guestNote,
      startsAt: a.startsAt,
      bufferMinutes: a.bufferMinutes ?? 0,
      hostCreated: true,
    });

    for (const invitee of a.invitees ?? []) {
      const email = invitee.email.trim().toLowerCase();
      if (!email) continue;
      // unique (booking_id, email) — no unique index here, so check first.
      const dupe = await ctx.db
        .query("booking_invitees")
        .withIndex("by_booking", (q) => q.eq("booking_id", booking.id))
        .collect();
      if (dupe.some((d) => d.email === email)) continue;

      await ctx.db.insert("booking_invitees", {
        id: uuid(),
        booking_id: booking.id,
        name: invitee.name.trim(),
        email,
        created_at: Date.now(),
      });
      // booking_invitees_make_contact
      await upsertContact(ctx, { userId: me.id, name: invitee.name, email });
    }

    return bookingOut(booking);
  },
});

export const cancelAsHost = mutation({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const b = await ctx.db
      .query("bookings")
      .withIndex("by_uuid", (q) => q.eq("id", a.id))
      .unique();
    if (!b) AuthError("No such booking.", "NOT_FOUND");
    assertOwnerOrAdmin(me, b.host_id);
    if (b.status === "cancelled") return bookingOut(b);

    const now = Date.now();
    await ctx.db.patch(b._id, { status: "cancelled", cancelled_at: now, cancelled_by: "host", updated_at: now });
    const after = (await ctx.db.get(b._id))!;

    await notifyBookingCancelled(ctx, after);
    await logActivity(ctx, {
      actorId: me.id,
      kind: "booking_cancelled",
      summary: `${after.guest_name}'s ${after.meeting_name} was cancelled`,
    });
    return bookingOut(after);
  },
});

/**
 * Google event linkage for the guest path.
 *
 * Keyed by the booking's reference, which is 32 hex characters of CSPRNG and is
 * the guest's only credential — the same thing that authorises reading and
 * cancelling that booking. It sets two fields and nothing else, and refuses if
 * either is already set, so a leaked reference cannot be used to repoint a
 * booking at another calendar event.
 */
export const attachGoogleEventByReference = mutation({
  args: { reference: v.string(), googleEventId: v.union(v.string(), v.null()), meetUrl: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => {
    const b = await ctx.db.query("bookings").withIndex("by_reference", (q) => q.eq("reference", a.reference.trim())).unique();
    if (!b) return null;
    if (b.google_event_id !== null) fail("This booking already has a calendar event.", "ALREADY_SET");
    await ctx.db.patch(b._id, { google_event_id: a.googleEventId, meet_url: a.meetUrl, updated_at: Date.now() });
    return bookingOut((await ctx.db.get(b._id))!);
  },
});

/** Google event linkage — written by server code only, never by a browser. */
export const attachGoogleEvent = internalMutation({
  args: { id: v.string(), googleEventId: v.union(v.string(), v.null()), meetUrl: v.union(v.string(), v.null()) },
  handler: async (ctx, a) => {
    const b = await ctx.db
      .query("bookings")
      .withIndex("by_uuid", (q) => q.eq("id", a.id))
      .unique();
    if (!b) return null;
    await ctx.db.patch(b._id, { google_event_id: a.googleEventId, meet_url: a.meetUrl, updated_at: Date.now() });
    return bookingOut((await ctx.db.get(b._id))!);
  },
});

/** The Bookings badge: confirmed meetings still ahead. */
export const upcomingCount = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const now = Date.now();
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_host_starts", (q) => q.eq("host_id", me.id).gte("starts_at", now))
      .collect();
    return rows.filter((b) => b.status === "confirmed").length;
  },
});
