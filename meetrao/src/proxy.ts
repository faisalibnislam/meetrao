import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

/* ─────────────────────────────────────────────────────────────────────────────
   Proxy (Middleware, renamed in Next.js 16).

   Two jobs: keep the Convex Auth session cookie fresh, and make the obvious
   redirects immediately rather than after a render.

   This is an optimistic check, not the boundary. Every authenticated layout,
   server action and route handler re-checks the session and the verification
   gate for itself — a proxy-only gate is a convenience.

   ONE THING IT DELIBERATELY DOES NOT DO: the verification gate. Convex Auth
   does not put verification state in the token, so this file cannot see it,
   and guessing would either let unverified users through or trap verified
   ones. That gate lives entirely in src/lib/data/session.ts, which reads the
   profile anyway — and that was always the real boundary. The cost is one
   extra redirect for an unverified user, on a path they take once.
   ───────────────────────────────────────────────────────────────────────────── */

/** Signed-in-only areas. Everything else is public or handles its own gate. */
const PRIVATE_PREFIXES = ["/dashboard", "/bookings", "/meetings", "/availability", "/settings", "/admin", "/onboarding"];

/** Signed-out-only. A signed-in visitor is sent on to the app. */
const AUTH_PAGES = ["/login", "/signup", "/forgot"];

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
 * alone — see the note where this is used.
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
  const { convexAuthNextjsMiddleware, nextjsMiddlewareRedirect } = await import(
    "@convex-dev/auth/nextjs/server"
  );
  convexProxy = convexAuthNextjsMiddleware(
    async (request, { convexAuth }) => {
      const path = request.nextUrl.pathname;
      const isPrivate = PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
      const authed = await convexAuth.isAuthenticated();

      if (!authed && isPrivate) {
        const to = request.nextUrl.clone();
        to.pathname = "/login";
        to.searchParams.set("next", path);
        return NextResponse.redirect(to);
      }
      if (authed && AUTH_PAGES.includes(path)) return nextjsMiddlewareRedirect(request, "/dashboard");
      return undefined;
    },
    {
      /* AN ALLOW-LIST, NOT A DENY-LIST, and that distinction is the whole
         lesson here.

         Convex Auth claims EVERY `?code=` it sees — the option defaults to
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
         sign-up and password reset broken in exactly the same way — a real
         person's confirmation link arrived correct, lost its code here, and
         landed on a page telling them they had not confirmed. Naming what may
         be claimed is the only version that does not need extending every
         time a route starts carrying a code. */
      shouldHandleCode: (request) => request.nextUrl.pathname === AUTH_CODE_ROUTE,
    },
  ) as unknown as (request: NextRequest, event: NextFetchEvent) => Promise<unknown>;
  return convexProxy;
}

/* `event` is optional so the existing tests can call proxy(request) alone;
   Next always supplies it in production, and the Convex middleware needs it. */
export async function proxy(request: NextRequest, event?: NextFetchEvent): Promise<NextResponse> {
  const stranded = strandedAuthCode(request);
  if (stranded) return NextResponse.redirect(stranded);

  const handled = await (await convexProxyOnce())(request, event as NextFetchEvent);
  return (handled as NextResponse | undefined) ?? NextResponse.next({ request });
}

export const config = {
  matcher: [
    /* Everything except static assets and image files. The public booking page
       is matched too — it has no session, but the cookie refresh is harmless
       and keeps a signed-in host's own header correct while previewing.

       Next serves the app icons as /icon.png, /icon1.png and /apple-icon.png,
       so the extension rule below already excludes them — no session refresh
       to hand back a 32px PNG. */
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
