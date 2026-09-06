import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/env";
import { exchangeCode } from "@/lib/google/oauth";
import { saveConnection } from "@/lib/google/calendar";
import { createClient } from "@/lib/supabase/server";
import { OAUTH_RETURN_COOKIE, OAUTH_STATE_COOKIE } from "../connect/route";

function constantTimeEquals(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function finish(returnPath: string, status: "connected" | string) {
  const response = NextResponse.redirect(
    siteUrl(`${returnPath}?calendar=${status}`),
  );
  response.cookies.delete(OAUTH_STATE_COOKIE);
  response.cookies.delete(OAUTH_RETURN_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const returnPath =
    request.cookies.get(OAUTH_RETURN_COOKIE)?.value ?? "/settings/calendar";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(siteUrl("/login"));

  const params = request.nextUrl.searchParams;

  // The host declined, or Google refused.
  if (params.get("error")) return finish(returnPath, "denied");

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || !constantTimeEquals(state, expectedState)) {
    return finish(returnPath, "denied");
  }

  try {
    const tokens = await exchangeCode(code);

    // Without a refresh token the connection dies at the first expiry, which
    // would look like a random failure days later. Treat it as a failed
    // connection now, so the host simply tries again.
    if (!tokens.refreshToken) return finish(returnPath, "denied");

    await saveConnection(user.id, tokens);
    return finish(returnPath, "connected");
  } catch {
    return finish(returnPath, "failed");
  }
}
