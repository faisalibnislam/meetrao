import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/* ─────────────────────────────────────────────────────────────────────────────
   The pages worth submitting.

   Deliberately only Meetrao's own pages. Hosts' booking pages (/<username>) are
   public and individually indexable, and they are NOT listed here: a sitemap
   enumerating every one of them is a machine-readable roster of everybody who
   uses the product. Each username is already public on its own; publishing the
   complete set is a different thing, and not one to do to people without
   asking them.

   `lastModified` is the deploy time rather than a per-page date. A fabricated
   per-page date is worse than an honest whole-site one, crawlers learn quickly
   that a sitemap which claims everything changed today is not worth believing.
   ───────────────────────────────────────────────────────────────────────────── */

const PAGES: [path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
  ["/", 1.0, "weekly"],
  ["/pricing", 0.9, "monthly"],
  ["/vs/calendly", 0.9, "monthly"],
  ["/vs/cal-com", 0.9, "monthly"],
  ["/help", 0.7, "monthly"],
  ["/signup", 0.6, "yearly"],
  ["/support", 0.4, "yearly"],
  ["/privacy", 0.3, "yearly"],
  ["/terms", 0.3, "yearly"],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.map(([path, priority, changeFrequency]) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}
