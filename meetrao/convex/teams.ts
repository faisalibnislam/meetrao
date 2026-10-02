import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { fail } from "./lib/errors";
import { requireProfile, assertOwnerOrAdmin, AuthError } from "./lib/auth";
import { uuid } from "./lib/ids";
import { logActivity } from "./lib/effects";
import { requirePro } from "./lib/plan";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/* ─────────────────────────────────────────────────────────────────────────────
   Teams: one booking link that several hosts answer, in turn.

   WHAT A TEAM IS NOT. It is not an account type, it has no seats to buy, and
   it does not own anybody's calendar. A member is an ordinary host who has
   agreed to appear in a rotation; their own hours, their own timezone and
   their own Google connection are what a guest is offered when it is their
   turn. Removing them from the team takes nothing away from them.

   MEMBERS MUST ALREADY HAVE AN ACCOUNT. Inviting an address that has never
   signed up would mean a pending state, an invitation email, an expiry, and a
   rotation that quietly skips a name nobody notices is missing. Adding an
   existing host is one mutation and fails loudly.

   THE SLUG IS PRODUCT-WIDE. Meetrao.com/<name> is a host and
   meetrao.com/team/<name> is a team, but a guest reads them as one namespace
   and so does a search engine, so a team cannot take a name a host holds, or
   the reverse.
   ───────────────────────────────────────────────────────────────────────────── */

const MAX_NAME = 60;
const MAX_MEMBERS = 25;

function normaliseSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/** Every member of a team, owner first, as profiles. */
export async function membersOf(ctx: QueryCtx | MutationCtx, teamId: string) {
  const rows = await ctx.db
    .query("team_members")
    .withIndex("by_team", (q) => q.eq("team_id", teamId))
    .collect();

  const out = [];
  for (const row of rows) {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_uuid", (q) => q.eq("id", row.user_id))
      .unique();
    // A suspended host is not offered to guests, on a team link or their own.
    if (!profile || profile.is_suspended) continue;
    out.push({ member: row, profile });
  }

  return out.sort((a, b) => Number(b.member.role === "owner") - Number(a.member.role === "owner") || a.member.created_at - b.member.created_at);
}

async function requireOwner(ctx: MutationCtx, teamId: string) {
  const me = await requireProfile(ctx);
  const team = await ctx.db.query("teams").withIndex("by_uuid", (q) => q.eq("id", teamId)).unique();
  if (!team) AuthError("No such team.", "NOT_FOUND");
  assertOwnerOrAdmin(me, team.owner_id);
  return { me, team };
}

/** A name nobody else holds, host or team. */
async function slugIsFree(ctx: MutationCtx, slug: string, exceptTeamId?: string): Promise<boolean> {
  const host = await ctx.db
    .query("profiles")
    .withIndex("by_username_lower", (q) => q.eq("username_lower", slug))
    .unique();
  if (host) return false;

  const team = await ctx.db
    .query("teams")
    .withIndex("by_slug_lower", (q) => q.eq("slug_lower", slug))
    .unique();
  return !team || team.id === exceptTeamId;
}

export const create = mutation({
  args: { name: v.string(), slug: v.string() },
  handler: async (ctx, a) => {
    const me = await requireProfile(ctx);
    requirePro(me, "A team link");

    const name = a.name.trim();
    if (!name) fail("Give the team a name.");
    if (name.length > MAX_NAME) fail(`Keep the name under ${MAX_NAME} characters.`);

    const slug = normaliseSlug(a.slug || name);
    if (slug.length < 3) fail("That link is too short.");
    if (!(await slugIsFree(ctx, slug))) fail("That link is taken.");

    const now = Date.now();
    const id = uuid();
    await ctx.db.insert("teams", {
      id, owner_id: me.id, name, slug, slug_lower: slug, created_at: now, updated_at: now,
    });
    // The owner is a member, not a special case: they take their turn like
    // everybody else unless they remove themselves.
    await ctx.db.insert("team_members", {
      id: uuid(), team_id: id, user_id: me.id, role: "owner", created_at: now,
    });
    await logActivity(ctx, { actorId: me.id, kind: "team_created", summary: `${me.full_name || me.email} created team ${name}` });
    return { id, slug };
  },
});

