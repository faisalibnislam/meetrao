import { NextResponse, type NextRequest } from "next/server";

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
  const next = searchParams.get("next");
  const target = next?.startsWith("/") ? next : "/login";
  return NextResponse.redirect(new URL(target, origin));
}
