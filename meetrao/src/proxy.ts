import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/* ─────────────────────────────────────────────────────────────────────────────
   Proxy (Middleware, renamed in Next.js 16).

   Two jobs: refresh the Supabase session cookie on every request, and make the
   obvious redirects immediately rather than after a render.

   This is an optimistic check, not the boundary. Every authenticated layout,
   server action and route handler re-checks the session and the verification
   gate for itself — a proxy-only gate is a convenience.
   ───────────────────────────────────────────────────────────────────────────── */

/** Signed-in-only areas. Everything else is public or handles its own gate. */
const PRIVATE_PREFIXES = ["/dashboard", "/bookings", "/meetings", "/availability", "/settings", "/admin", "/onboarding"];

/** Signed-out-only. A signed-in visitor is sent on to the app. */
const AUTH_PAGES = ["/login", "/signup", "/forgot"];

/**
 * An OAuth code that landed on the site root instead of `/auth/callback`.
 *
 * Supabase only honours a `redirectTo` that matches its redirect allow-list.
 * When it does not match, Supabase does not fail — it quietly substitutes the
 * project's Site URL, which is a bare origin with no path. The browser then
 * arrives at `/` carrying `?code=…`, the landing page renders, the code is
 * never exchanged, and sign-in appears to do nothing at all.
 *
 * The real fix is the allow-list, and it is written up in README.md. This
 * forwards the code to the route that knows what to do with it, so a
 * misconfigured allow-list degrades to a working sign-in rather than a silent
 * dead end.
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

export async function proxy(request: NextRequest) {
  const stranded = strandedAuthCode(request);
  if (stranded) return NextResponse.redirect(stranded);

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser(), not getSession(): this revalidates the token with Supabase
  // rather than trusting a cookie the browser could have written.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPrivate = PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && isPrivate) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.searchParams.set("next", path);
    return NextResponse.redirect(to);
  }

  if (user) {
    // Google sign-up arrives verified and skips the gate. An email sign-up
    // that has not confirmed cannot reach any product screen.
    const verified = Boolean(user.email_confirmed_at ?? user.confirmed_at);

    if (!verified && isPrivate) {
      const to = request.nextUrl.clone();
      to.pathname = "/verify";
      return NextResponse.redirect(to);
    }

    if (AUTH_PAGES.includes(path)) {
      const to = request.nextUrl.clone();
      to.pathname = verified ? "/dashboard" : "/verify";
      to.search = "";
      return NextResponse.redirect(to);
    }

    if (path === "/verify" && verified) {
      const to = request.nextUrl.clone();
      to.pathname = "/onboarding/1";
      return NextResponse.redirect(to);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /* Everything except static assets and image files. The public booking page
       is matched too — it has no session, but the cookie refresh is harmless
       and keeps a signed-in host's own header correct while previewing. */
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
