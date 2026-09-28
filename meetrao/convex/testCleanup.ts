import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Removes bookings made by a verification script, and the rows their effects
 * created. Internal only — not reachable from any client.
 *
 * Kept in the repo because the alternative is a harness that leaves debris,
 * and a harness that leaves debris gets switched off.
 */
export const purgeByReferences = internalMutation({
  args: {
    references: v.array(v.string()),
    emailPrefix: v.string(),
    /** Substrings identifying activity rows the harness caused. */
    summaryContains: v.optional(v.array(v.string())),
  },
  handler: async (ctx, a) => {
    let bookings = 0, invitees = 0, notifications = 0, contacts = 0, activity = 0, limits = 0;

    for (const ref of a.references) {
      const b = await ctx.db.query("bookings").withIndex("by_reference", (q) => q.eq("reference", ref)).unique();
      if (!b) continue;

      for (const i of await ctx.db.query("booking_invitees").withIndex("by_booking", (q) => q.eq("booking_id", b.id)).collect()) {
        await ctx.db.delete(i._id); invitees++;
      }
      for (const n of await ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("user_id", b.host_id)).collect()) {
        if (n.booking_id === b.id) { await ctx.db.delete(n._id); notifications++; }
      }
      await ctx.db.delete(b._id); bookings++;
    }

    // Contacts and activity rows are keyed by the test email prefix rather than
    // the booking, because upsert_contact may have merged several into one.
    for (const c of await ctx.db.query("contacts").collect()) {
      if (c.email.startsWith(a.emailPrefix)) { await ctx.db.delete(c._id); contacts++; }
    }
    for (const act of await ctx.db.query("admin_activity").withIndex("by_created").order("desc").take(500)) {
      const needles = a.summaryContains ?? [];
      if (needles.some((n) => act.summary.includes(n))) { await ctx.db.delete(act._id); activity++; }
    }
    for (const r of await ctx.db.query("rate_limits").collect()) {
      if (r.key.includes(a.emailPrefix)) { await ctx.db.delete(r._id); limits++; }
    }

    return { bookings, invitees, notifications, contacts, activity, limits };
  },
});

/** Removes site_visits a verification script inserted, by visitor_hash. */
export const purgeVisits = internalMutation({
  args: { visitorHash: v.string() },
  handler: async (ctx, a) => {
    const rows = await ctx.db.query("site_visits").withIndex("by_hash", (q) => q.eq("visitor_hash", a.visitorHash)).collect();
    for (const r of rows) await ctx.db.delete(r._id);
    return rows.length;
  },
});

/**
 * Grants admin to an account, and holds a booking link back.
 *
 * The admin console cannot be exercised without an admin, and the held-links
 * panel cannot be exercised without a held link. Both are ordinary rows, and
 * creating them by hand in a dashboard is how a check stops being run.
 *
 * Internal only — not reachable from any client — and it names the account it
 * is acting on rather than promoting whoever happens to be first.
 */
export const seedAdminFixture = internalMutation({
  args: { email: v.string(), holdUsername: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const email = a.email.trim().toLowerCase();
    const user = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).unique();
    if (!user) return { promoted: false, held: null };

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_uuid", (q) => q.eq("id", user._id as unknown as string))
      .unique();
    if (!profile) return { promoted: false, held: null };

    await ctx.db.patch(profile._id, { is_admin: true, updated_at: Date.now() });

    let held: string | null = null;
    if (a.holdUsername) {
      const key = a.holdUsername.trim().toLowerCase();
      const already = await ctx.db
        .query("reserved_usernames")
        .withIndex("by_username", (q) => q.eq("username", key))
        .unique();
      if (!already) {
        await ctx.db.insert("reserved_usernames", {
          username: key,
          reason: "seeded by a check",
          reserved_at: Date.now(),
        });
      }
      held = key;
    }

    return { promoted: true, held, username: profile.username };
  },
});

