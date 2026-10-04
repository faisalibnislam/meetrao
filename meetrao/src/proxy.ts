import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { routeForDomain, type DomainHandle } from "@/lib/custom-domain";

/* ─────────────────────────────────────────────────────────────────────────────
   Proxy (Middleware, renamed in Next.js 16).

   Two jobs: keep the Convex Auth session cookie fresh, and make the obvious
   redirects immediately rather than after a render.

   This is an optimistic check, not the boundary. Every authenticated layout,
   server action and route handler re-checks the session and the verification
   gate for itself. A proxy-only gate is a convenience.

   ONE THING IT DELIBERATELY DOES NOT DO: the verification gate. Convex Auth
   does not put verification state in the token, so this file cannot see it,
   and guessing would either let unverified users through or trap verified
   ones. That gate lives entirely in src/lib/data/session.ts, which reads the
   profile anyway, and that was always the real boundary. The cost is one
   extra redirect for an unverified user, on a path they take once.
   ───────────────────────────────────────────────────────────────────────────── */

/** Signed-in-only areas. Everything else is public or handles its own gate. */
const PRIVATE_PREFIXES = ["/dashboard", "/bookings", "/meetings", "/availability", "/settings", "/admin", "/onboarding"];

/* THE PROXY NEVER REDIRECTS AWAY FROM AN AUTH PAGE, and that is deliberate.

   It used to send a signed-in visitor from /login to /dashboard. That is a
   convenience, and it was one half of a redirect loop that took the live site
   down for signed-in users with ERR_TOO_MANY_REDIRECTS:

     /dashboard  the page asks Convex through requireSession, is told the token
                 is not good, and redirects to /login
     /login      the proxy asks Convex too, is told it IS good, and redirects
                 back to /dashboard

   Both sides call Convex, so "just ask the server" does not settle it. They
   disagree because the middleware refreshes the token and validates the FRESH
   one, while the page render reads the stale cookie from the original request
  , so a session whose access token has expired while its refresh token is
   still good can sit in exactly this gap.

   Sending an already-signed-in person to a login form is a small, visible,
   self-correcting oddity. A redirect loop is a blank page and a dead product.
   The gate that matters, keeping signed-OUT visitors out of private screens,
   is below and is unaffected, and every private screen re-checks for itself
   anyway. */

/**
 * The ONLY route where a `?code=` belongs to Convex Auth.
 *
 * Google sign-in is the single OAuth flow in this app: Convex redeems the
 * provider's code on its own domain and sends the browser here with an auth
 * code for the middleware to exchange. `strandedAuthCode` below forwards a
 * code that lands on `/` to this same route before the middleware runs, so
 * this one entry covers both.
 *
 * Everything else carrying a `?code=` redeems it ITSELF and must be left
 * alone, see the note where this is used.
 */
const AUTH_CODE_ROUTE = "/auth/callback";

/**
 * An OAuth code that landed on the site root instead of `/auth/callback`.
 *
 * A provider that cannot match its configured redirect may fall back to the
 * bare site origin with no path. The browser then arrives at `/` carrying
 * `?code=…`, the landing page renders, the code is never exchanged, and
 * sign-in appears to do nothing at all.
 *
 * The real fix is always the provider's allow-list. This forwards the code to
 * the route that knows what to do with it, so a misconfigured one degrades to
 * a working sign-in rather than a silent dead end.
 *
 * Deliberately narrow: only the site root, and only when nothing else claims
 * the parameter. `/api/google/callback` carries its own `code` for Calendar
 * consent and must never be touched by this.
 */
function strandedAuthCode(request: NextRequest): URL | null {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/") return null;

  const code = searchParams.get("code");
  const error = searchParams.get("error") ?? searchParams.get("error_description");
  if (!code && !error) return null;

  const to = request.nextUrl.clone();
  to.pathname = "/auth/callback";
  return to;
}

/* Built on first use, not at module load. The import pulls in Next's
   middleware machinery, which is not resolvable outside a Next build, so a
   static one breaks the unit tests that import this file. */
let convexProxy: ((request: NextRequest, event: NextFetchEvent) => Promise<unknown>) | null = null;

