import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

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
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(siteUrl("/login?error=auth"));

  return NextResponse.redirect(siteUrl(next));
}
