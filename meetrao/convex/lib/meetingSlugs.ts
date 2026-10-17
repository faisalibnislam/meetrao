/* ─────────────────────────────────────────────────────────────────────────────
   A meeting's link, and the links it used to have.

   WHY THERE IS A HISTORY AT ALL. A meeting's slug is the last segment of an
   address that hosts paste into email signatures, invoices and other people's
   calendars. Renaming "30 Minute Consultation" to "Intro call" and moving its
   link to /intro-call is the right thing for new guests, and it would 404
   every one of those pasted links if the old segment simply stopped existing.
   So the old slug is kept on the meeting (`previous_slugs`) and the public
   lookup resolves it to the meeting, and the page answers with a permanent
   redirect to the current address.

   WHY A PREVIOUS SLUG STILL COUNTS AS TAKEN. If another of the host's
   meetings could claim /30-minute-consultation, the old links would quietly
   start opening a different meeting. A guest who meant to book a paid
   consultation would land on somebody's free coffee chat, with nothing on the
   page to say why. So uniqueness is checked against every other meeting's
   current AND previous slugs. The meeting's OWN previous slugs are free to
   it: going back to an old link is the one move that cannot mislead anybody.

   Pure, and shared: Convex enforces it, the server action uses it to pick a
   free slug for a new meeting, and the editor uses it to say "taken" before
   the host presses Save. One rule in one place, because three copies of a
   uniqueness rule are three chances to disagree about it.
   ───────────────────────────────────────────────────────────────────────────── */

/** Letters, digits and single hyphens inside, 1 to 80 characters. */
export const MEETING_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

/**
 * How many old links one meeting remembers.
 *
 * Not a technical limit. It keeps a row bounded if something renames a
 * meeting in a loop, and fifty renames is far past anything a person does by
 * hand. Past it, the OLDEST link is the one forgotten, since it is the one
 * least likely to still be in circulation.
 */
export const MAX_PREVIOUS_SLUGS = 50;

/** What the slug rules need to know about a meeting. */
export type SlugHolder = {
  id: string;
  name: string;
  slug: string;
  previous_slugs?: readonly string[] | null;
};

/** How a slug is compared and stored: trimmed and lowercased. */
export function normaliseSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * What the Link field accepts as it is typed.
 *
 * Spaces and underscores become hyphens rather than vanishing, so typing
 * "intro call" gives "intro-call" and not "introcall". Anything else outside
 * the alphabet is dropped. A leading or trailing hyphen is left alone while
 * typing (removing it mid-word would fight the cursor) and is refused by
 * `slugProblem` instead.
 */
export function sanitiseSlugInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 80);
}

/** Why a slug cannot be used as typed, or null when its shape is fine. */
export function slugProblem(raw: string): string | null {
  const slug = normaliseSlug(raw);
  if (!slug) return "Give the meeting a link.";
  if (slug.length > 80) return "Keep the link to 80 characters or fewer.";
  if (/[^a-z0-9-]/.test(slug)) return "Use letters, numbers and hyphens only.";
  if (!MEETING_SLUG.test(slug)) return "The link can't start or end with a hyphen.";
  return null;
}

export type SlugClash = {
  /** The meeting already holding it. */
  meeting: SlugHolder;
  /** True when it is one of that meeting's OLD links, which still forward. */
  previous: boolean;
};

/**
 * Which other meeting already holds this slug, now or in its history.
 *
 * `selfId` is the meeting being saved, whose own history does not count
 * against it. Leave it out for a meeting that does not exist yet.
 */
export function slugClash(
  raw: string,
  meetings: readonly SlugHolder[],
  selfId?: string | null,
): SlugClash | null {
  const slug = normaliseSlug(raw);
  for (const m of meetings) {
    if (selfId && m.id === selfId) continue;
    if (m.slug === slug) return { meeting: m, previous: false };
  }
  for (const m of meetings) {
    if (selfId && m.id === selfId) continue;
    if ((m.previous_slugs ?? []).includes(slug)) return { meeting: m, previous: true };
  }
  return null;
}

/** The sentence a clash is refused with, naming the meeting that has it. */
export function clashMessage(clash: SlugClash): string {
  return clash.previous
    ? `That link used to belong to ${clash.meeting.name} and still forwards there. Pick another.`
    : `${clash.meeting.name} already uses that link. Pick another.`;
}

/**
 * The first free slug built from `base`: itself, then base-2, base-3...
 *
 * The suffix is fitted inside the 80-character limit rather than appended
 * past it, so a very long name still yields a slug that passes validation.
 */
export function uniqueSlug(base: string, meetings: readonly SlugHolder[], selfId?: string | null): string {
  const root = normaliseSlug(base) || "meeting";
  if (!slugClash(root, meetings, selfId)) return root;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const candidate = `${root.slice(0, 80 - suffix.length).replace(/-+$/, "")}${suffix}`;
    if (!slugClash(candidate, meetings, selfId)) return candidate;
  }
}

/**
 * The history a meeting carries after its slug moves from `from` to `to`.
 *
 * The old slug is remembered so links to it keep working. The new one is
 * taken OUT of the history when it was in it, because a meeting returning to
 * an old link is now answering at it directly and must not also redirect
 * from it to itself. Duplicates collapse, the newest is last, and only the
 * most recent MAX_PREVIOUS_SLUGS are kept.
 */
export function previousSlugsAfter(
  history: readonly string[] | null | undefined,
  from: string,
  to: string,
): string[] {
  const old = normaliseSlug(from);
  const next = normaliseSlug(to);
  const kept = (history ?? []).map(normaliseSlug).filter((s) => s && s !== next && s !== old);
  if (old && old !== next) kept.push(old);
  return [...new Set(kept)].slice(-MAX_PREVIOUS_SLUGS);
}

/**
 * The meeting a public address names, by its current slug or an old one.
 *
 * A current slug always wins over somebody's history, which is what keeps
 * this unambiguous even for rows written before the clash check existed.
 * `moved` is true when the address used an old slug, which is the page's cue
 * to redirect to the current one rather than render under a stale address.
 */
export function findBySlug<T extends SlugHolder>(
  meetings: readonly T[],
  raw: string,
): { meeting: T; moved: boolean } | null {
  const slug = normaliseSlug(raw);
  if (!slug) return null;
  const current = meetings.find((m) => m.slug === slug);
  if (current) return { meeting: current, moved: false };
  /* Most recently updated first would be a better tie-break than table order
     if two rows ever shared an old slug, but the clash check means they
     cannot, so the first match is the only match. */
  const moved = meetings.find((m) => (m.previous_slugs ?? []).includes(slug));
  return moved ? { meeting: moved, moved: true } : null;
}

/**
 * Where a public page should send a request that used an OLD slug, or null
 * when the slug it used is the meeting's current one.
 *
 * Convex resolves a meeting's previous links to the meeting itself and hands
 * back its current slug, so a renamed meeting's old address still finds it.
 * Serving the page there would leave guests, and search engines, on a stale
 * address forever; a permanent redirect moves them to the current one and
 * keeps every pasted link working. Case alone is not a move: /Intro-Call
 * has always reached /intro-call and still renders in place.
 *
 * `base` is everything before the slug, as the guest's browser sees it.
 */
export function movedTo(requested: string, meeting: { slug: string } | null, base: string): string | null {
  if (!meeting) return null;
  if (meeting.slug === normaliseSlug(requested)) return null;
  return `${base.replace(/\/+$/, "")}/${meeting.slug}`;
}
