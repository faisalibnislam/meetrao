"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteAccountMenu } from "./site-account-menu";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

/* ─────────────────────────────────────────────────────────────────────────────
   The account menu, for pages that must not read the session on the server.

   /help and /support resolve the session in their own Server Component and hand
   `account` straight to SiteNav — no flash, because the right chrome is in the
   HTML. The landing page, Terms and Privacy cannot do that: reading cookies
   would opt all three out of static rendering, and the landing page is the one
   page whose time-to-first-byte a search engine measures. Trading the site's
   best-ranking page's TTFB for a nav variant would be a bad deal in general;
   with an SEO brief on the table it would be an odd one.

   So the session is read in the browser instead. The static HTML carries "Log
   in" and "Get started", which is correct for almost every visitor a search
   engine sends, and a signed-in host sees it swap to their avatar about one
   round trip after hydration. That swap is the cost, it is real, and it is
   cheaper than the alternative.

   Nothing here is a security boundary. It decides which of two links to draw;
   /dashboard is protected on the server, by the proxy and by RLS, exactly as
   before.
   ───────────────────────────────────────────────────────────────────────────── */

export type Account = { name: string; email: string; avatarUrl: string | null };

/** Undecided and signed-out render identically — see the note below. */
type State = "unknown" | "signed-out" | Account;

/**
 * What to show for a session, given whatever the profile read came back with.
 *
 * Separate and exported because it is the one part with a wrong answer
 * available. The profile read can fail — offline, a CORS misconfiguration, a
 * revoked grant — and the obvious code then builds an account with an empty
 * name, which renders as a blank avatar chip with blank initials next to a
 * blank menu header. A signed-in host would see a broken control where two
 * perfectly good buttons used to be.
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

export function SiteAccountLive({ onSignOut }: { onSignOut: () => void | Promise<void> }) {
  /* "unknown" until the browser has looked, and it draws the same thing as
     "signed-out". That is deliberate: the first client render has to match the
     server's HTML or React reports a hydration mismatch, and the server's HTML
     is the signed-out nav. */
  const [state, setState] = useState<State>("unknown");

  useEffect(() => {
    let live = true;
    const supabase = supabaseBrowser();

    async function read() {
      /* getSession, not getUser: it reads the session the browser already has
         instead of asking Supabase to verify it, which is the difference
         between an instant answer and a round trip to Tokyo. Fine here, and
         only here — this picks an avatar, it does not grant access to
         anything. Every screen behind the menu re-checks on the server. */
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!live) return;
      if (!user) {
        setState("signed-out");
        return;
      }

      // The profile carries the display name and the avatar; the session only
      // has the email. current_profile needs no id — see migration 0015.
      const { data: profile } = await supabase.rpc("current_profile");
      if (!live) return;

      const row = (Array.isArray(profile) ? profile[0] : profile) as Profile | null;
      setState(accountFrom(row, user.email ?? null));
    }

    void read();

    /* Logging out in another tab, or the token expiring, should change this nav
       rather than leave a stale avatar pointing at a dashboard that will bounce
       the visitor to /login. */
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void read();
    });

    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === "unknown" || state === "signed-out") return <SignedOutActions />;

  return (
    <SiteAccountMenu name={state.name} email={state.email} avatarUrl={state.avatarUrl} onSignOut={onSignOut} />
  );
}

/**
 * "Log in" and "Get started — Free": what a visitor who has no account sees.
 *
 * Lives in this file rather than in site-chrome so there is one definition
 * rather than two — the client component above needs it for its first render,
 * and the server nav needs it for every page that knows nobody is signed in.
 */
export function SignedOutActions() {
  return (
    <>
      <Link
        href="/login"
        className="unlink inline-flex min-h-[38px] items-center px-[8px] text-[13.5px] text-ink-2"
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className="unlink inline-flex h-[38px] items-center gap-[8px] rounded-[7px] bg-accent px-[15px] text-[13px] font-semibold whitespace-nowrap text-white transition-colors duration-[120ms] hover:bg-accent-2 hover:text-white max-[400px]:px-[12px]"
      >
        {/* On a 320px screen the full label put this button 21px past the right
            edge, where it could not be tapped at all. The label shortens rather
            than the button shrinking, so the primary action keeps its full
            height and weight. */}
        <span className="max-[400px]:hidden">Get started — Free</span>
        <span className="hidden max-[400px]:inline">Get started</span>
      </Link>
    </>
  );
}
