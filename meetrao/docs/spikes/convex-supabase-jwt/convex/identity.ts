import { query } from "./_generated/server";

/** What a Convex function sees when a Supabase-shaped JWT is presented. */
export const whoAmI = query({
  args: {},
  handler: async (ctx) => {
    const id = await ctx.auth.getUserIdentity();
    if (!id) return { authenticated: false };
    return { authenticated: true, subject: id.subject, issuer: id.issuer, email: id.email ?? null };
  },
});
