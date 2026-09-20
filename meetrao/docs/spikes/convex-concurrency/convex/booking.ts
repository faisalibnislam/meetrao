import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * The Convex equivalent of public.create_booking's overlap guard.
 *
 * Postgres enforces this with an EXCLUDE USING gist constraint. Here the same
 * rule is a read followed by an insert inside one mutation. Convex mutations
 * are serializable, so the read set (the index range below) is validated at
 * commit: a concurrent insert landing in that range forces one of the two
 * transactions to retry, re-read, and see the row it missed.
 *
 * The index range is deliberately NARROW — a real implementation would not
 * scan the whole table, and a narrow read set is the harder case for OCC.
 */
const MINUTE = 60_000;
const LOOKBACK = 24 * 60 * MINUTE;

export const createBooking = mutation({
  args: {
    hostId: v.string(),
    startsAt: v.number(),
    durationMinutes: v.number(),
    bufferMinutes: v.number(),
    guestEmail: v.string(),
  },
  handler: async (ctx, a) => {
    const endsAt = a.startsAt + a.durationMinutes * MINUTE;
    const buffer = a.bufferMinutes * MINUTE;

    const near = await ctx.db
      .query("bookings")
      .withIndex("by_host_starts", (q) =>
        q.eq("hostId", a.hostId).gte("startsAt", a.startsAt - LOOKBACK).lte("startsAt", endsAt + buffer),
      )
      .collect();

    // Mirrors: b.ends_at + buffer > starts AND b.starts_at - buffer < ends
    const clash = near.find(
      (b) => b.status === "confirmed" && b.endsAt + buffer > a.startsAt && b.startsAt - buffer < endsAt,
    );
    if (clash) throw new Error("slot taken");

    const reference = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
    const id = await ctx.db.insert("bookings", {
      hostId: a.hostId,
      startsAt: a.startsAt,
      endsAt,
      status: "confirmed",
      guestEmail: a.guestEmail,
      reference,
    });
    return { id, reference, startsAt: a.startsAt, endsAt };
  },
});

export const confirmedFor = query({
  args: { hostId: v.string() },
  handler: async (ctx, a) =>
    (await ctx.db.query("bookings").withIndex("by_host_starts", (q) => q.eq("hostId", a.hostId)).collect())
      .filter((b) => b.status === "confirmed")
      .map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt, guestEmail: b.guestEmail })),
});

export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    for (const b of await ctx.db.query("bookings").collect()) await ctx.db.delete(b._id);
  },
});
