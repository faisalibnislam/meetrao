import type { Plan } from "./plan";

/* ─────────────────────────────────────────────────────────────────────────────
   How much each plan may own.

   ONE TABLE, read by the mutations that enforce it and by the pricing page
   that advertises it. A cap written in Convex and a number typed on a pricing
   card are two things that disagree the first time either moves, and the one
   people see is the one nobody updates.

   The caps are not there to sell upgrades. Every member on a company domain is
   a published page: a Google freebusy call on each view, stored bookings, and
   reminder emails. Cost grows with members and companies while the price stays
   flat, so these bound what one account can do. No honest customer will reach
   either number.
   ───────────────────────────────────────────────────────────────────────────── */

export type PlanLimits = {
  /** Companies this plan may own. */
  companies: number;
  /** People one of those companies may hold, the owner included. */
  membersPerCompany: number;
};

export const LIMITS: Record<Plan, PlanLimits> = {
  /* Free owns nothing. It can still BE a member of somebody else's company,
     which costs the free account nothing and is paid for by that owner. */
  free: { companies: 0, membersPerCompany: 0 },
  /* Pro is one company holding one person: themselves. A Pro company is a
     personal domain with branding on it, which is what Pro always was. Letting
     it hold others would sell the Business feature at the Pro price. */
  pro: { companies: 1, membersPerCompany: 1 },
  business: { companies: 10, membersPerCompany: 100 },
};

export function limitsFor(plan: Plan): PlanLimits {
  return LIMITS[plan];
}
