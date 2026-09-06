import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildConsentUrl } from "@/lib/google/oauth";
import { hasGoogleCredentials, hasServiceRole, siteUrl } from "@/lib/env";
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

  const back = safeReturnPath(request.nextUrl.searchParams.get("next"));

  if (!hasGoogleCredentials()) {
    return NextResponse.redirect(siteUrl(`${back}?calendar=unconfigured`));
  }

  // Checked BEFORE the round trip to Google, not after. calendar_connections is
  // reachable only by the service role, so without that key the tokens cannot
  // be stored — and sending the host through consent first means they grant
  // access, come back, and are told it failed for no reason they can see.
  if (!hasServiceRole()) {
    console.error(
      "[google/connect] SUPABASE_SERVICE_ROLE_KEY is not set; refusing to start consent",
    );
    return NextResponse.redirect(
      siteUrl(`${back}?calendar=unconfigured&reason=storage`),
    );
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
  response.cookies.set(OAUTH_RETURN_COOKIE, back, cookieOptions);

  return response;
}
