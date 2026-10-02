import { query, mutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

/* ─────────────────────────────────────────────────────────────────────────────
   The read-only API's own doors.

   These are `query` and `mutation` rather than internal functions because the
   caller is a Next route handler holding an API key, not a signed-in session.
   There is no identity for Convex to check, and the key itself is the
   credential.

   Each one takes a HASH, never a key, and answers only for the account that
   hash belongs to. A hash is not a bearer credential: it cannot be replayed
   against Google, against a session, or against anything but this function,
   and it is what the database already holds.
   ───────────────────────────────────────────────────────────────────────────── */

async function ownerOf(ctx: QueryCtx | MutationCtx, hash: string) {
  const row = await ctx.db.query("api_keys").withIndex("by_hash", (q) => q.eq("hash", hash)).unique();
  if (!row || row.revoked_at !== null) return null;
  const profile = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", row.user_id)).unique();
  if (!profile || profile.is_suspended) return null;
  return { keyId: row.id, userId: row.user_id };
}

export const resolveKey = query({
  args: { hash: v.string() },
  handler: async (ctx, a) => await ownerOf(ctx, a.hash),
});

export const touchKey = mutation({
  args: { hash: v.string() },
  handler: async (ctx, a) => {
    const row = await ctx.db.query("api_keys").withIndex("by_hash", (q) => q.eq("hash", a.hash)).unique();
    if (!row || row.revoked_at !== null) return false;
    await ctx.db.patch(row._id, { last_used_at: Date.now() });
    return true;
  },
});

export const bookings = query({
  args: { hash: v.string(), from: v.optional(v.number()), to: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const owner = await ownerOf(ctx, a.hash);
    if (!owner) return null;

    const from = a.from ?? Date.now() - 30 * 24 * 60 * 60_000;
    const to = a.to ?? from + 90 * 24 * 60 * 60_000;
    const limit = Math.min(Math.max(a.limit ?? 100, 1), 200);

    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_host_starts", (q) => q.eq("host_id", owner.userId).gte("starts_at", from).lte("starts_at", to))
      .take(limit);

    return rows.map((b) => ({
      id: b.id,
      reference: b.reference,
      meeting_name: b.meeting_name,
      duration_minutes: b.duration_minutes,
      starts_at: new Date(b.starts_at).toISOString(),
      ends_at: new Date(b.ends_at).toISOString(),
      status: b.status,
      guest_name: b.guest_name,
      guest_email: b.guest_email,
      guest_timezone: b.guest_timezone,
      location: b.location ?? "google_meet",
      location_detail: b.location_detail ?? "",
      meet_url: b.meet_url,
      answers: b.answers ?? [],
      guest_rsvp: b.guest_rsvp,
      created_at: new Date(b.created_at).toISOString(),
    }));
  },
});

export const meetings = query({
  args: { hash: v.string() },
  handler: async (ctx, a) => {
    const owner = await ownerOf(ctx, a.hash);
    if (!owner) return null;

    const rows = await ctx.db
      .query("meeting_types")
      .withIndex("by_user", (q) => q.eq("user_id", owner.userId))
      .collect();

    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      description: m.description,
      duration_minutes: m.duration_minutes,
      buffer_minutes: m.buffer_minutes,
      minimum_notice_minutes: m.minimum_notice_minutes,
      booking_window_days: m.booking_window_days,
      location: m.location,
      location_detail: m.location_detail ?? "",
      capacity: m.capacity ?? 1,
      is_active: m.is_active,
      team_id: m.team_id ?? null,
    }));
  },
});
