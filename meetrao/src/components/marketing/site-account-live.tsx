"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteAccountMenu } from "./site-account-menu";
import type { Account } from "@/lib/nav-account";

/* ─────────────────────────────────────────────────────────────────────────────
   The account menu, for pages that must not read the session on the server.

   /help and /support resolve the session in their own Server Component and hand
   `account` straight to SiteNav, no flash, because the right chrome is in the
   HTML. The landing page, Terms and Privacy cannot do that: reading cookies
   would opt all three out of static rendering, and the landing page is the one
   page whose time-to-first-byte a search engine measures. Trading the site's
   best-ranking page's TTFB for a nav variant would be a bad deal in general;
   with an SEO brief on the table it would be an odd one.

   So the session is read in the browser instead, from /api/me. The static HTML
   carries "Log in" and "Get started", which is correct for almost every visitor
   a search engine sends, and a signed-in host sees it swap to their avatar
   about one round trip after hydration. That swap is the cost, it is real, and
   it is cheaper than the alternative.

   WHY A FETCH RATHER THAN THE CONVEX HOOKS. `useConvexAuth` needs a Convex auth
   provider above it, and the one Convex Auth ships for Next.js is an async
   Server Component that reads the session cookie. Mounting it here (or at the
   root, which is where it was) makes every page under it dynamic, which is
   precisely the thing this file exists to avoid. The standalone browser-only
   provider does not have that problem but has a worse one: it refreshes tokens
   by calling Convex directly, while the Next.js one refreshes through
   /api/auth, which also rewrites the session cookie. Running both would rotate
   the refresh token out from under the cookie.

   The cost of the fetch is that this nav no longer updates live, sign out in
   another tab and this one keeps showing the avatar until it is reloaded. On a
   marketing page that is a cosmetic staleness, and every private screen checks
   the session for itself.

   Nothing here is a security boundary. It decides which of two links to draw;
   /dashboard is protected by the proxy and by convex/lib/auth.ts.
   ───────────────────────────────────────────────────────────────────────────── */

export { accountFrom, type Account } from "@/lib/nav-account";

/** Undecided and signed-out render identically, see the note below. */
type State = "unknown" | "signed-out" | Account;

export function SiteAccountLive({
  onSignOut,
}: {
  onSignOut: () => void | Promise<void>;
}) {
  /* "unknown" until the browser has looked, and it draws the same thing as
     "signed-out". That is deliberate: the first client render has to match the
     server's HTML or React reports a hydration mismatch, and the server's HTML
     is the signed-out nav. */
  const [state, setState] = useState<State>("unknown");

  useEffect(() => {
    let cancelled = false;
    const settle = (next: State) => {
      if (!cancelled) setState(next);
    };

    fetch("/api/me", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      // `name` is checked again even though /api/me already applied
      // accountFrom: a proxy that answers with an HTML error page parsed as
      // JSON would otherwise render a chip with blank initials.
      .then((data: Account | null) => settle(data?.name ? data : "signed-out"))
      // Offline, or the route is down. Two working buttons beat a broken chip.
      .catch(() => settle("signed-out"));

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "unknown" || state === "signed-out")
    return <SignedOutActions />;

  return (
    <SiteAccountMenu
      name={state.name}
      email={state.email}
      avatarUrl={state.avatarUrl}
      onSignOut={onSignOut}
    />
  );
}

/**
 * "Log in" and "Get started": what a visitor who has no account sees.
 *
 * Lives in this file rather than in site-chrome so there is one definition
 * rather than two. The client component above needs it for its first render,
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
        className="unlink inline-flex h-[38px] items-center gap-[8px] rounded-[7px] bg-accent px-[15px] text-[13px] font-semibold whitespace-nowrap text-on-accent transition-colors duration-[120ms] hover:bg-accent-2 hover:text-on-accent max-[400px]:px-[12px]"
      >
        {/* On a 320px screen the full label put this button 21px past the right
            edge, where it could not be tapped at all. The label shortens rather
            than the button shrinking, so the primary action keeps its full
            height and weight. */}
        <span className="max-[400px]:hidden">Get started</span>
        <span className="hidden max-[400px]:inline">Get started</span>
      </Link>
    </>
  );
}
