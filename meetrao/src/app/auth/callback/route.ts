import { NextResponse, type NextRequest } from "next/server";
import { applyDetectedTimezone } from "@/lib/data/timezone";
import { sendWelcomeOnce } from "@/lib/email/welcome-once";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/**
 * OAuth return.
 *
 * Convex Auth owns "Sign in with Google", and its callback is on the CONVEX
 * deployment's own origin, not here. By the time the browser reaches this
 * route the exchange is done and the session cookie is set; what is left is
 * the app-side housekeeping that used to share the handler.
 *
 * A Google account arrives with a verified address, so it skips the
 * verification gate and goes straight to onboarding.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  /* No `code` is read. Convex Auth exchanged it on its own origin before the
     browser got here; an error is the only parameter still worth anything. */
  const error = searchParams.get("error_description") ?? searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, origin));
  }

  /* Convex Auth completed the exchange on its own HTTP route before
     redirecting here, so by this point the session cookie is already set and
     there is no code left to exchange. What remains is the app-side
     housekeeping that used to share this handler. */
  const convex = await convexServer();
  const who = await convex.query(api.whoami.identity, {});
  if (!who.authenticated || !who.resolvedUserId) {
    return NextResponse.redirect(new URL("/login", origin));
  }
  const user = { id: who.resolvedUserId };

  // The design's other trigger for the welcome mail. This route runs on every
  // Google sign-in, so the claim in sendWelcomeOnce is what makes it the first
  // one only.
  // A Google sign-up carries no form, so the zone detected before the redirect
  // comes back on the return URL. Only applied while the host has not chosen
  // one themselves.
  await applyDetectedTimezone(user.id, searchParams.get("tz"));

  await sendWelcomeOnce(user.id);

  const profile = await convex.query(api.profiles.current, {});
  const done = Boolean(profile?.onboarding_completed_at);
  return NextResponse.redirect(new URL(done ? "/dashboard" : "/onboarding/1", origin));
}
