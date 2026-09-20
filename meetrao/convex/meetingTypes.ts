import { query, mutation } from "./_generated/server";
import { fail } from "./lib/errors";
import { v } from "convex/values";
import { requireProfile, assertOwnerOrAdmin, AuthError } from "./lib/auth";
import { meetingTypeOut } from "./lib/serialize";
import { uuid } from "./lib/ids";
import { logActivity } from "./lib/effects";

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

/** The CHECK constraints from migration 0001, which no longer have a database. */
function validate(a: { name: string; slug: string; duration_minutes: number; buffer_minutes: number; minimum_notice_minutes: number; booking_window_days: number }) {
  if (!a.name.trim()) fail("Give the meeting a name.");
  if (!SLUG.test(a.slug)) fail("The link is letters, numbers and hyphens.");
  if (a.duration_minutes < 5 || a.duration_minutes > 480) fail("Duration must be 5–480 minutes.");
  if (a.buffer_minutes < 0 || a.buffer_minutes > 120) fail("Buffer must be 0–120 minutes.");
  if (a.minimum_notice_minutes < 0) fail("Notice cannot be negative.");
  if (a.booking_window_days < 1 || a.booking_window_days > 365) fail("Window must be 1–365 days.");
}

export const listOwn = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    let rows = await ctx.db.query("meeting_types").withIndex("by_user", (q) => q.eq("user_id", me.id)).collect();
    if (a.activeOnly) rows = rows.filter((m) => m.is_active);
    rows.sort((x, y) => x.created_at - y.created_at);
    return rows.map(meetingTypeOut);
  },
});

export const getOwn = query({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const m = await ctx.db.query("meeting_types").withIndex("by_uuid", (q) => q.eq("id", a.id)).unique();
    if (!m) return null;
    assertOwnerOrAdmin(me, m.user_id);
    return meetingTypeOut(m);
  },
});

export const create = mutation({
  args: {
    name: v.string(), description: v.optional(v.string()), slug: v.string(),
    duration_minutes: v.number(), buffer_minutes: v.optional(v.number()),
    minimum_notice_minutes: v.optional(v.number()), booking_window_days: v.optional(v.number()),
    location: v.optional(v.string()), schedule_id: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const row = {
      name: a.name, slug: a.slug.trim().toLowerCase(),
      duration_minutes: a.duration_minutes, buffer_minutes: a.buffer_minutes ?? 0,
      minimum_notice_minutes: a.minimum_notice_minutes ?? 60, booking_window_days: a.booking_window_days ?? 30,
    };
    validate(row);

    // unique (user_id, slug) — Postgres had an index; this is the replacement.
    const clash = await ctx.db
      .query("meeting_types")
      .withIndex("by_user_slug", (q) => q.eq("user_id", me.id).eq("slug", row.slug))
      .first();
    if (clash) fail("You already have a meeting with that link.");

    const now = Date.now();
    const id = uuid();
    await ctx.db.insert("meeting_types", {
      id, user_id: me.id, description: a.description ?? "",
      location: a.location ?? "google_meet", is_active: true,
      schedule_id: a.schedule_id ?? null, created_at: now, updated_at: now, ...row,
    });
    // meeting_types_log_created
    await logActivity(ctx, { actorId: me.id, kind: "meeting_type_created", summary: `${me.full_name || me.email} created ${row.name}` });
    const created = await ctx.db.query("meeting_types").withIndex("by_uuid", (q) => q.eq("id", id)).unique();
    return meetingTypeOut(created!);
  },
});

export const update = mutation({
  args: {
    id: v.string(), name: v.optional(v.string()), description: v.optional(v.string()),
    slug: v.optional(v.string()), duration_minutes: v.optional(v.number()),
    buffer_minutes: v.optional(v.number()), minimum_notice_minutes: v.optional(v.number()),
    booking_window_days: v.optional(v.number()), location: v.optional(v.string()),
    is_active: v.optional(v.boolean()), schedule_id: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const m = await ctx.db.query("meeting_types").withIndex("by_uuid", (q) => q.eq("id", a.id)).unique();
    if (!m) AuthError("No such meeting.", "NOT_FOUND");
    assertOwnerOrAdmin(me, m.user_id);

    const { id: _id, ...rest } = a;
    void _id;
    const patch: Record<string, unknown> = { updated_at: Date.now() };
    for (const [k, val] of Object.entries(rest)) if (val !== undefined) patch[k] = val;
    if (typeof patch.slug === "string") patch.slug = patch.slug.trim().toLowerCase();

    const merged = { ...m, ...patch } as typeof m;
    validate(merged);

    if (patch.slug && patch.slug !== m.slug) {
      const clash = await ctx.db
        .query("meeting_types")
        .withIndex("by_user_slug", (q) => q.eq("user_id", m.user_id).eq("slug", patch.slug as string))
        .first();
      if (clash) fail("You already have a meeting with that link.");
    }

    await ctx.db.patch(m._id, patch);
    return meetingTypeOut((await ctx.db.get(m._id))!);
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const m = await ctx.db.query("meeting_types").withIndex("by_uuid", (q) => q.eq("id", a.id)).unique();
    if (!m) return false;
    assertOwnerOrAdmin(me, m.user_id);

    // Postgres: bookings.meeting_type_id ON DELETE SET NULL. Convex has no
    // cascades, so the fan-out is explicit.
    const affected = await ctx.db.query("bookings").withIndex("by_meeting_type", (q) => q.eq("meeting_type_id", m.id)).collect();
    for (const b of affected) await ctx.db.patch(b._id, { meeting_type_id: null, updated_at: Date.now() });

    await ctx.db.delete(m._id);
    return true;
  },
});
