import { fail } from "./errors";
import type { Doc } from "../_generated/dataModel";

/* ─────────────────────────────────────────────────────────────────────────────
   Free and Pro.

   ONE FUNCTION DECIDES. Everything that gates a feature asks `isPro`, so
   there is a single answer to "is this account paid" and a single place to
   change what that means. A plan read from three places is a plan that
   disagrees with itself the first time somebody's card fails.

   A cancelled subscription keeps its plan until the period it was paid for
   runs out. That is what `plan_until` is for. Somebody who cancels on day two
   of a year they paid for has not stopped being a customer.

   BUSINESS IS A SUPERSET OF PRO, which is why `isPro` asks whether the plan is
   anything other than free rather than whether it equals "pro". Every gate
   written against Pro keeps working for a Business account without being
   touched, and a gate that genuinely needs Business asks `isBusiness`.
   ───────────────────────────────────────────────────────────────────────────── */

export type Plan = "free" | "pro" | "business";

/** Everything the plan is decided from. */
type PlanFields = Pick<Doc<"profiles">, "plan" | "plan_until" | "comp_until">;

/** Whether a complimentary grant is live. Absent is none; a past date is spent. */
export function hasComp(profile: Pick<Doc<"profiles">, "comp_until">): boolean {
  const until = profile.comp_until;
  if (until === null || until === undefined) return false;
  return until > Date.now();
}

/** Whether a SUBSCRIPTION is live, ignoring any grant. */
export function hasSubscription(profile: Pick<Doc<"profiles">, "plan" | "plan_until">): boolean {
  if (profile.plan !== "pro" && profile.plan !== "business") return false;
  // Absent means "no end date known", which a live subscription has.
  if (profile.plan_until !== null && profile.plan_until !== undefined && profile.plan_until < Date.now()) {
    return false;
  }
  return true;
}

/**
 * Pro if either is true, and the two are read separately on purpose.
 *
 * A granted account and a paying one get the same product; they are not the
 * same thing to anybody looking at the books, and conflating them in storage
 * is how a free grant eventually gets counted as revenue.
 */
export function planOf(profile: PlanFields): Plan {
  /* A live subscription names its own tier, because that is what was paid
     for. A grant does not: `comp_until` is one date with no tier beside it,
     so it grants Pro and nothing more. Reading a tier out of a field that
     does not carry one is how a free grant quietly becomes the top plan. */
  if (hasSubscription(profile)) return profile.plan === "business" ? "business" : "pro";
  if (hasComp(profile)) return "pro";
  return "free";
}

/** True for Pro AND Business. The question almost every gate is asking. */
export function isPro(profile: PlanFields): boolean {
  return planOf(profile) !== "free";
}

/** True only for Business. For the handful of things Pro genuinely lacks. */
export function isBusiness(profile: PlanFields): boolean {
  return planOf(profile) === "business";
}

/**
 * Refuses with a message the UI turns into an upgrade prompt.
 *
 * The code is what the app matches on, not the wording. A gate whose
 * detection depends on prose breaks the first time somebody improves the
 * prose.
 */
export function requirePro(profile: PlanFields, what: string): void {
  if (isPro(profile)) return;
  fail(`${what} is part of Pro.`, "PRO_REQUIRED");
}

export function requireBusiness(profile: PlanFields, what: string): void {
  if (isBusiness(profile)) return;
  fail(`${what} is part of Business.`, "BUSINESS_REQUIRED");
}
