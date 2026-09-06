import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { hasServiceRole, siteUrl } from "@/lib/env";
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

/**
 * `reason` is echoed into the URL, so it is restricted to the shape of a Google
 * error code — never free text, and never anything the caller supplied raw.
 */
function finish(returnPath: string, status: string, reason?: string) {
  const safeReason = reason && /^[a-z_]{1,40}$/.test(reason) ? reason : null;
  const query = safeReason
    ? `?calendar=${status}&reason=${safeReason}`
    : `?calendar=${status}`;

  const response = NextResponse.redirect(siteUrl(`${returnPath}${query}`));
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

  // The host declined, or Google refused. Google's own code is the only thing
  // that distinguishes "I clicked cancel" from "this app is in Testing and you
  // are not on the test-user list" (access_denied), so carry it through rather
  // than flattening every cause into one message.
  const googleError = params.get("error");
  if (googleError) {
    console.error("[google/callback] Google returned an error", {
      error: googleError,
      description: params.get("error_description"),
      userId: user.id,
    });
    return finish(returnPath, "denied", googleError);
  }

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  // A missing or mismatched state is a different problem from a refusal: the
  // ten-minute cookie expired, or third-party cookie blocking ate it. Saying
  // "allow calendar access" would send the host round the same loop forever.
  if (!code || !state || !expectedState || !constantTimeEquals(state, expectedState)) {
    console.error("[google/callback] state check failed", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasCookie: Boolean(expectedState),
      userId: user.id,
    });
    return finish(returnPath, "session");
  }

  try {
    const tokens = await exchangeCode(code);

    // Without a refresh token the connection dies at the first expiry, which
    // would look like a random failure days later. Treat it as a failed
    // connection now, so the host simply tries again.
    if (!tokens.refreshToken) {
      console.error("[google/callback] no refresh token returned", {
        scopes: tokens.scopes,
        userId: user.id,
      });
      return finish(returnPath, "norefresh");
    }

    // The connect route refuses to start without this, but a key removed
    // mid-flow would otherwise surface as an unexplained "something went
    // wrong" after the host has already granted access.
    if (!hasServiceRole()) {
      console.error(
        "[google/callback] SUPABASE_SERVICE_ROLE_KEY is not set; cannot store the connection",
      );
      return finish(returnPath, "unconfigured", "storage");
    }

    await saveConnection(user.id, tokens);
    return finish(returnPath, "connected");
  } catch (cause) {
    console.error("[google/callback] token exchange or save failed", cause);
    return finish(returnPath, "failed");
  }
}
