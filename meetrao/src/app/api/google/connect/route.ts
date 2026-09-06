import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildConsentUrl } from "@/lib/google/oauth";
import { hasGoogleCredentials, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const OAUTH_STATE_COOKIE = "meetrao_google_state";
export const OAUTH_RETURN_COOKIE = "meetrao_google_return";

/** Where to send the host back to once Google is done. */
function safeReturnPath(raw: string | null): string {
  // Only same-origin absolute paths — never an attacker-supplied URL.
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/settings/calendar";
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(siteUrl("/login"));
  }

  if (!hasGoogleCredentials()) {
    const back = safeReturnPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(siteUrl(`${back}?calendar=unconfigured`));
  }

  // Random state held in an httpOnly cookie and compared on the way back —
  // this is what stops a forged callback from binding someone else's calendar.
  const state = randomBytes(32).toString("hex");
  const response = NextResponse.redirect(buildConsentUrl(state));

  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // ten minutes to complete consent
  };

  response.cookies.set(OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(
    OAUTH_RETURN_COOKIE,
    safeReturnPath(request.nextUrl.searchParams.get("next")),
    cookieOptions,
  );

  return response;
}
