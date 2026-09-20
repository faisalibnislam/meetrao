import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireProfile, requireAdmin } from "./lib/auth";

/* A singleton. Postgres enforced it with `id boolean primary key check (id)`;
   here the mutation refuses to create a second row. */

const DEFAULTS = { app_name: "Meetrao", support_email: "support@meetrao.com" };

export const get = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("platform_settings").first();
    return row ? { app_name: row.app_name, support_email: row.support_email } : DEFAULTS;
  },
});

/** platform_settings_select was granted to every authenticated role. */
export const getForApp = query({
  args: {},
  handler: async (ctx) => {
    await requireProfile(ctx);
    const row = await ctx.db.query("platform_settings").first();
    return row ? { app_name: row.app_name, support_email: row.support_email } : DEFAULTS;
  },
});

export const update = mutation({
  args: { app_name: v.optional(v.string()), support_email: v.optional(v.string()) },
  handler: async (ctx, a) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const row = await ctx.db.query("platform_settings").first();
    if (!row) {
      await ctx.db.insert("platform_settings", { ...DEFAULTS, ...strip(a), updated_at: now });
    } else {
      await ctx.db.patch(row._id, { ...strip(a), updated_at: now });
    }
    const after = await ctx.db.query("platform_settings").first();
    return { app_name: after!.app_name, support_email: after!.support_email };
  },
});

function strip(a: { app_name?: string; support_email?: string }) {
  const out: Record<string, string> = {};
  if (a.app_name !== undefined) out.app_name = a.app_name;
  if (a.support_email !== undefined) out.support_email = a.support_email;
  return out;
}
