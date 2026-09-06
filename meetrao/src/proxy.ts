import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes that require a session. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/bookings",
  "/meetings",
  "/availability",
  "/settings",
  "/onboarding",
  "/admin",
];

/** Routes a signed-in user should be bounced away from. */
const AUTH_ROUTES = ["/login", "/signup", "/forgot"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without credentials there is no session to refresh; let the page render and
  // surface the configuration error itself rather than 500-ing in middleware.
  if (!supabaseUrl || !supabaseAnonKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refreshes the auth token and writes the rotated cookies onto `response`.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. The public booking
     * routes (/:username) do pass through — they need no session, but running
     * the refresh keeps a signed-in host's cookies fresh while they preview.
     */
    "/((?!_next/static|_next/image|favicon.ico|assets|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|otf|ttf|woff2?)$).*)",
  ],
};
