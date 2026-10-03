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

/**
 * The Polar products Pro is sold as.
 *
 * Admin-only, because an operator is the only person who has any use for a
 * product id, and because this is the pair a checkout is built from, which
 * makes it worth keeping out of a public projection by habit.
 */
export const products = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const row = await ctx.db.query("platform_settings").first();
    return {
      monthly: row?.polar_product_monthly ?? null,
      yearly: row?.polar_product_yearly ?? null,
      businessMonthly: row?.polar_product_business_monthly ?? null,
      businessYearly: row?.polar_product_business_yearly ?? null,
    };
  },
});

/**
 * What a checkout reads.
 *
 * Behind a session, because only a signed-in host can start one. A product id
 * is not a secret (it travels in the checkout URL) but a public function
 * that hands out billing configuration is a habit worth not forming.
 */
export const productsForCheckout = query({
  args: {},
  handler: async (ctx) => {
    await requireProfile(ctx);
    const row = await ctx.db.query("platform_settings").first();
    return {
      monthly: row?.polar_product_monthly ?? null,
      yearly: row?.polar_product_yearly ?? null,
      businessMonthly: row?.polar_product_business_monthly ?? null,
      businessYearly: row?.polar_product_business_yearly ?? null,
    };
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
  args: {
    app_name: v.optional(v.string()),
    support_email: v.optional(v.string()),
    polar_product_monthly: v.optional(v.string()),
    polar_product_yearly: v.optional(v.string()),
    polar_product_business_monthly: v.optional(v.string()),
    polar_product_business_yearly: v.optional(v.string()),
  },
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

function strip(a: {
  app_name?: string;
  support_email?: string;
  polar_product_monthly?: string;
  polar_product_yearly?: string;
  polar_product_business_monthly?: string;
  polar_product_business_yearly?: string;
}) {
  const out: Record<string, string> = {};
  if (a.app_name !== undefined) out.app_name = a.app_name;
  if (a.support_email !== undefined) out.support_email = a.support_email;
  if (a.polar_product_monthly !== undefined) out.polar_product_monthly = a.polar_product_monthly;
  if (a.polar_product_yearly !== undefined) out.polar_product_yearly = a.polar_product_yearly;
  if (a.polar_product_business_monthly !== undefined) out.polar_product_business_monthly = a.polar_product_business_monthly;
  if (a.polar_product_business_yearly !== undefined) out.polar_product_business_yearly = a.polar_product_business_yearly;
  return out;
}
