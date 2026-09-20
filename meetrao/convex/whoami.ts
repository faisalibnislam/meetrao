import { query } from "./_generated/server";

/**
 * Diagnostic: what Convex makes of the caller's Supabase token.
 *
 * Returns no secrets and no other user's data — it reports only what the
 * presented JWT already contains. Kept after the migration because "is the
 * auth bridge up?" is otherwise answered by guesswork.
 */
export const identity = query({
  args: {},
  handler: async (ctx) => {
    const id = await ctx.auth.getUserIdentity();
    if (!id) return { authenticated: false as const };

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_uuid", (q) => q.eq("id", id.subject))
      .unique();

    return {
      authenticated: true as const,
      subject: id.subject,
      issuer: id.issuer,
      email: id.email ?? null,
      hasConvexProfile: profile !== null,
      username: profile?.username ?? null,
    };
  },
});
