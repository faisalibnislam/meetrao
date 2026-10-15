import "server-only";

import { ConvexHttpClient } from "convex/browser";
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Profile } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────────────────────
   Who is calling, for the iOS app's routes.

   The app signs in with Convex Auth exactly as the web does and holds the
   same short-lived Convex JWT, which it sends as `Authorization: Bearer`.
   Nothing is decided from the token here: it is handed to Convex, which
   verifies it, and the answer is the same whoami.session the web's
   requireSession reads, with the same gates (verified, has a profile, not
   suspended, onboarded).

   A bearer token rather than a cookie is also why these routes need no CSRF
   defence: a browser never attaches it on its own.
   ───────────────────────────────────────────────────────────────────────────── */

export type AppSession = { convex: ConvexHttpClient; profile: Profile };

export function appError(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function appSession(request: NextRequest): Promise<AppSession | NextResponse> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return appError(401, "Sign in again.");

  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return appError(500, "The server is not configured.");

  const convex = new ConvexHttpClient(url);
  convex.setAuth(token);

  let who;
  try {
    who = await convex.query(api.whoami.session, {});
  } catch {
    // An expired or forged token is refused by Convex itself.
    return appError(401, "Sign in again.");
  }
  if (!who.authenticated) return appError(401, "Sign in again.");
  if (!who.emailVerified) return appError(403, "Confirm your email address first.");

  const profile = who.profile as Profile | null;
  if (!profile) return appError(403, "This account has no profile.");
  if (profile.is_suspended) return appError(403, "This account is suspended.");
  if (!profile.onboarding_completed_at) return appError(403, "Finish setting up your account on meetrao.com first.");

  return { convex, profile };
}
