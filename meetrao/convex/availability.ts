import { query, mutation } from "./_generated/server";
import { fail } from "./lib/errors";
import { v } from "convex/values";
import { requireProfile, assertOwnerOrAdmin, AuthError } from "./lib/auth";
import { scheduleOut, ruleOut } from "./lib/serialize";
import { uuid } from "./lib/ids";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

/* Mon 09:00–12:00 + 14:00–17:00 · Tue–Thu 09:00–17:00 · Fri 09:00–15:00 */
const DEFAULT_RULES: Array<[number, number, number]> = [
  [1, 540, 720], [1, 840, 1020], [2, 540, 1020], [3, 540, 1020], [4, 540, 1020], [5, 540, 900],
];

/** public.default_schedule_id(user). */
export async function defaultScheduleFor(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<Doc<"availability_schedules"> | null> {
  const all = await ctx.db.query("availability_schedules").withIndex("by_user", (q) => q.eq("user_id", userId)).collect();
  return all.find((s) => s.is_default) ?? all[0] ?? null;
}

/** The rules a given meeting books against — its schedule, or the default. */
/** The schedule a meeting follows, resolved the one way — its own, or the
 *  host's default. Shared by the rules and the overrides resolvers so the two
 *  can never disagree about which schedule a booking is being checked against. */
async function scheduleForMeeting(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  scheduleId: string | null,
): Promise<Doc<"availability_schedules"> | null> {
  return scheduleId
    ? ((await ctx.db.query("availability_schedules").withIndex("by_uuid", (q) => q.eq("id", scheduleId)).unique()) ??
        null)
    : await defaultScheduleFor(ctx, userId);
}

/** The days that do not follow the weekly pattern, from today onwards.
 *
 *  Past overrides are not returned: nothing can be booked in the past, and a
 *  host who took last Christmas off should not carry that list forever. */
export async function overridesForMeeting(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  scheduleId: string | null,
  fromDate: string,
): Promise<Array<Doc<"availability_overrides">>> {
  const schedule = await scheduleForMeeting(ctx, userId, scheduleId);
  if (!schedule) return [];
  const all = await ctx.db
    .query("availability_overrides")
    .withIndex("by_schedule", (q) => q.eq("schedule_id", schedule.id))
    .collect();
  return all.filter((o) => o.date >= fromDate).sort((a, b) => a.date.localeCompare(b.date));
}

export async function rulesForMeeting(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  scheduleId: string | null,
): Promise<Array<Doc<"availability_rules">>> {
  const schedule = scheduleId
    ? await ctx.db.query("availability_schedules").withIndex("by_uuid", (q) => q.eq("id", scheduleId)).unique()
    : await defaultScheduleFor(ctx, userId);
  if (!schedule) return [];
  return await ctx.db.query("availability_rules").withIndex("by_schedule", (q) => q.eq("schedule_id", schedule.id)).collect();
}

/** public.seed_default_availability — idempotent, as the SQL was. */
export async function seedDefaults(ctx: MutationCtx, userId: string): Promise<void> {
  const existing = await ctx.db.query("availability_schedules").withIndex("by_user", (q) => q.eq("user_id", userId)).first();
  if (existing) return;

  const now = Date.now();
  const scheduleId = uuid();
  await ctx.db.insert("availability_schedules", {
    id: scheduleId, user_id: userId, name: "Working hours", is_default: true, created_at: now, updated_at: now,
  });
  for (const [weekday, start, end] of DEFAULT_RULES) {
    await ctx.db.insert("availability_rules", {
      id: uuid(), user_id: userId, schedule_id: scheduleId, weekday, start_minute: start, end_minute: end, created_at: now,
    });
  }
}

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    await seedDefaults(ctx, me.id);
    return true;
  },
});

export const listSchedules = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const owner = a.userId ?? me.id;
    assertOwnerOrAdmin(me, owner);
    const rows = await ctx.db.query("availability_schedules").withIndex("by_user", (q) => q.eq("user_id", owner)).collect();
    rows.sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.created_at - b.created_at);
    return rows.map(scheduleOut);
  },
});

export const listRules = query({
  args: { scheduleId: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const schedule = a.scheduleId
      ? await ctx.db.query("availability_schedules").withIndex("by_uuid", (q) => q.eq("id", a.scheduleId!)).unique()
      : await defaultScheduleFor(ctx, me.id);
    if (!schedule) return [];
    assertOwnerOrAdmin(me, schedule.user_id);
    const rows = await ctx.db.query("availability_rules").withIndex("by_schedule", (q) => q.eq("schedule_id", schedule.id)).collect();
    rows.sort((x, y) => x.weekday - y.weekday || x.start_minute - y.start_minute);
    return rows.map(ruleOut);
  },
});

