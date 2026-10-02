/* ─────────────────────────────────────────────────────────────────────────────
   Clearing the Convex Auth session cookies.

   A pure function, kept apart from the server action, because getting this
   wrong is invisible in development and total in production, which is exactly
   what happened. Signing out worked locally and did nothing on the live site.

   TWO THINGS THE BROWSER INSISTS ON, and both were missed:

   · `cookies().delete(name)` does not reliably clear a cookie that was set
     with attributes. The package does not use it either, see the comment in
     @convex-dev/auth/nextjs/server/cookies.js, which links vercel/next.js#56632
     and re-SETS the cookie with its full option set and an expiry in the past.
     So does this.

   · Off localhost the package prefixes both names with `__Host-`. That prefix
     is a browser-enforced contract: a Set-Cookie for a `__Host-` name is
     REJECTED OUTRIGHT unless it carries Secure, Path=/ and no Domain. A
     deletion without Secure is therefore not a deletion, the browser drops
     the write and the original cookie survives, still signed in. On localhost
     there is no prefix, and Safari will not send Secure cookies over http, so
     `secure` has to follow the host rather than be hardcoded either way.

   The host test mirrors `isLocalHost` in the package, so the two cannot
   disagree about which spelling is in play.
   ───────────────────────────────────────────────────────────────────────────── */

/** The names Convex Auth stores a session under, before any prefix. */
const SESSION_COOKIES = ["__convexAuthJWT", "__convexAuthRefreshToken"] as const;

/** Mirrors isLocalHost in @convex-dev/auth/server/utils. */
export function isLocalHost(host: string | null): boolean {
  return /(localhost|127\.0\.0\.1):\d+/.test(host ?? "");
}

export type ClearedCookie = {
  name: string;
  value: "";
  options: { httpOnly: true; sameSite: "lax"; path: "/"; secure: boolean; expires: Date };
};

/**
 * Every cookie that has to be overwritten to end a session on this host.
 *
 * Returns both the prefixed and bare spellings off localhost. Clearing one
 * that was never set costs nothing (it writes an already-expired cookie the
 * browser discards) and it means a change to the package's prefix rule cannot
 * quietly leave a live session cookie behind.
 */
export function clearedAuthCookies(host: string | null): ClearedCookie[] {
  const local = isLocalHost(host);
  const options = {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/" as const,
    // `__Host-` REQUIRES this off localhost, or the browser rejects the write.
    secure: !local,
    expires: new Date(0),
  };

  return SESSION_COOKIES.flatMap((base) =>
    (local ? [base] : [`__Host-${base}`, base]).map((name) => ({ name, value: "" as const, options })),
  );
}
