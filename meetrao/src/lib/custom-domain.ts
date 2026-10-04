/* ─────────────────────────────────────────────────────────────────────────────
   What a path means on a company's own domain.

   Pure, and separate from src/proxy.ts, because the proxy cannot be unit
   tested without Next's middleware machinery and this is the part with all the
   decisions in it.

   THE SHAPE SOMEBODY ADVERTISES IS `meet.acme.com/sarah/intro`. Every link
   names a specific meeting: there is no page that lists them, here or on
   meetrao.com, so the bare domain and the bare handle both 404.

   HANDLES, NOT USERNAMES. `sarah` is who Sarah is INSIDE THIS COMPANY, which
   is not necessarily her meetrao.com username: usernames are global and first
   come first served, so a company cannot be promised one. The proxy hands in
   the company's own list and this file resolves against it.

   A PATH THAT IS NOT ONE OF THIS COMPANY'S HANDLES IS A 404, and that is the
   security property rather than a nicety. Resolving an arbitrary username here
   would serve a stranger's booking page under somebody else's logo, and would
   make any custom domain a way to enumerate every host on the product.
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Paths that mean the same thing on every host.
 *
 * `/booking/<ref>` is in here because a guest's confirmation link is built
 * from the site URL and may be followed on the custom domain; the other
 * entries are the product's own plumbing and its legal pages, which a
 * company's domain serves unchanged rather than hiding.
 */
const SHARED_PREFIXES = [
  "/booking",
  "/team",
  "/embed",
  "/api",
  "/_next",
  "/brand",
  "/terms",
  "/privacy",
  "/support",
  "/auth",
];

/** Exact paths, not prefixes. A meeting could legitimately be slugged "help". */
const SHARED_EXACT = new Set([
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
  "/manifest.webmanifest",
]);

function isShared(pathname: string): boolean {
  if (SHARED_EXACT.has(pathname)) return true;
  // Next serves its app icons at /icon.png, /icon1.png, /apple-icon.png.
  if (/^\/(icon|apple-icon|opengraph-image|twitter-image)/.test(pathname)) return true;
  return SHARED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** One person on a company's domain: the name in the path, and who that is. */
export type DomainHandle = { handle: string; username: string };

export type DomainRoute =
  /** Serve this path instead, without changing the address bar. */
  | { kind: "rewrite"; path: string }
  /** Serve the request's own path unchanged. */
  | { kind: "pass" }
  /** Nothing here. The bare domain, a stranger's name, a missing meeting. */
  | { kind: "notFound" };

/**
 * What to do with a path arriving on a company's domain.
 *
 * Takes the handles rather than looking them up: the lookup is a network call
 * and belongs to the caller, so everything here can be decided in a test.
 */
export function routeForDomain(pathname: string, handles: readonly DomainHandle[]): DomainRoute {
  if (isShared(pathname)) return { kind: "pass" };

  const segments = pathname.split("/").filter(Boolean);

  /* The bare domain. There is no index page to show: the product has no
     "all meetings" page on any domain, so there is nothing here that is not
     one person's specific meeting. */
  if (segments.length === 0) return { kind: "notFound" };

  /* Case-insensitively, because a handle in an email signature gets
     capitalised by a phone keyboard and `/Sarah/intro` has to reach Sarah. */
  const first = segments[0].toLowerCase();
  const who = handles.find((h) => h.handle.toLowerCase() === first);

  // Not one of this company's people. Never a door to another account.
  if (!who) return { kind: "notFound" };

  // A handle on its own used to list that person's meetings. It no longer does.
  if (segments.length === 1) return { kind: "notFound" };

  // Anything deeper than /<handle>/<meeting> is not a shape this product has.
  if (segments.length > 2) return { kind: "notFound" };

  return { kind: "rewrite", path: `/${who.username}/${segments[1]}` };
}
