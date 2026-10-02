import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { redirectUri } from "@/lib/google/oauth";

/**
 * Where Google returns after the calendar consent screen.
 *
 * Every failure lands back on the screen that started the flow with a
 * `calendar=` reason, so the design's red "Couldn't connect to Google" panel
 * always has something true to say.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const store = await cookies();
  const expected = store.get("google_oauth_state")?.value ?? null;
  store.delete("google_oauth_state");

  const state = searchParams.get("state");
  const returnTo = state?.includes(":") ? state.slice(state.indexOf(":") + 1) : "/settings/calendar";
  const back = (reason?: string) =>
    NextResponse.redirect(
      new URL(`${returnTo.startsWith("/") ? returnTo : "/settings/calendar"}${reason ? `?calendar=${reason}` : "?calendar=connected"}`, origin),
    );

  if (!state || !expected || state !== expected) return back("state");
  if (searchParams.get("error")) return back("denied");

  const code = searchParams.get("code");
  if (!code) return back("denied");

  const convex = await convexServer();
  const who = await convex.query(api.whoami.identity, {});
  if (!who.authenticated) return NextResponse.redirect(new URL("/login", origin));

  /* The code is exchanged INSIDE Convex, so the refresh token is created and
     stored without ever passing through this process. The code is single-use,
     arrives via our own registered redirect URI, and the caller is signed in,
     so the tokens can only attach to their own account.

     `missing-scope` is its own answer because Google lets a user tick only
     some of the boxes, and without the write scope the guest cannot be
     invited, which is the whole point of connecting. */
  const r = await convex.action(api.google.completeConnect, { code, redirectUri: redirectUri() });
  if (!r.ok) return back(r.reason === "missing-scope" ? "scope" : "failed");
  return back();
}
