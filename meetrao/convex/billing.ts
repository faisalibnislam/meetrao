import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
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

/** Polar statuses that mean "this account has paid and should have Pro". */
const PAID = ["active", "trialing", "past_due"];

export const applyPolarSubscription = mutation({
  args: {
    profileId: v.union(v.string(), v.null()),
    customerId: v.union(v.string(), v.null()),
    subscriptionId: v.string(),
    status: v.string(),
    currentPeriodEnd: v.union(v.number(), v.null()),
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
    const plan = paid ? "pro" : "free";

    await ctx.db.patch(profile._id, {
      plan,
      plan_until: a.currentPeriodEnd,
      polar_customer_id: a.customerId ?? profile.polar_customer_id ?? null,
      polar_subscription_id: a.subscriptionId,
      updated_at: Date.now(),
    });

    await logActivity(ctx, {
      actorId: profile.id,
      kind: paid ? "plan_pro" : "plan_free",
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
