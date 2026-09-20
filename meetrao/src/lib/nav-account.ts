import type { Profile } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────────────────────
   Which nav a visitor gets.

   A plain module, not part of the client component that uses it, because BOTH
   sides need it: /api/me resolves it on the server, and the marketing nav
   consumes the result in the browser. Keeping it here means there is one
   definition of "what counts as signed in" rather than one per caller.
   ───────────────────────────────────────────────────────────────────────────── */

export type Account = { name: string; email: string; avatarUrl: string | null };

/**
 * What to show for a session, given whatever the profile read came back with.
 *
 * Its own function because it is the one part with a wrong answer available.
 * The profile read can fail — offline, a revoked session, a bad deploy — and
 * the obvious code then builds an account with an empty name, which renders as
 * a blank avatar chip with blank initials next to a blank menu header. A
 * signed-in host would see a broken control where two perfectly good buttons
 * used to be.
 *
 * So: no name from any source means no menu. Falling back to "Log in" and "Get
 * started" is wrong for that host, but it is a working nav rather than a broken
 * one, and one click puts them back.
 */
export function accountFrom(profile: Profile | null, sessionEmail: string | null): Account | "signed-out" {
  const email = sessionEmail || profile?.email || "";
  const name = profile?.full_name || profile?.username || email.split("@")[0] || "";
  if (!name) return "signed-out";
  return { name, email, avatarUrl: profile?.avatar_url ?? null };
}
