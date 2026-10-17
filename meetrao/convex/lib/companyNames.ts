/* ─────────────────────────────────────────────────────────────────────────────
   One owner, one company per display name.

   WHY THIS EXISTS. The link name (the slug) has always been unique product
   wide, but the display name was not checked at all, so one owner ended up
   with "Harbour Studio" at /harbour-studio and "Harbour Studio" at /acme. Every
   place the app names a company by its name alone (the workspace switcher,
   the Companies chips, the toast after a save) then showed two identical
   rows, and the only way to tell them apart was to open each one.

   SCOPED TO THE OWNER, not product wide. Two unrelated agencies can both be
   called "Northwind"; nobody sees both lists. The confusion only exists
   inside one person's switcher, so that is where the rule applies.

   COMPARED TRIMMED AND CASE-INSENSITIVE, and runs of whitespace count as
   one, because "Harbour Studio", "harbour studio" and "Harbour  Studio " read as
   the same word in a 218px menu.

   A plain module with no Convex imports, so the rule can be unit-tested
   directly rather than only by reading the mutation's source.
   ───────────────────────────────────────────────────────────────────────────── */

/** The form two names are compared in. */
export function companyNameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The company among `others` that already uses `name`, or null.
 *
 * `exceptId` is the company being renamed, which is allowed to keep its own
 * name (or change only its capitalisation) without clashing with itself.
 */
export function clashingCompany<T extends { id: string; name: string }>(
  name: string,
  others: readonly T[],
  exceptId?: string,
): T | null {
  const key = companyNameKey(name);
  if (!key) return null;
  return others.find((c) => c.id !== exceptId && companyNameKey(c.name) === key) ?? null;
}

/** The refusal, worded once so create and rename say the same thing. */
export function duplicateNameMessage(existing: { name: string; slug: string }): string {
  return `You already have a company called ${existing.name} (/${existing.slug}). Give this one a different name.`;
}
