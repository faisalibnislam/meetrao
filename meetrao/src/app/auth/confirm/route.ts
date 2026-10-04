import { NextResponse, type NextRequest } from "next/server";
import { safePath } from "@/lib/safe-path";

/**
 * Kept as a redirect, not deleted.
 *
 * This route existed to exchange a Supabase email link for a session. Convex
 * Auth verifies with a CODE that the reset and verify forms submit directly,
 * so there is nothing to exchange here any more, but links already sitting in
 * people's inboxes still point at this path, and a 404 is a worse answer than
 * sending them somewhere that can help.
 */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  return NextResponse.redirect(new URL(safePath(searchParams.get("next"), "/login"), origin));
}
