import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { fail } from "./errors";

/* ─────────────────────────────────────────────────────────────────────────────
   Authorization, the replacement for Row Level Security.

   Postgres decided this. Twenty-four policies meant a host could not read
   another host's rows even if the application asked for them, because the
   database refused. Convex has no such layer: a function reads whatever it
   queries. Every one of those policies is therefore a call in here, and the
   rule is simple and absolute:

     NO function that touches a user-owned table may read or write without
     first going through requireProfile / requireAdmin / assertOwner.

   The three shapes below map one-to-one onto the three shapes the policies
   had. `docs/convex-migration.md` §1.3 is the checklist.
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Kept as a function rather than a class: a thrown class instance is a plain
 * Error to Convex, and its message would be redacted in production. See
 * convex/lib/errors.ts.
 */
export function AuthError(message: string, code: string): never {
  return fail(message, code);
}

/**
 * The caller's identity as `profiles.id`.
 *
 * THE ONE PLACE identity is resolved, and deliberately so. Convex Auth's
 * subject is "<userId>|<sessionId>", which is not what any row is keyed by, so
 * something has to do the translation and it had better be one thing.
 *
 * `users.supabase_id` is the map. The name is now a misnomer. It was the
 * Supabase UUID during the migration, and for accounts created since it is
 * simply the Convex user id written back to itself (see
 * profiles.createProfileForNewUser). It is kept under that name because
 * renaming an indexed field every profile and every foreign key depends on is
 * a data migration, not a tidy-up. What it MEANS is stable: the value that
 * `profiles.id` and every user-keyed row use.
 *
 * Because every authorization path goes through here, nothing else in the
 * codebase has to know any of that.
 */
export async function currentUserId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const userId = identity.subject.split("|")[0];
  const user = await ctx.db.get(userId as Id<"users">).catch(() => null);
  const mapped = (user as { supabase_id?: string } | null)?.supabase_id;
  if (mapped) return mapped;

  // No mapping row yet. A sign-up mid-flight, before the profile callback has
  // written it back. The Convex user id is the right answer either way.
  return userId;
}

/** The caller's profile, or null. Does not throw, for optional-session paths. */
export async function optionalProfile(ctx: QueryCtx | MutationCtx): Promise<Doc<"profiles"> | null> {
  const userId = await currentUserId(ctx);
  if (!userId) return null;
  return await ctx.db
    .query("profiles")
    .withIndex("by_uuid", (q) => q.eq("id", userId))
    .unique();
}

/**
 * The caller's profile, or a refusal.
 *
 * Suspension is checked here rather than at each call site, mirroring the
 * `is_suspended` redirect in src/lib/data/session.ts. A suspended host can
 * still be read BY the guest path (a booking page shows "not accepting
 * bookings"), which is why that check lives on the public functions instead.
 */
export async function requireProfile(ctx: QueryCtx | MutationCtx): Promise<Doc<"profiles">> {
  const profile = await optionalProfile(ctx);
  if (!profile) AuthError("Not signed in.", "UNAUTHENTICATED");
  if (profile.is_suspended) AuthError("This account is suspended.", "SUSPENDED");
  return profile;
}

/** public.is_admin(). */
export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<"profiles">> {
  const profile = await requireProfile(ctx);
  if (!profile.is_admin) AuthError("Not permitted.", "FORBIDDEN");
  return profile;
}

/**
 * The owner policies: `user_id = (select auth.uid())`.
 *
 * Takes the row's owner id rather than the row, so it reads at the call site
 * as the policy read in SQL.
 */
export function assertOwner(profile: Doc<"profiles">, ownerId: string | null | undefined): void {
  if (!ownerId || ownerId !== profile.id) AuthError("Not permitted.", "FORBIDDEN");
}

/** Owner OR admin. The `_select_admin` policies that sit beside an owner one. */
export function assertOwnerOrAdmin(profile: Doc<"profiles">, ownerId: string | null | undefined): void {
  if (profile.is_admin) return;
  assertOwner(profile, ownerId);
}
