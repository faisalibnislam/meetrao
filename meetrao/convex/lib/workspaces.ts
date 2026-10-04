/* ─────────────────────────────────────────────────────────────────────────────
   "You have none here" against "you have none at all".

   Every company-scoped screen filters by the workspace in force, so somebody
   whose work all sits in their company opens Personal and sees an empty
   screen. The empty state used to say "No meetings yet", which is a confident
   claim that they have nothing, and it reads exactly like deleted data.

   These counts are what lets the screen say where the rows actually are. They
   are computed HERE rather than in the Next layer because two of the three
   screens filter inside the query and never hand the unfiltered set out.

   NAMES ARE NOT RESOLVED HERE. A company id is all this returns; turning it
   into "Northwind" needs the caller's workspace list, which the Next layer
   already has for the switcher.
   ───────────────────────────────────────────────────────────────────────── */

export type WorkspaceCount = { company_id: string | null; count: number };

/**
 * How many of these rows sit in each workspace OTHER than the one in force.
 *
 * Absent and null both mean personal: every row written before companies
 * existed has neither, and `undefined === null` is false.
 */
export function countOtherWorkspaces(
  rows: readonly { company_id?: string | null }[],
  companyId: string | null,
): WorkspaceCount[] {
  const counts = new Map<string | null, number>();
  for (const r of rows) {
    const id = r.company_id ?? null;
    if (id === companyId) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()].map(([company_id, count]) => ({ company_id, count }));
}
