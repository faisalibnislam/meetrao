import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requireProfile } from "./lib/auth";
import { hasComp, hasSubscription, planOf } from "./lib/plan";
import { logActivity } from "./lib/effects";

/* ─────────────────────────────────────────────────────────────────────────────
   The plan, written by exactly one caller.

   `applyPolarSubscription` is reachable without a session, because the caller
   is Polar's webhook arriving at a Next route handler. There is no user on
   that request. What protects it is the signature check in
   src/app/api/polar/webhook, which happens BEFORE this is called and which
   refuses anything it cannot verify.

   The account is found by external_customer_id, which is the profile id we
   sent when the checkout was made. The Polar customer id is stored on first
   sight so a later event that carries only the customer still finds its way
   home.
   ───────────────────────────────────────────────────────────────────────────── */

/** Polar statuses that mean "this account has paid and should have a plan". */
const PAID = ["active", "trialing", "past_due"];

/**
 * Which tier a Polar product id is.
 *
 * The product ids live in `platform_settings` because an operator creates the
 * products from the admin console. Anything not recognised as a Business
 * product is Pro, deliberately: an unrecognised id means somebody created a
 * product outside the console, and granting the LOWER tier in that case is
 * the mistake that costs a support message rather than a refund.
 *
 * It also keeps every subscription written before this existed correct. Those
 * events carry no product id at all and were all Pro.
 */
async function tierForProduct(
  ctx: { db: { query: (t: "platform_settings") => { first: () => Promise<Doc<"platform_settings"> | null> } } },
  productId: string | null,
): Promise<"pro" | "business"> {
  if (!productId) return "pro";
  const settings = await ctx.db.query("platform_settings").first();
  if (!settings) return "pro";
  const business = [settings.polar_product_business_monthly, settings.polar_product_business_yearly];
  return business.includes(productId) ? "business" : "pro";
}

export const applyPolarSubscription = mutation({
  args: {
    profileId: v.union(v.string(), v.null()),
    customerId: v.union(v.string(), v.null()),
    subscriptionId: v.string(),
    status: v.string(),
    currentPeriodEnd: v.union(v.number(), v.null()),
    /* Optional: a delivery from before this existed carries none, and every
       one of those was Pro. */
    productId: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, a) => {
    const byId = a.profileId
      ? await ctx.db.query("profiles").withIndex("by_uuid", (q) => q.eq("id", a.profileId as string)).unique()
      : null;
    const byCustomer =
      !byId && a.customerId
        ? await ctx.db
            .query("profiles")
            .withIndex("by_polar_customer", (q) => q.eq("polar_customer_id", a.customerId as string))
            .unique()
        : null;

    const profile = byId ?? byCustomer;
    // An event for somebody who is not a host here is not an error: a webhook
    // fires for every customer of the organisation, product by product.
    if (!profile) return { matched: false };

    const paid = PAID.includes(a.status);
    /* past_due keeps Pro deliberately: Polar retries a failed renewal for
       days before revoking, and turning the product off mid-retry punishes
       somebody whose card expired rather than somebody who left. */
    const plan = paid ? await tierForProduct(ctx, a.productId ?? null) : "free";

    await ctx.db.patch(profile._id, {
      plan,
      plan_until: a.currentPeriodEnd,
      polar_customer_id: a.customerId ?? profile.polar_customer_id ?? null,
      polar_subscription_id: a.subscriptionId,
      updated_at: Date.now(),
    });

    await logActivity(ctx, {
      actorId: profile.id,
      kind: paid ? (plan === "business" ? "plan_business" : "plan_pro") : "plan_free",
      summary: `${profile.email} is now ${plan} (${a.status})`,
    });

    return { matched: true, plan };
  },
});

/** The caller's own plan, for the screens that gate on it. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    return {
      plan: planOf(me),
      plan_until: me.plan_until ? new Date(me.plan_until).toISOString() : null,
      has_subscription: hasSubscription(me),
      /* Pro without paying for it. The host is told plainly rather than shown
         a billing portal with nothing in it, and never shown the operator's
         note, which is written for operators. */
      complimentary: hasComp(me) && !hasSubscription(me),
      comp_until: me.comp_until ? new Date(me.comp_until).toISOString() : null,
    };
  },
});
