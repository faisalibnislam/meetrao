import "server-only";

import { contextChoices, type WorkContext } from "./context";
import { countElsewhere, type Elsewhere } from "@/lib/elsewhere";

export type { Elsewhere };

/* ─────────────────────────────────────────────────────────────────────────────
   "You have none here" against "you have none at all".

   Every company-scoped screen filters by the workspace in force, so somebody
   whose work all sits in their company sees an empty Personal screen. The
   empty state said "No meetings yet" with a Create button, which is a
   confident statement that they have nothing, and it is wrong: their meetings
   are one switch away. It reads as data loss, and it read that way to me
   before it read that way to anybody else.

   ONLY ASKED WHEN THE SCREEN IS EMPTY. This costs one more query, so it is
   not worth paying on every load of a screen that has rows on it. The caller
   decides.
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The other workspaces holding some of these rows, busiest first.
 *
 * `rows` is the UNFILTERED set: whatever the screen would have shown if it
 * ignored the workspace. Passing the filtered set would always return nothing,
 * which is the mistake this signature is shaped to make hard.
 */
export async function heldElsewhere(
  rows: readonly { company_id?: string | null }[],
  context: WorkContext,
): Promise<Elsewhere[]> {
  /* Purely to skip the query: countElsewhere returns [] for this case
     anyway, so nothing observable depends on it and no test can catch it
     going missing. It is here because the commonest account has one
     workspace and would otherwise pay for a lookup that finds nothing. */
  if (rows.every((r) => (r.company_id ?? null) === context.companyId)) return [];
  return countElsewhere(rows, await contextChoices(), context.companyId);
}