/** Undoes seedAdminFixture. A check that leaves debris is one that gets switched off. */
export const purgeAdminFixture = internalMutation({
  args: { email: v.string(), heldUsernames: v.optional(v.array(v.string())) },
  handler: async (ctx, a) => {
    const email = a.email.trim().toLowerCase();
    let holds = 0;
    for (const name of a.heldUsernames ?? []) {
      const row = await ctx.db
        .query("reserved_usernames")
        .withIndex("by_username", (q) => q.eq("username", name.trim().toLowerCase()))
        .unique();
      if (row) {
        await ctx.db.delete(row._id);
        holds++;
      }
    }

    const user = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).unique();
    if (!user) return { holds, users: 0 };

    const owner = user._id as unknown as string;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_uuid", (q) => q.eq("id", owner))
      .unique();
    if (profile) await ctx.db.delete(profile._id);

    for (const act of await ctx.db.query("admin_activity").withIndex("by_created").order("desc").take(200)) {
      if (act.actor_id === owner) await ctx.db.delete(act._id);
    }
    for (const acc of await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", user._id))
      .collect()) {
      await ctx.db.delete(acc._id);
    }
    await ctx.db.delete(user._id);
    return { holds, users: 1, profile: profile ? 1 : 0 };
  },
});

/**
 * A day off on a named host's default schedule, and its removal.
 *
 * The booking page cannot be exercised for time off without a real override
 * on a real schedule, and creating one by hand in a dashboard is how a check
 * stops being run — the same reasoning as seedAdminFixture above.
 */
export const seedTimeOffFixture = internalMutation({
  args: { username: v.string(), date: v.string() },
  handler: async (ctx, a) => {
    const host = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("username_lower", a.username.trim().toLowerCase()))
      .unique();
    if (!host) return { ok: false as const, reason: "no such host" };

    const schedules = await ctx.db
      .query("availability_schedules").withIndex("by_user", (q) => q.eq("user_id", host.id)).collect();
    const schedule = schedules.find((s) => s.is_default) ?? schedules[0];
    if (!schedule) return { ok: false as const, reason: "host has no schedule" };

    const existing = await ctx.db
      .query("availability_overrides")
      .withIndex("by_schedule_date", (q) => q.eq("schedule_id", schedule.id).eq("date", a.date))
      .unique();
    if (existing) return { ok: true as const, id: existing.id, scheduleId: schedule.id, reused: true };

    const id = crypto.randomUUID();
    await ctx.db.insert("availability_overrides", {
      id,
      user_id: host.id,
      schedule_id: schedule.id,
      date: a.date,
      ranges: [],
      note: "verification fixture",
      created_at: Date.now(),
    });
    return { ok: true as const, id, scheduleId: schedule.id, reused: false };
  },
});

export const purgeTimeOffFixture = internalMutation({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const row = await ctx.db
      .query("availability_overrides").withIndex("by_uuid", (q) => q.eq("id", a.id)).unique();
    if (!row) return false;
    await ctx.db.delete(row._id);
    return true;
  },
});

/** Puts questions on a named meeting, and takes them off again. The booking
 *  form cannot be exercised for questions without a meeting that asks some. */
export const seedQuestionsFixture = internalMutation({
  args: {
    username: v.string(),
    slug: v.string(),
    questions: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        kind: v.union(v.literal("short"), v.literal("long")),
        required: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, a) => {
    const host = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("username_lower", a.username.trim().toLowerCase()))
      .unique();
    if (!host) return { ok: false as const, reason: "no such host" };

    const meeting = await ctx.db
      .query("meeting_types")
      .withIndex("by_user_slug", (q) => q.eq("user_id", host.id).eq("slug", a.slug.trim().toLowerCase()))
      .unique();
    if (!meeting) return { ok: false as const, reason: "no such meeting" };

    const before = meeting.questions ?? [];
    await ctx.db.patch(meeting._id, { questions: a.questions, updated_at: Date.now() });
    return { ok: true as const, id: meeting.id, restored: before.length };
  },
});

/** Sets a meeting's location, and puts it back. The booking page cannot be
 *  exercised for a phone meeting without a meeting that is one. */
export const seedLocationFixture = internalMutation({
  args: { username: v.string(), slug: v.string(), location: v.string(), detail: v.string() },
  handler: async (ctx, a) => {
    const host = await ctx.db
      .query("profiles")
      .withIndex("by_username_lower", (q) => q.eq("username_lower", a.username.trim().toLowerCase()))
      .unique();
    if (!host) return { ok: false as const, reason: "no such host" };
    const meeting = await ctx.db
      .query("meeting_types")
      .withIndex("by_user_slug", (q) => q.eq("user_id", host.id).eq("slug", a.slug.trim().toLowerCase()))
      .unique();
    if (!meeting) return { ok: false as const, reason: "no such meeting" };

    const was = { location: meeting.location, detail: meeting.location_detail ?? "" };
    await ctx.db.patch(meeting._id, { location: a.location, location_detail: a.detail, updated_at: Date.now() });
    return { ok: true as const, was };
  },
});
