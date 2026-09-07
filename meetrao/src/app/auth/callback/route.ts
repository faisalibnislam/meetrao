import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { sendWelcome } from "@/lib/email/messages";

/**
 * Lands the Supabase OAuth / email-link redirect: swaps the code for a session
 * and forwards on. A brand-new Google user has no completed onboarding, so the
 * (app) layout will bounce them into it.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const rawNext = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (!code) return NextResponse.redirect(siteUrl("/login?error=auth"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(siteUrl("/login?error=auth"));

  // Welcome fires on the user's FIRST session — a Google signup, or an email
  // confirmation link. Detected by created_at and last_sign_in_at being the
  // same moment, which is true only once; without that guard this route would
  // send a welcome on every Google sign-in. The send is also idempotency-keyed
  // on the address, so a race between here and the signup action sends one.
  const user = data?.user;
  if (user?.email && isFirstSession(user.created_at, user.last_sign_in_at)) {
    const meta = (user.user_metadata ?? {}) as {
      full_name?: string;
      name?: string;
    };
    await sendWelcome({
      fullName: meta.full_name ?? meta.name ?? "",
      email: user.email,
      username: user.email.split("@")[0],
    });
  }

  return NextResponse.redirect(siteUrl(next));
}

/** True when this sign-in is the account's first — within a minute of creation. */
function isFirstSession(createdAt?: string, lastSignInAt?: string | null): boolean {
  if (!createdAt || !lastSignInAt) return false;
  const delta = Math.abs(
    new Date(lastSignInAt).getTime() - new Date(createdAt).getTime(),
  );
  return Number.isFinite(delta) && delta < 60_000;
}
