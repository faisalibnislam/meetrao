/* ─────────────────────────────────────────────────────────────────────────────
   Where an OAuth sign-in may land afterwards.

   Convex Auth's default allows a path or a URL on SITE_URL and nothing else,
   which is right for the web and leaves the iOS app nowhere to go: Google
   hands the browser back to Convex, Convex redirects to `redirectTo` with a
   one-time code, and the app has to be that destination to read the code.

   So the default rule is kept exactly, plus ONE extra address, the app's own
   callback. Not "any meetrao:// URL": a scheme can be claimed by any app on
   the phone, and the narrower the address the less a look-alike can do with
   it. The code is also useless without the verifier the app holds, which is
   the reason this is safe to allow at all.
   ───────────────────────────────────────────────────────────────────────────── */

/** The iOS app's sign-in callback. Matches CFBundleURLSchemes in ios/. */
export const APP_AUTH_REDIRECT = "meetrao://auth";

export function resolveRedirect(redirectTo: string, siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  if (redirectTo === APP_AUTH_REDIRECT) return redirectTo;
  if (redirectTo.startsWith("?") || redirectTo.startsWith("/")) return `${base}${redirectTo}`;
  if (redirectTo.startsWith(base)) {
    const after = redirectTo[base.length];
    if (after === undefined || after === "?" || after === "/") return redirectTo;
  }
  throw new Error(`Invalid redirectTo ${redirectTo} for configured SITE_URL: ${base}`);
}
