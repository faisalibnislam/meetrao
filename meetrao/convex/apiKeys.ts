import { action, mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { fail } from "./lib/errors";
import { requireProfile, AuthError, assertOwnerOrAdmin } from "./lib/auth";
import { uuid } from "./lib/ids";
import { hashApiKey, keyPrefix, newApiKey } from "./lib/apiAuth";
import { requirePro } from "./lib/plan";

/* ─────────────────────────────────────────────────────────────────────────────
   API keys: read-only, per host, hashed.

   WHAT A KEY CAN DO. Read that host's own bookings and meetings. Nothing
   writes — no creating, no cancelling, no moving. Every booking rule in this
   product is enforced at a door that assumes a guest is on the other side of
   it, and a write API would be a second door that has to enforce them all
   again. Read-only is a smaller promise that can actually be kept.

   The plaintext is shown once and stored as a SHA-256 hash. A leaked database
   should not be a leaked set of live credentials.
   ───────────────────────────────────────────────────────────────────────────── */

const MAX_KEYS = 10;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const rows = await ctx.db.query("api_keys").withIndex("by_user", (q) => q.eq("user_id", me.id)).collect();

    return rows
      .filter((k) => k.revoked_at === null)
      .sort((a, b) => b.created_at - a.created_at)
      .map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        created_at: new Date(k.created_at).toISOString(),
        last_used_at: k.last_used_at ? new Date(k.last_used_at).toISOString() : null,
      }));
  },
});

/** Writes the hash. Called only by `create`, which holds the plaintext. */
export const store = internalMutation({
  args: { userId: v.string(), name: v.string(), prefix: v.string(), hash: v.string() },
  handler: async (ctx, a) => {
    /* Checked here rather than in `create`, because this is where the row is
       written — a gate on the caller is a gate somebody can call around. */
    const owner = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.userId)).unique();
    if (!owner) fail("No such account.");
    requirePro(owner, "The API");

    const mine = await ctx.db.query("api_keys").withIndex("by_user", (q) => q.eq("user_id", a.userId)).collect();
    if (mine.filter((k) => k.revoked_at === null).length >= MAX_KEYS) {
      fail(`You can hold ${MAX_KEYS} keys at a time. Revoke one first.`);
    }

    const id = uuid();
    await ctx.db.insert("api_keys", {
      id,
      user_id: a.userId,
      name: a.name.trim().slice(0, 60) || "Untitled key",
      prefix: a.prefix,
      hash: a.hash,
      last_used_at: null,
      revoked_at: null,
      created_at: Date.now(),
    });
    return id;
  },
});

/**
 * Mints a key and returns it ONCE.
 *
 * An action rather than a mutation because hashing is async crypto, which a
 * Convex mutation cannot do — and because the plaintext must exist only in
 * this call's return value, never in a row.
 */
export const create = action({
  args: { name: v.string() },
  handler: async (ctx, a): Promise<{ id: string; key: string }> => {
    const userId = await ctx.runQuery(internal.apiKeys.callerId, {});
    if (!userId) throw new Error("Not signed in.");

    const key = newApiKey();
    const id: string = await ctx.runMutation(internal.apiKeys.store, {
      userId,
      name: a.name,
      prefix: keyPrefix(key),
      hash: await hashApiKey(key),
    });

    // The only time this value is ever returned. It is not stored.
    return { id, key };
  },
});

export const callerId = internalQuery({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    return me.id;
  },
});

export const revoke = mutation({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const row = await ctx.db.query("api_keys").withIndex("by_uuid", (q) => q.eq("id", a.id)).unique();
    if (!row) AuthError("No such key.", "NOT_FOUND");
    assertOwnerOrAdmin(me, row.user_id);

    /* Marked, not deleted: "when did that key stop working" is a question
       somebody asks during an incident, and a deleted row cannot answer it. */
    await ctx.db.patch(row._id, { revoked_at: Date.now() });
    return true;
  },
});

/**
 * Who a key belongs to, or null.
 *
 * Looked up by hash, so the plaintext is never compared against anything
 * stored. A revoked key resolves to nothing, which is what revoking means.
 */
export const resolve = internalQuery({
  args: { hash: v.string() },
  handler: async (ctx, a) => {
    const row = await ctx.db.query("api_keys").withIndex("by_hash", (q) => q.eq("hash", a.hash)).unique();
    if (!row || row.revoked_at !== null) return null;

    const profile = await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", row.user_id)).unique();
    if (!profile || profile.is_suspended) return null;
    return { keyId: row.id, userId: row.user_id };
  },
});

/** Records use, for the "last used" column and for spotting a stale key. */
export const touch = internalMutation({
  args: { keyId: v.string() },
  handler: async (ctx, a) => {
    const row = await ctx.db.query("api_keys").withIndex("by_uuid", (q) => q.eq("id", a.keyId)).unique();
    if (row) await ctx.db.patch(row._id, { last_used_at: Date.now() });
  },
});

/** What a key can read: this host's bookings, in a shape meant to be parsed. */
export const bookingsFor = internalQuery({
  args: { userId: v.string(), from: v.optional(v.number()), to: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const from = a.from ?? Date.now() - 30 * 24 * 60 * 60_000;
    const to = a.to ?? from + 90 * 24 * 60 * 60_000;
    const limit = Math.min(Math.max(a.limit ?? 100, 1), 200);

    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_host_starts", (q) => q.eq("host_id", a.userId).gte("starts_at", from).lte("starts_at", to))
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

export const meetingsFor = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, a) => {
    const rows = await ctx.db.query("meeting_types").withIndex("by_user", (q) => q.eq("user_id", a.userId)).collect();
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
