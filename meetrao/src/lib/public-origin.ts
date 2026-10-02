import "server-only";
import { headers } from "next/headers";
import { siteUrl } from "@/lib/env";

/* ─────────────────────────────────────────────────────────────────────────────
   Which origin a guest-facing page should call itself.

   WHY THIS EXISTS: metadataBase is meetrao.com, so `canonical: "/alex"` on a
   booking page resolves to meetrao.com/alex, correct on our own domain, and
   exactly wrong on a Pro host's. A custom domain whose pages tell Google the
   real address is somewhere else is a custom domain that does nothing for the
   host, which is one of the two reasons they bought it.

   The host header is NOT trusted for anything but this. It decides which of
   two URLs a page calls itself; it never decides whose data is shown. That
   comes from the verified-domain lookup in the proxy and from the username in
   the path. A forged header can therefore make a page claim an odd canonical
   URL and nothing more.
   ───────────────────────────────────────────────────────────────────────────── */

/** Our own hostnames: the apex, its subdomains, previews, and local dev. */
function isOwnHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  try {
    const own = new URL(siteUrl()).hostname;
    return hostname === own || hostname.endsWith(`.${own}`) || hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

/**
 * The origin this request arrived on, when it is a host's own domain, and ours
 * otherwise.
 *
 * Always https for a custom domain: a domain only resolves here once it is
 * verified, and Vercel issues a certificate as part of that.
 */
export async function publicOrigin(): Promise<string> {
  const list = await headers();
  const header = list.get("host") ?? "";
  // Strip the port, which is present in dev and on nothing else.
  const hostname = header.split(":")[0]?.toLowerCase() ?? "";

  if (!hostname || isOwnHost(hostname)) return siteUrl();
  return `https://${hostname}`;
}

/** An absolute URL for `alternates.canonical`, on whichever domain this is. */
export async function publicUrl(path: string): Promise<string> {
  return new URL(path, await publicOrigin()).toString();
}