async function convexProxyOnce() {
  if (convexProxy) return convexProxy;
  const { convexAuthNextjsMiddleware } = await import("@convex-dev/auth/nextjs/server");
  convexProxy = convexAuthNextjsMiddleware(
    async (request, { convexAuth }) => {
      const path = request.nextUrl.pathname;
      const isPrivate = PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
      if (!isPrivate) return undefined;

      /* THE COOKIE, NOT A QUERY. `isAuthenticated()` is a round trip to
         Convex, and it ran on every request carrying a session, public pages
         and API routes included, before anything else could start: a whole
         cross-region hop added to every signed-in navigation, to answer a
         question only private paths ask.

         By this point the middleware has already refreshed a token near
         expiry and cleared the cookies when that failed, so a token here is
         one Convex issued and has not expired. The only case the query would
         add is a session revoked elsewhere, and requireSession catches that
         on the page, which was always the boundary. */
      const signedIn = Boolean(await convexAuth.getToken());

      if (!signedIn) {
        const to = request.nextUrl.clone();
        to.pathname = "/login";
        to.searchParams.set("next", path);
        return NextResponse.redirect(to);
      }
      return undefined;
    },
    {
      /* AN ALLOW-LIST, NOT A DENY-LIST, and that distinction is the whole
         lesson here.

         Convex Auth claims EVERY `?code=` it sees. The option defaults to
         undefined, which means "handle all of them". When redemption fails it
         deletes the parameter AND CLEARS THE AUTH COOKIES on the way past (see
         the package's server/request.js). So any route that carries a code of
         its own loses it before the page can read it, and signs the visitor
         out for good measure.

         Three routes in this app carry a code that is not an auth code, and
         each one redeems it itself:

           /api/google/callback   Google Calendar consent, exchanged in Convex
           /verify                the emailed confirmation code
           /reset                 the emailed password-reset code

         The first version of this named only the calendar callback and let
         everything else through. That fixed connecting a calendar and left
         sign-up and password reset broken in exactly the same way, a real
         person's confirmation link arrived correct, lost its code here, and
         landed on a page telling them they had not confirmed. Naming what may
         be claimed is the only version that does not need extending every
         time a route starts carrying a code. */
      shouldHandleCode: (request) => request.nextUrl.pathname === AUTH_CODE_ROUTE,
    },
  ) as unknown as (request: NextRequest, event: NextFetchEvent) => Promise<unknown>;
  return convexProxy;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Custom domains.

   A Pro host can point meeting.acme.com at us. The request arrives with their
   host header and a path that may or may not already name them, so what the
   path means is decided by rewriteForDomain in src/lib/custom-domain.ts,
   which is pure and tested, and which this file only has to call.

   The short of it: `meeting.acme.com/sarah/intro` serves Sarah's intro call,
   where `sarah` is who she is inside THAT company; the bare domain and a bare
   handle are both 404, because this product has no page that lists somebody's
   meetings; and the shared paths, a guest's /booking/<ref> link, the legal
   pages, the plumbing, are served unchanged.

   REWRITE, NEVER REDIRECT. A redirect would bounce the guest to
   meetrao.com/<username>, which is the opposite of what the host paid for.

   The lookup is a Convex query on every request to an unknown host, which is
   why it runs LAST (after the known hosts are excluded) and why the result
   is cached per hostname for the life of the edge instance. A domain that has
   just been verified may take a minute to start working; a domain that has
   just been removed may take a minute to stop.
   ───────────────────────────────────────────────────────────────────────────── */

const KNOWN_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** Hostname → who answers it, or null for "not one of ours". Short-lived. */
type DomainOwner = { company: string | null; handles: DomainHandle[] };
const domainCache = new Map<string, { owner: DomainOwner | null; at: number }>();
const DOMAIN_TTL = 60_000;

function isOwnHost(hostname: string): boolean {
  if (KNOWN_HOSTS.has(hostname)) return true;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  try {
    const own = new URL(site).hostname;
    // The apex and any subdomain of it, previews included.
    return hostname === own || hostname.endsWith(".vercel.app") || hostname.endsWith(`.${own}`);
  } catch {
    return false;
  }
}

async function ownerForDomain(hostname: string): Promise<DomainOwner | null> {
  const cached = domainCache.get(hostname);
  if (cached && Date.now() - cached.at < DOMAIN_TTL) return cached.owner;

  const base = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!base) return null;

  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "publicBooking:hostForDomain", args: { domain: hostname }, format: "json" }),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      status?: string;
      value?: { company?: string | null; handles?: DomainHandle[] } | null;
    };
    const value = json.status === "success" ? (json.value ?? null) : null;
    const owner: DomainOwner | null = value?.handles
      ? { company: value.company ?? null, handles: value.handles }
      : null;
    domainCache.set(hostname, { owner, at: Date.now() });
    return owner;
  } catch {
    // A lookup that fails must not take the site down for everyone else.
    return null;
  }
}

/* `event` is optional so the existing tests can call proxy(request) alone;
   Next always supplies it in production, and the Convex middleware needs it. */
export async function proxy(request: NextRequest, event?: NextFetchEvent): Promise<NextResponse> {
  const stranded = strandedAuthCode(request);
  if (stranded) return NextResponse.redirect(stranded);

  const hostname = request.nextUrl.hostname;
  if (!isOwnHost(hostname)) {
    const owner = await ownerForDomain(hostname);
    if (owner) {
      const route = routeForDomain(request.nextUrl.pathname, owner.handles, owner.company);

      if (route.kind === "rewrite") {
        const url = request.nextUrl.clone();
        url.pathname = route.path;
        return NextResponse.rewrite(url);
      }

      /* A 404 rendered rather than a redirect home. Somebody holding an old
         link should be told there is nothing here, on the domain they typed,
         not bounced to a page that says nothing about why. */
      if (route.kind === "notFound") {
        const url = request.nextUrl.clone();
        url.pathname = "/_not-found";
        return NextResponse.rewrite(url, { status: 404 });
      }

      /* "pass" means the path already says what it means on this domain: a
         guest's booking link, a legal page, the plumbing. It falls through to
         the session refresh like any other request. */
    }
  }

  const handled = await (await convexProxyOnce())(request, event as NextFetchEvent);
  return (handled as NextResponse | undefined) ?? NextResponse.next({ request });
}

export const config = {
  matcher: [
    /* Everything except static assets and image files. The public booking page
       is matched too. It has no session, but the cookie refresh is harmless
       and keeps a signed-in host's own header correct while previewing.

       Next serves the app icons as /icon.png, /icon1.png and /apple-icon.png,
       so the extension rule below already excludes them, no session refresh
       to hand back a 32px PNG. */
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
