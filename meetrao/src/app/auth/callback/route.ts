import { NextResponse, type NextRequest } from "next/server";
import { sendWelcomeOnce } from "@/lib/email/welcome-once";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * OAuth return. Supabase Auth owns "Sign in with Google" and its callback is
 * registered in the Supabase dashboard; this is where Supabase sends the
 * browser afterwards, carrying a code to exchange for a session.
 *
 * A Google account arrives with a verified address, so it skips the
 * verification gate and goes straight to onboarding.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error_description") ?? searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const supabase = await supabaseServer();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(new URL("/login?error=sign-in-failed", origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(new URL("/login", origin));

  // The design's other trigger for the welcome mail. This route runs on every
  // Google sign-in, so the claim in sendWelcomeOnce is what makes it the first
  // one only.
  await sendWelcomeOnce(user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  const done = Boolean(profile?.onboarding_completed_at);
  return NextResponse.redirect(new URL(done ? "/dashboard" : "/onboarding/1", origin));
}
