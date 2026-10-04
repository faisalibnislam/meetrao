import { query, mutation } from "./_generated/server";
import { fail } from "./lib/errors";
import { v } from "convex/values";
import { requireProfile, assertOwnerOrAdmin, AuthError } from "./lib/auth";
import { meetingTypeOut } from "./lib/serialize";
import { uuid } from "./lib/ids";
import { isLocationKind } from "./lib/locations";
import { requirePro } from "./lib/plan";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
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

/**
 * The company a meeting may be filed under, or null for a personal one.
 *
 * Refuses a company the caller is not in. Without this, anybody could file a
 * meeting under somebody else's company id and have it served from that
 * company's branded domain, which is the whole thing company scoping exists
 * to prevent.
 */
async function companyForMeeting(
  ctx: MutationCtx,
  me: Doc<"profiles">,
  companyId: string | null | undefined,
): Promise<string | null> {
  if (!companyId) return null;

  const rows = await ctx.db
    .query("company_members")
    .withIndex("by_user", (q) => q.eq("user_id", me.id))
    .collect();
  if (!rows.some((r) => r.company_id === companyId)) fail("That is not one of your companies.");
  return companyId;
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

/** At most five, each with a label, and no two sharing an id.
 *
 *  Five is the design's number and it is a kindness: a booking form that asks
 *  eight questions is one guests abandon. The cap is enforced here rather than
 *  only in the form, because the form is not the boundary. */
const MAX_QUESTIONS = 5;

/**
 * The kind, from the allow-list, and its detail.
 *
 * An unknown kind falls back to Meet rather than failing: the alternative is a
 * meeting that cannot be saved because a value nobody typed is wrong. A kind
 * that needs a detail and has none is still allowed. The host may not know
 * the room yet, and the guest is told "details to follow" rather than being
 * refused a booking.
 */
/**
 * Seats, 1 to 100.
 *
 * One is the one-to-one meeting and the default. A hundred is not a technical
 * limit. It is the point past which a booking page is the wrong tool and a
 * webinar platform is the right one.
 */
const MAX_CAPACITY = 100;

function validCapacity(value: number, owner: Doc<"profiles">): number {
  if (!Number.isInteger(value) || value < 1) fail("Seats must be a whole number, 1 or more.");
  if (value > MAX_CAPACITY) fail(`A meeting can hold at most ${MAX_CAPACITY} guests.`);
  // One seat is the ordinary meeting; more than one is a session several
  // people share, which is Pro.
  if (value > 1) requirePro(owner, "Group sessions");
  return value;
}

function validLocation(kind: string, detail: string): { location: string; location_detail: string } {
  const location = isLocationKind(kind) ? kind : "google_meet";
  const trimmed = detail.trim().slice(0, 200);
  // Meet mints its own link; a leftover address on a Meet meeting would print
  // beside it and contradict it.
  return { location, location_detail: location === "google_meet" ? "" : trimmed };
}

function validQuestions(
  input: { id: string; label: string; kind: "short" | "long"; required: boolean }[],
): { id: string; label: string; kind: "short" | "long"; required: boolean }[] {
  const out = input
    .map((q) => ({ ...q, label: q.label.trim() }))
    .filter((q) => q.label.length > 0);

  if (out.length > MAX_QUESTIONS) fail(`A meeting can ask at most ${MAX_QUESTIONS} questions.`);
  for (const q of out) {
    if (q.label.length > 120) fail("Keep a question under 120 characters.");
    if (!q.id) fail("A question is missing its id.");
  }
  if (new Set(out.map((q) => q.id)).size !== out.length) fail("Two questions share an id.");
  return out;
}

export const create = mutation({
  args: {
    name: v.string(), description: v.optional(v.string()), slug: v.string(),
    duration_minutes: v.number(), buffer_minutes: v.optional(v.number()),
    minimum_notice_minutes: v.optional(v.number()), booking_window_days: v.optional(v.number()),
    location: v.optional(v.string()), location_detail: v.optional(v.string()),
    capacity: v.optional(v.number()),
    /* The form has an "active" switch and has always sent this; the validator
       never accepted it, so every create from the Meetings screen failed with
       "Object contains extra field `is_active`". Onboarding creates meetings
       with its own payload, which is why the ones made there worked and this
       went unnoticed. Absent means active, which is what a new meeting is. */
    is_active: v.optional(v.boolean()),
    schedule_id: v.optional(v.union(v.string(), v.null())),
    company_id: v.optional(v.union(v.string(), v.null())),
    questions: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          kind: v.union(v.literal("short"), v.literal("long")),
          required: v.boolean(),
        }),
      ),
    ),
  },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    const row = {
      name: a.name, slug: a.slug.trim().toLowerCase(),
      duration_minutes: a.duration_minutes, buffer_minutes: a.buffer_minutes ?? 0,
      minimum_notice_minutes: a.minimum_notice_minutes ?? 60, booking_window_days: a.booking_window_days ?? 30,
    };
    validate(row);

    // unique (user_id, slug), Postgres had an index; this is the replacement.
    const clash = await ctx.db
      .query("meeting_types")
      .withIndex("by_user_slug", (q) => q.eq("user_id", me.id).eq("slug", row.slug))
      .first();
    if (clash) fail("You already have a meeting with that link.");

    const now = Date.now();
    const id = uuid();
    await ctx.db.insert("meeting_types", {
      id, user_id: me.id, description: a.description ?? "",
      ...validLocation(a.location ?? "google_meet", a.location_detail ?? ""),
      capacity: validCapacity(a.capacity ?? 1, me),
      is_active: a.is_active ?? true,
      questions: validQuestions(a.questions ?? []),
      schedule_id: a.schedule_id ?? null,
      company_id: await companyForMeeting(ctx, me, a.company_id),
      created_at: now, updated_at: now, ...row,
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
    /* The handler reads both of these and the form sends both, and neither was
       ever listed, so editing a meeting's seats or its location detail failed
       the same way creating one did. Same family of defect as is_active on
       `create`: a validator and a payload that nothing compares until a
       request is in flight. meeting-args.test.ts compares them now. */
    location_detail: v.optional(v.string()),
    capacity: v.optional(v.number()),
    is_active: v.optional(v.boolean()), schedule_id: v.optional(v.union(v.string(), v.null())),
    team_id: v.optional(v.union(v.string(), v.null())),
    company_id: v.optional(v.union(v.string(), v.null())),
    questions: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          kind: v.union(v.literal("short"), v.literal("long")),
          required: v.boolean(),
        }),
      ),
    ),
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

    if (patch.location !== undefined || patch.location_detail !== undefined) {
      const fixed = validLocation(
        (patch.location as string | undefined) ?? m.location,
        (patch.location_detail as string | undefined) ?? m.location_detail ?? "",
      );
      patch.location = fixed.location;
      patch.location_detail = fixed.location_detail;
    }

    if (patch.capacity !== undefined) patch.capacity = validCapacity(patch.capacity as number, me);

    /* Only a team you own, and only your own meeting. The ownership check
       above has already run, so this is the other half: a meeting cannot be
       handed to somebody else's rotation. */
    if (patch.team_id) {
      const team = await ctx.db.query("teams").withIndex("by_uuid", (q) => q.eq("id", patch.team_id as string)).unique();
      if (!team || team.owner_id !== m.user_id) fail("That is not your team.");
    }

    /* Only a company you are in. Moving a meeting under somebody else's
       company id would have it served from their branded domain. */
    if (patch.company_id !== undefined) {
      patch.company_id = await companyForMeeting(ctx, me, patch.company_id as string | null);
    }

    if (patch.questions !== undefined) {
      patch.questions = validQuestions(patch.questions as { id: string; label: string; kind: "short" | "long"; required: boolean }[]);
    }

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
