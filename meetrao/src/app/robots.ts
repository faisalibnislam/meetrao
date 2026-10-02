import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/* ─────────────────────────────────────────────────────────────────────────────
   What a crawler may look at.

   The rule behind the list: disallow is for pages that would waste a crawler's
   time, and `noindex` is for pages that must never appear in results. They are
   not interchangeable, and using the wrong one is the classic mistake,
   disallowing a page means the crawler never fetches it, never sees its
   `noindex`, and can still list the bare URL if something links to it.

   So the signed-in product is disallowed (a crawler gets a redirect to /login
   there anyway, so fetching it is pure waste), and the guest booking pages are
   left crawlable and carry `robots: { index: false }` in their own metadata,
   those are the ones with a guest's name on them, and a directive that is read
   beats one that is not.
   ───────────────────────────────────────────────────────────────────────────── */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // The signed-in product. Every one of these redirects an anonymous
          // visitor to /login, so there is nothing to index and a crawl costs
          // a round trip for a redirect.
          "/dashboard",
          "/bookings",
          "/meetings",
          "/contacts",
          "/notifications",
          "/availability",
          "/settings",
          "/admin",
          "/onboarding",
          "/preview",
          // Machinery, not pages.
          "/api/",
          "/auth/",
          // Dead ends for a crawler: each needs a token or a session.
          "/verify",
          "/reset",
          "/forgot",
          "/suspended",
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
