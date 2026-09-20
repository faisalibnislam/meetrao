import { query } from "./_generated/server";
import { currentUserId } from "./lib/auth";

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

    /* The RAW subject differs by issuer — a Supabase UUID, or Convex Auth's
       "<userId>|<sessionId>". `currentUserId` is what reconciles them, and it
       is the only thing authorization ever uses, so it is what this reports. */
    const resolved = await currentUserId(ctx);

    const profile = resolved
      ? await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", resolved)).unique()
      : null;

    return {
      authenticated: true as const,
      subject: id.subject,
      resolvedUserId: resolved,
      issuer: id.issuer,
      email: id.email ?? null,
      hasConvexProfile: profile !== null,
      username: profile?.username ?? null,
    };
  },
});
