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
    /* Polar's cancel_at_period_end. Optional for the same reason: older
       deliveries, and older deploys of the route, send none. */
    cancelAtPeriodEnd: v.optional(v.union(v.boolean(), v.null())),
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
      /* Kept only so the Plan screen can say "monthly" or "yearly" and
         "renews" or "ends". Neither decides the plan: that is `plan` and
         `plan_until` above. An event without a product leaves the stored one
         alone rather than wiping it, since some Polar events omit it. */
      polar_product_id: a.productId ?? profile.polar_product_id ?? null,
      plan_cancels_at_period_end: a.cancelAtPeriodEnd ?? false,
      updated_at: Date.now(),
    });

    await logActivity(ctx, {
      actorId: profile.id,
      kind: `plan_${plan}`,
      summary: `${profile.email} is now ${plan} (${a.status})`,
    });

    return { matched: true, plan };
  },
});

/**
 * Monthly or yearly, from the product the subscription is for.
 *
 * Null when it cannot be told: no product stored yet (a subscription that has
 * had no event since the field existed), no settings row, or a product the
 * console does not list. The Plan screen then leaves cadence out rather than
 * printing a guess as a fact about somebody's money.
 */
function cadenceOf(
  productId: string | null | undefined,
  settings: Doc<"platform_settings"> | null,
): "monthly" | "yearly" | null {
  if (!productId || !settings) return null;
  if (productId === settings.polar_product_monthly || productId === settings.polar_product_business_monthly) {
    return "monthly";
  }
  if (productId === settings.polar_product_yearly || productId === settings.polar_product_business_yearly) {
    return "yearly";
  }
  return null;
}

/** The caller's own plan, for the screens that gate on it. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx);
    const subscribed = hasSubscription(me);
    /* Only read when there is a subscription to describe. Every page of the
       app runs this query for the rail's upgrade button, and a free account
       has no cadence to look up. */
    const settings = subscribed ? await ctx.db.query("platform_settings").first() : null;
    return {
      /* How a live subscription is billed, and whether it is set to end at
         `plan_until` rather than renew. Both describe the subscription only,
         never a complimentary grant, and neither is read by any gate. */
      cadence: subscribed ? cadenceOf(me.polar_product_id, settings) : null,
      cancels_at_period_end: subscribed ? me.plan_cancels_at_period_end === true : false,
      plan: planOf(me),
      plan_until: me.plan_until ? new Date(me.plan_until).toISOString() : null,
      has_subscription: subscribed,
      /* Pro without paying for it. The host is told plainly rather than shown
         a billing portal with nothing in it, and never shown the operator's
         note, which is written for operators. */
      complimentary: hasComp(me) && !hasSubscription(me),
      comp_until: me.comp_until ? new Date(me.comp_until).toISOString() : null,
    };
  },
});
