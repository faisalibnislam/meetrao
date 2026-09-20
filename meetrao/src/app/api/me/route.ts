import { NextResponse } from "next/server";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { accountFrom } from "@/lib/nav-account";
import type { Profile } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────────────────────
   Who is signed in, for the nav on a statically rendered page.

   THIS ROUTE EXISTS SO THE LANDING PAGE CAN STAY STATIC. The marketing pages
   must not read a cookie while rendering — that turns the landing page, Terms
   and Privacy dynamic, and the landing page is the one page whose
   time-to-first-byte a search engine measures. So the HTML ships with the
   signed-out nav, and the browser asks this route afterwards.

   It is one round trip after hydration, which is exactly what the previous
   design cost. What it avoids is mounting a Convex auth provider above the
   marketing tree: that provider is an async Server Component, it reads the
   session cookie, and having it at the root is what made all six pages
   dynamic.

   Returns the caller's OWN account or null. It reads nothing it was asked to
   read — there is no id parameter and no way to name another user.
   ───────────────────────────────────────────────────────────────────────────── */

/** Per-user and cookie-dependent. Never cached, never shared. */
export const dynamic = "force-dynamic";

const PRIVATE = { "cache-control": "no-store, private" };

export async function GET() {
  try {
    const convex = await convexServer();
    const profile = (await convex.query(api.profiles.current, {})) as Profile | null;
    const account = accountFrom(profile, profile?.email ?? null);
    return NextResponse.json(account === "signed-out" ? null : account, { headers: PRIVATE });
  } catch {
    // A nav that cannot resolve the session shows the signed-out one. It is
    // not a security boundary — every private screen checks for itself.
    return NextResponse.json(null, { headers: PRIVATE });
  }
}
