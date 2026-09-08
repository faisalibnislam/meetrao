import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { consentUrl } from "@/lib/google/oauth";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Starts the calendar consent flow. `state` is a one-time value stored in an
 * httpOnly cookie and compared on return, so a forged callback cannot attach
 * someone else's Google account to this session.
 */
export async function GET(request: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(new URL("/login", request.nextUrl.origin));

  const returnTo = request.nextUrl.searchParams.get("next") ?? "/settings/calendar";
  const nonce = randomBytes(16).toString("hex");
  const state = `${nonce}:${returnTo.startsWith("/") ? returnTo : "/settings/calendar"}`;

  const store = await cookies();
  store.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(consentUrl(state));
}
