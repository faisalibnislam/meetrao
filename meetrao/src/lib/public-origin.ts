import "server-only";
import { headers } from "next/headers";
import { siteUrl } from "@/lib/env";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

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
async function publicOrigin(): Promise<string> {
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

/**
 * The company whose domain this request arrived on, if any.
 *
 * Resolved from the HOSTNAME, never from the path or a query parameter, which
 * is what makes it unspoofable: meetrao.com/alex cannot be made to wear
 * somebody else's logo by adding `?c=acme`.
 *
 * Returns null on our own hostnames and on anything that is not a verified
 * company domain, so every caller falls back to the host's own branding.
 */
export async function companyForRequest(): Promise<{
  slug: string;
  name: string;
  unbranded: boolean;
  /* camelCase, because this is handed straight to BrandScope. Converted here
     rather than at each call site, so a page cannot pass the raw projection
     and get a silently unbranded page from a mismatched key. */
  brand: { logoUrl: string | null; logoHidden: boolean; color: string | null; background: string | null } | null;
} | null> {
  const list = await headers();
  const hostname = (list.get("host") ?? "").split(":")[0]?.toLowerCase() ?? "";
  if (!hostname || isOwnHost(hostname)) return null;

  try {
    const row = await convexAnonymous().query(api.publicBooking.companyBrandForDomain, { domain: hostname });
    if (!row) return null;
    return {
      slug: row.slug,
      name: row.name,
      unbranded: row.unbranded,
      brand: row.brand
        ? {
            logoUrl: row.brand.logo_url,
            logoHidden: row.brand.logo_hidden,
            color: row.brand.color,
            background: row.brand.background,
          }
        : null,
    };
  } catch {
    // A lookup that fails falls back to the host's own brand, never to an error.
    return null;
  }
}