export const rename = mutation({
  args: { id: v.string(), name: v.string(), slug: v.string() },
  handler: async (ctx, a) => {
    const { team } = await requireOwner(ctx, a.id);
    const name = a.name.trim();
    if (!name) fail("Give the team a name.");

    const slug = normaliseSlug(a.slug || name);
    if (slug.length < 3) fail("That link is too short.");
    if (!(await slugIsFree(ctx, slug, team.id))) fail("That link is taken.");

    await ctx.db.patch(team._id, { name, slug, slug_lower: slug, updated_at: Date.now() });
    return true;
  },
});

export const addMember = mutation({
  args: { id: v.string(), email: v.string() },
  handler: async (ctx, a) => {
    const { team } = await requireOwner(ctx, a.id);

    const email = a.email.trim().toLowerCase();
    const profile = await ctx.db.query("profiles").withIndex("by_email", (q) => q.eq("email", email)).unique();
    // Loud, rather than a pending invitation that silently never arrives.
    if (!profile) fail("Nobody with that address has a Meetrao account yet.");
    if (profile.is_suspended) fail("That account is suspended.");

    const existing = await ctx.db
      .query("team_members")
      .withIndex("by_team", (q) => q.eq("team_id", team.id))
      .collect();
    if (existing.some((m) => m.user_id === profile.id)) fail("They are already on this team.");
    if (existing.length >= MAX_MEMBERS) fail(`A team can hold ${MAX_MEMBERS} people.`);

    await ctx.db.insert("team_members", {
      id: uuid(), team_id: team.id, user_id: profile.id, role: "member", created_at: Date.now(),
    });
    return { userId: profile.id, name: profile.full_name || profile.username };
  },
});

export const removeMember = mutation({
  args: { id: v.string(), userId: v.string() },
  handler: async (ctx, a) => {
    const { team } = await requireOwner(ctx, a.id);

    const rows = await ctx.db
      .query("team_members")
      .withIndex("by_team", (q) => q.eq("team_id", team.id))
      .collect();
    const row = rows.find((m) => m.user_id === a.userId);
    if (!row) return false;
    /* The owner is the one member who cannot leave: a team whose link points
       at nobody would keep taking bookings and assigning them to no one. */
    if (row.role === "owner") fail("The owner cannot be removed. Delete the team instead.");

    await ctx.db.delete(row._id);
    return true;
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, a) => {
    const { team } = await requireOwner(ctx, a.id);

    /* Meetings owned by the team go back to the owner rather than being
       deleted: their bookings are real, and a booking whose meeting vanished
       shows as "meeting removed" on the host's own screen. */
    const meetings = await ctx.db
      .query("meeting_types")
      .withIndex("by_user", (q) => q.eq("user_id", team.owner_id))
      .collect();
    for (const m of meetings) {
      if (m.team_id === team.id) await ctx.db.patch(m._id, { team_id: null, updated_at: Date.now() });
    }

    for (const row of await ctx.db.query("team_members").withIndex("by_team", (q) => q.eq("team_id", team.id)).collect()) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.delete(team._id);
    return true;
  },
});

/** The owner's own screen: their team, its members and its meetings. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);

    const owned = await ctx.db.query("teams").withIndex("by_owner", (q) => q.eq("owner_id", me.id)).collect();
    const memberships = await ctx.db.query("team_members").withIndex("by_user", (q) => q.eq("user_id", me.id)).collect();

    const teamIds = new Set([...owned.map((t) => t.id), ...memberships.map((m) => m.team_id)]);
    const out = [];

    for (const id of teamIds) {
      const team = await ctx.db.query("teams").withIndex("by_uuid", (q) => q.eq("id", id)).unique();
      if (!team) continue;
      const members = await membersOf(ctx, team.id);
      const meetings = (
        await ctx.db.query("meeting_types").withIndex("by_user", (q) => q.eq("user_id", team.owner_id)).collect()
      ).filter((m) => m.team_id === team.id);

      out.push({
        id: team.id,
        name: team.name,
        slug: team.slug,
        is_owner: team.owner_id === me.id,
        members: members.map(({ member, profile }) => ({
          user_id: profile.id,
          name: profile.full_name || profile.username,
          email: profile.email,
          role: member.role,
          timezone: profile.timezone,
        })),
        meetings: meetings.map((m) => ({ id: m.id, name: m.name, slug: m.slug, duration_minutes: m.duration_minutes })),
      });
    }

    return out.sort((a, b) => Number(b.is_owner) - Number(a.is_owner) || a.name.localeCompare(b.name));
  },
});
