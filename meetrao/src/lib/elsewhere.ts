/* ─────────────────────────────────────────────────────────────────────────────
   "You have none here" against "you have none at all".

   The pure half, deliberately apart from src/lib/data/elsewhere.ts. That one
   is `server-only` and reads cookies through next/headers; this one is
   imported by a CLIENT component, and a client component that reaches a
   server-only module is a build error rather than a type error, so the split
   is what keeps the two apart.
   ───────────────────────────────────────────────────────────────────────── */

export type Elsewhere = {
  /** null is Personal. Passed straight back to the context action. */
  id: string | null;
  name: string;
  count: number;
};

/** "You have 2 in Northwind. Those meetings belong to another workspace…" */
export function describeElsewhere(found: readonly Elsewhere[], what: string): string {
  const parts = found.map((f) => `${f.count} in ${f.name}`);
  const list =
    parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  const total = found.reduce((sum, f) => sum + f.count, 0);
  return `You have ${list}. ${
    total === 1 ? `That ${what} belongs` : `Those ${what}s belong`
  } to another workspace, so it is not shown here.`;
}

/**
 * Which OTHER workspaces hold some of these rows, busiest first.
 *
 * `rows` is the UNFILTERED set: whatever the screen would show if it ignored
 * the workspace. Handed the filtered set it always returns nothing, which
 * looks like a working feature that does nothing at all.
 *
 * Pure, and takes the workspace list rather than fetching it, so the counting
 * is testable without a database. The server wrapper in
 * src/lib/data/elsewhere.ts is only the fetch.
 */
export function countElsewhere(
  rows: readonly { company_id?: string | null }[],
  choices: readonly { id: string | null; name: string }[],
  companyId: string | null,
): Elsewhere[] {
  /* ONE place excludes the current workspace, and it is this line. Filtering
     the rows as well read as belt and braces and was neither: a row in the
     current workspace can never match another workspace's id, so the second
     filter did nothing except hide whether this one worked. */
  return choices
    .filter((c) => c.id !== companyId)
    .map((c) => ({ id: c.id, name: c.name, count: rows.filter((r) => (r.company_id ?? null) === c.id).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
