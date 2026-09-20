import { query } from "./_generated/server";
import { currentUserId } from "./lib/auth";
import type { Id } from "./_generated/dataModel";

/**
 * Diagnostic: what Convex makes of the caller's token.
 *
 * Returns no secrets and no other user's data — it reports only what the
 * presented JWT already contains, plus whether a profile exists for it. Kept
 * after the migration because "is anyone actually signed in?" is otherwise
 * answered by guesswork, and the server components use it as their session
 * read.
 */
export const identity = query({
  args: {},
  handler: async (ctx) => {
    const id = await ctx.auth.getUserIdentity();
    if (!id) return { authenticated: false as const };

    /* The RAW subject is "<userId>|<sessionId>", which is not what any row is
       keyed by. `currentUserId` does the translation, and it is the only thing
       authorization ever uses, so it is what this reports. */
    const resolved = await currentUserId(ctx);

    const profile = resolved
      ? await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", resolved)).unique()
      : null;

    /* The verification flag rides along, because requireSession needs it on
       every authenticated request and a second query for one boolean is a
       second round trip on every page. Convex Auth records the moment on the
       user row rather than in the token, which is why src/proxy.ts cannot
       answer this and the gate has to live in a page's own data read. */
    const user = await ctx.db.get(id.subject.split("|")[0] as Id<"users">).catch(() => null);
    const verified = Boolean((user as { emailVerificationTime?: number } | null)?.emailVerificationTime);

    return {
      authenticated: true as const,
      subject: id.subject,
      resolvedUserId: resolved,
      issuer: id.issuer,
      email: id.email ?? null,
      emailVerified: verified,
      hasConvexProfile: profile !== null,
      username: profile?.username ?? null,
    };
  },
});

/**
 * Whether the caller's email is verified.
 *
 * Its own query because the `/verify` gate is the only thing that asks, and a
 * verification flag has no business riding along on every identity read.
 * Convex Auth records the moment on the user row rather than in the token,
 * which is why `src/proxy.ts` cannot answer this and the gate lives in pages.
 */
export const emailVerified = query({
  args: {},
  handler: async (ctx) => {
    const id = await ctx.auth.getUserIdentity();
    if (!id) return { authenticated: false as const, verified: false, email: null };

    const userId = id.subject.split("|")[0];
    const user = await ctx.db.get(userId as Id<"users">).catch(() => null);
    const row = user as { emailVerificationTime?: number; email?: string } | null;

    return {
      authenticated: true as const,
      verified: Boolean(row?.emailVerificationTime),
      email: row?.email ?? id.email ?? null,
    };
  },
});