export const createSchedule = mutation({
  args: { name: v.string(), makeDefault: v.optional(v.boolean()), copyFrom: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const name = a.name.trim();
    if (!name) fail("Give the schedule a name.");
    if (name.length > 60) fail("Keep the name under 60 characters.");

    const mine = await ctx.db.query("availability_schedules").withIndex("by_user", (q) => q.eq("user_id", me.id)).collect();
    // unique (user_id, name) — Postgres index, re-enforced here.
    if (mine.some((s) => s.name.toLowerCase() === name.toLowerCase())) fail("You already have a schedule with that name.");

    const makeDefault = a.makeDefault ?? mine.length === 0;
    // Partial unique index "one default per user": clear the old one first.
    if (makeDefault) for (const s of mine) if (s.is_default) await ctx.db.patch(s._id, { is_default: false, updated_at: Date.now() });

    const now = Date.now();
    const id = uuid();
    await ctx.db.insert("availability_schedules", { id, user_id: me.id, name, is_default: makeDefault, created_at: now, updated_at: now });

    // A schedule is never born empty: copy the source when duplicating,
    // otherwise seed the ordinary working week.
    let seed: Array<{ weekday: number; start_minute: number; end_minute: number }>;
    if (a.copyFrom) {
      const source = await ctx.db.query("availability_schedules").withIndex("by_uuid", (q) => q.eq("id", a.copyFrom!)).unique();
      if (source) assertOwnerOrAdmin(me, source.user_id);
      seed = source
        ? (await ctx.db.query("availability_rules").withIndex("by_schedule", (q) => q.eq("schedule_id", source.id)).collect())
            .map((r) => ({ weekday: r.weekday, start_minute: r.start_minute, end_minute: r.end_minute }))
        : [];
    } else {
      seed = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_minute: 540, end_minute: 1020 }));
    }
    for (const r of seed) {
      await ctx.db.insert("availability_rules", { id: uuid(), user_id: me.id, schedule_id: id, ...r, created_at: now });
    }

    return scheduleOut((await ctx.db.query("availability_schedules").withIndex("by_uuid", (q) => q.eq("id", id)).unique())!);
  },
});

export const setDefaultSchedule = mutation({
  args: { scheduleId: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const target = await ctx.db.query("availability_schedules").withIndex("by_uuid", (q) => q.eq("id", a.scheduleId)).unique();
    if (!target) AuthError("No such schedule.", "NOT_FOUND");
    assertOwnerOrAdmin(me, target.user_id);

    const mine = await ctx.db.query("availability_schedules").withIndex("by_user", (q) => q.eq("user_id", target.user_id)).collect();
    for (const s of mine) if (s.is_default && s.id !== target.id) await ctx.db.patch(s._id, { is_default: false, updated_at: Date.now() });
    await ctx.db.patch(target._id, { is_default: true, updated_at: Date.now() });
    return true;
  },
});

export const deleteSchedule = mutation({
  args: { scheduleId: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const target = await ctx.db.query("availability_schedules").withIndex("by_uuid", (q) => q.eq("id", a.scheduleId)).unique();
    if (!target) return false;
    assertOwnerOrAdmin(me, target.user_id);

    const mine = await ctx.db.query("availability_schedules").withIndex("by_user", (q) => q.eq("user_id", target.user_id)).collect();
    if (mine.length <= 1) fail("This is your only schedule — keep at least one.");
    // The app refuses this case before calling; refusing it here too means a
    // direct call cannot leave a host whose meetings point at a default that
    // no longer exists.
    if (target.is_default) fail("Make another schedule the default first.");

    // Postgres: availability_rules.schedule_id ON DELETE CASCADE, and
    // meeting_types.schedule_id ON DELETE SET NULL — "point them back at the
    // default rather than orphaning them" (migration 0010). Both are explicit.
    const rules = await ctx.db.query("availability_rules").withIndex("by_schedule", (q) => q.eq("schedule_id", target.id)).collect();
    for (const r of rules) await ctx.db.delete(r._id);

    const meetings = await ctx.db.query("meeting_types").withIndex("by_user", (q) => q.eq("user_id", target.user_id)).collect();
    for (const m of meetings) if (m.schedule_id === target.id) await ctx.db.patch(m._id, { schedule_id: null, updated_at: Date.now() });

    await ctx.db.delete(target._id);
    return true;
  },
});

