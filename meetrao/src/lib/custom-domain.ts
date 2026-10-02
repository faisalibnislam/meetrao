/* ─────────────────────────────────────────────────────────────────────────────
   What a path means on a Pro host's own domain.

   Pure, and separate from src/proxy.ts, because the proxy cannot be unit
   tested without Next's middleware machinery and this is the part with all the
   decisions in it.

   THE SHAPE A HOST ASKS FOR IS `meeting.example.com/alex`. That is the link
   they will put in a signature, so it has to work — and so does the bare
   domain, which is what somebody types when they half-remember the link. Both
   resolve to the same page; neither redirects to the other, because a redirect
   between two URLs a host advertises is a flicker for no gain.

   ONE DOMAIN, ONE ACCOUNT. `meeting.example.com/someone-else` is not a door
   into another host's page: the first segment is either this domain's owner or
   it is read as one of their meeting slugs, and a slug that does not exist is
   a 404. A guest cannot enumerate the product from somebody's custom domain.
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Paths that mean the same thing on every host.
 *
 * `/booking/<ref>` is in here because a guest's confirmation link is built
 * from the site URL and may be followed on the custom domain; the other
 * entries are the product's own plumbing and its legal pages, which a host's
 * domain serves unchanged rather than hiding.
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

/** Exact paths, not prefixes — a meeting could legitimately be slugged "help". */
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

/**
 * The path to serve, or null to serve the request's own path unchanged.
 *
 * Takes the username rather than looking it up: the lookup is a network call
 * and belongs to the caller, so everything here can be decided in a test.
 */
export function rewriteForDomain(pathname: string, username: string): string | null {
  const owner = username.trim().toLowerCase();
  if (!owner) return null;

  if (isShared(pathname)) return null;

  /* The advertised shape. Already correct, so it is served as-is and the
     browser's address bar keeps the link the host handed out.

     Case-insensitively, because a username in an email signature gets
     capitalised by a phone keyboard, and `/Alex` has to reach Alex. */
  const first = pathname.split("/")[1] ?? "";
  if (first.toLowerCase() === owner) return null;

  // The bare domain. Serve the owner's page without changing the URL.
  if (pathname === "/" || pathname === "") return `/${username}`;

  /* Anything else is read as one of the owner's meeting slugs, so
     `meeting.example.com/intro` is the short link to their intro call. If it
     is not a slug of theirs the page 404s, which is also what stops this
     being a way to reach another account. */
  return `/${username}${pathname}`;
}
