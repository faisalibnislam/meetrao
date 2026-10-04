/**
 * A redirect target taken from a URL, accepted only if it stays on this site.
 *
 * `startsWith("/")` is the check every caller used to make, and it is not
 * enough: `//evil.example` and `/\evil.example` both start with a slash, and
 * a browser reads both as another host. `/auth/confirm?next=//evil.example`
 * sent a signed-out visitor straight there.
 *
 * Resolved against a placeholder origin and kept only if it is still on that
 * origin, which is the browser's own rule rather than a list of bad prefixes.
 */
export function safePath(target: string | null | undefined, fallback: string): string {
  if (!target || !target.startsWith("/")) return fallback;
  try {
    const base = "http://meetrao.invalid";
    const url = new URL(target, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