/** Replaces a schedule's whole week in one transaction, as the UI submits it. */
export const replaceRules = mutation({
  args: {
    scheduleId: v.string(),
    rules: v.array(v.object({ weekday: v.number(), start_minute: v.number(), end_minute: v.number() })),
  },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const schedule = await ctx.db.query("availability_schedules").withIndex("by_uuid", (q) => q.eq("id", a.scheduleId)).unique();
    if (!schedule) AuthError("No such schedule.", "NOT_FOUND");
    assertOwnerOrAdmin(me, schedule.user_id);

    for (const r of a.rules) {
      if (r.weekday < 0 || r.weekday > 6) fail("Weekday must be 0–6.");
      if (r.start_minute < 0 || r.start_minute > 1440 || r.end_minute < 0 || r.end_minute > 1440)
        fail("Times must fall inside the day.");
      if (r.end_minute <= r.start_minute) fail("A range must end after it starts.");
    }

    const old = await ctx.db.query("availability_rules").withIndex("by_schedule", (q) => q.eq("schedule_id", schedule.id)).collect();
    for (const r of old) await ctx.db.delete(r._id);

    const now = Date.now();
    for (const r of a.rules) {
      await ctx.db.insert("availability_rules", {
        id: uuid(), user_id: schedule.user_id, schedule_id: schedule.id,
        weekday: r.weekday, start_minute: r.start_minute, end_minute: r.end_minute, created_at: now,
      });
    }
    return a.rules.length;
  },
});

export const renameSchedule = mutation({
  args: { scheduleId: v.string(), name: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const target = await ctx.db.query("availability_schedules").withIndex("by_uuid", (q) => q.eq("id", a.scheduleId)).unique();
    if (!target) AuthError("No such schedule.", "NOT_FOUND");
    assertOwnerOrAdmin(me, target.user_id);

    const name = a.name.trim();
    if (!name) fail("Give the schedule a name.");
    if (name.length > 60) fail("Keep the name under 60 characters.");

    const mine = await ctx.db.query("availability_schedules").withIndex("by_user", (q) => q.eq("user_id", target.user_id)).collect();
    if (mine.some((sch) => sch.id !== target.id && sch.name.toLowerCase() === name.toLowerCase())) {
      fail("You already have a schedule with that name.");
    }

    await ctx.db.patch(target._id, { name, updated_at: Date.now() });
    return scheduleOut((await ctx.db.get(target._id))!);
  },
});

/**
 * The availability screen's save: the host's timezone and one schedule's whole
 * week, together.
 *
 * Supabase did this as three statements — update the profile, delete the rules,
 * insert the new ones — with no transaction around them, so a failure between
 * the delete and the insert left a host with no hours at all. Here it is one
 * mutation, so it either all lands or none of it does.
 */
export const saveWeek = mutation({
  args: {
    scheduleId: v.string(),
    timezone: v.string(),
    rules: v.array(v.object({ weekday: v.number(), start_minute: v.number(), end_minute: v.number() })),
  },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const schedule = await ctx.db.query("availability_schedules").withIndex("by_uuid", (q) => q.eq("id", a.scheduleId)).unique();
    if (!schedule) fail("That schedule is gone. Reload the page.");
    assertOwnerOrAdmin(me, schedule.user_id);

    for (const r of a.rules) {
      if (r.weekday < 0 || r.weekday > 6) fail("Weekday must be 0–6.");
      if (r.start_minute < 0 || r.start_minute > 1440 || r.end_minute < 0 || r.end_minute > 1440)
        fail("Times must fall inside the day.");
      if (r.end_minute <= r.start_minute) fail("A range must end after it starts.");
    }

    // Chosen, not detected — registration must never overwrite it.
    await ctx.db.patch(me._id, { timezone: a.timezone, timezone_auto: false, updated_at: Date.now() });

    const old = await ctx.db.query("availability_rules").withIndex("by_schedule", (q) => q.eq("schedule_id", schedule.id)).collect();
    for (const r of old) await ctx.db.delete(r._id);

    const now = Date.now();
    for (const r of a.rules) {
      await ctx.db.insert("availability_rules", {
        id: uuid(), user_id: schedule.user_id, schedule_id: schedule.id,
        weekday: r.weekday, start_minute: r.start_minute, end_minute: r.end_minute, created_at: now,
      });
    }
    return a.rules.length;
  },
});

