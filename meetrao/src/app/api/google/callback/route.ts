import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { saveConnection } from "@/lib/google/connection";
import { exchangeCode, fetchAccountEmail, hasCalendarWrite } from "@/lib/google/oauth";
import { supabaseServer } from "@/lib/supabase/server";

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

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  try {
    const tokens = await exchangeCode(code);

    // Google lets a user tick only some of the boxes. Without the write scope
    // the guest cannot be invited, which is the whole point of connecting.
    if (!hasCalendarWrite(tokens.scopes)) return back("scope");

    const accountEmail = await fetchAccountEmail(tokens.accessToken);

    await saveConnection({
      userId: user.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
      accountEmail,
    });

    return back();
  } catch {
    return back("failed");
  }
}
