import { fail } from "./errors";
import type { Doc } from "../_generated/dataModel";

/* ─────────────────────────────────────────────────────────────────────────────
   Free and Pro.

   ONE FUNCTION DECIDES. Everything that gates a feature asks `isPro`, so
   there is a single answer to "is this account paid" and a single place to
   change what that means. A plan read from three places is a plan that
   disagrees with itself the first time somebody's card fails.

   A cancelled subscription keeps Pro until the period it was paid for runs
   out — that is what `plan_until` is for. Somebody who cancels on day two of
   a year they paid for has not stopped being a customer.
   ───────────────────────────────────────────────────────────────────────────── */

export type Plan = "free" | "pro";

export function planOf(profile: Pick<Doc<"profiles">, "plan" | "plan_until">): Plan {
  if (profile.plan !== "pro") return "free";
  // Absent means "no end date known", which a live subscription has.
  if (profile.plan_until !== null && profile.plan_until !== undefined && profile.plan_until < Date.now()) {
    return "free";
  }
  return "pro";
}

export function isPro(profile: Pick<Doc<"profiles">, "plan" | "plan_until">): boolean {
  return planOf(profile) === "pro";
}

/**
 * Refuses with a message the UI turns into an upgrade prompt.
 *
 * The code is what the app matches on, not the wording — a gate whose
 * detection depends on prose breaks the first time somebody improves the
 * prose.
 */
export function requirePro(profile: Pick<Doc<"profiles">, "plan" | "plan_until">, what: string): void {
  if (isPro(profile)) return;
  fail(`${what} is part of Pro.`, "PRO_REQUIRED");
}