/**
 * Everything the availability screen needs, in one round trip: the host's
 * schedules, EVERY rule across them, and which meeting points at which
 * schedule.
 *
 * `listRules` answers for one schedule; this screen draws them all side by
 * side, so asking per schedule would be a query per row.
 */
/* ── time off ─────────────────────────────────────────────────────────────── */

/** "2026-12-25", and a real day: "2026-02-31" parses and is not one. */
function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

/**
 * Closes a day, or gives it different hours.
 *
 * One row per (schedule, date): saving the same day twice replaces it rather
 * than stacking two answers for one date, which the engine would have to pick
 * between. Convex has no unique index, so the read-then-write is the rule —
 * safe because the mutation is serializable.
 *
 * EXISTING BOOKINGS ARE NOT TOUCHED. Taking a Friday off closes it to new
 * bookings; the meeting already in the diary stays, and the host cancels or
 * moves it themselves. Deleting someone else's confirmed meeting as a side
 * effect of editing a calendar is not something a screen should do quietly.
 */
export const saveOverride = mutation({
  args: {
    scheduleId: v.string(),
    date: v.string(),
    ranges: v.array(v.object({ start_minute: v.number(), end_minute: v.number() })),
    note: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const schedule = await ctx.db
      .query("availability_schedules").withIndex("by_uuid", (q) => q.eq("id", a.scheduleId)).unique();
    if (!schedule) fail("That schedule is gone. Reload the page.");
    assertOwnerOrAdmin(me, schedule.user_id);

    if (!validDate(a.date)) fail("That is not a date.");

    const ranges = [...a.ranges].sort((x, y) => x.start_minute - y.start_minute);
    for (const r of ranges) {
      if (r.start_minute < 0 || r.start_minute > 1440 || r.end_minute < 0 || r.end_minute > 1440)
        fail("Times must fall inside the day.");
      if (r.end_minute <= r.start_minute) fail("A range must end after it starts.");
    }
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i].start_minute < ranges[i - 1].end_minute) fail("Two ranges on that day overlap.");
    }

    const existing = await ctx.db
      .query("availability_overrides")
      .withIndex("by_schedule_date", (q) => q.eq("schedule_id", schedule.id).eq("date", a.date))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ranges, note: a.note ?? existing.note });
      return existing.id;
    }

    const id = uuid();
    await ctx.db.insert("availability_overrides", {
      id,
      user_id: schedule.user_id,
      schedule_id: schedule.id,
      date: a.date,
      ranges,
      note: a.note ?? "",
      created_at: Date.now(),
    });
    return id;
  },
});

/** Puts a day back on the weekly pattern. */
export const deleteOverride = mutation({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const row = await ctx.db
      .query("availability_overrides").withIndex("by_uuid", (q) => q.eq("id", a.id)).unique();
    if (!row) return false;
    assertOwnerOrAdmin(me, row.user_id);
    await ctx.db.delete(row._id);
    return true;
  },
});

export const screen = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);

    const schedules = await ctx.db
      .query("availability_schedules").withIndex("by_user", (q) => q.eq("user_id", me.id)).collect();
    schedules.sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.created_at - b.created_at);

    const rules = await ctx.db
      .query("availability_rules").withIndex("by_user", (q) => q.eq("user_id", me.id)).collect();

    const meetings = await ctx.db
      .query("meeting_types").withIndex("by_user", (q) => q.eq("user_id", me.id)).collect();
    meetings.sort((a, b) => a.created_at - b.created_at);

    /* Today onwards, in the host's own zone: a list of days already past is
       not time off, it is history, and the screen has nothing to do with it. */
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: me.timezone || "UTC", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());

    const overrides = (
      await ctx.db.query("availability_overrides").withIndex("by_user", (q) => q.eq("user_id", me.id)).collect()
    )
      .filter((o) => o.date >= today)
      .sort((x, y) => x.date.localeCompare(y.date));

    return {
      schedules: schedules.map((s) => ({
        id: s.id, name: s.name, is_default: s.is_default, created_at: new Date(s.created_at).toISOString(),
      })),
      rules: rules.map((r) => ({
        schedule_id: r.schedule_id, weekday: r.weekday, start_minute: r.start_minute, end_minute: r.end_minute,
      })),
      meetings: meetings.map((m) => ({ name: m.name, schedule_id: m.schedule_id })),
      overrides: overrides.map((o) => ({
        id: o.id, schedule_id: o.schedule_id, date: o.date, ranges: o.ranges, note: o.note,
      })),
    };
  },
});
