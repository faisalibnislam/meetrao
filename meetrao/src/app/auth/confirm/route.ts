import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { sendWelcomeOnce } from "@/lib/email/welcome-once";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * The emailed link lands here — confirmation after sign-up, and the password
 * reset link. It is the link itself that verifies; the /verify screen is only
 * what the user looks at while waiting for it.
 *
 * Supabase sends either a `token_hash` + `type` pair or a PKCE `code`,
 * depending on the project's email template, so both are handled.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  const supabase = await supabaseServer();
  let ok = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(new URL("/verify?expired=1", origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // "Email confirmed" is the design's trigger for the welcome mail, and this
  // is that moment. Claimed, so the password-reset link through here cannot
  // send a second one.
  if (user) await sendWelcomeOnce(user.id);

  if (next && next.startsWith("/")) {
    return NextResponse.redirect(new URL(next, origin));
  }

  if (!user) return NextResponse.redirect(new URL("/login", origin));

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.redirect(
    new URL(profile?.onboarding_completed_at ? "/dashboard" : "/onboarding/1", origin),
  );
}
