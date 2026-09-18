import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsBeacon } from "@/components/analytics/beacon";
import { AnalyticsConsent } from "@/components/analytics/consent";
import { JsonLd } from "@/components/seo/json-ld";
import { ToastProvider } from "@/components/ui/toast";
import { siteUrl } from "@/lib/env";
import { DESCRIPTION, KEYWORDS, OG_IMAGE, SITE_NAME, TITLE, TITLE_TEMPLATE, graph, organizationLd, softwareApplicationLd, webSiteLd } from "@/lib/seo";
import "./globals.css";

/* Two families, strictly divided by role.
   Instrument Sans — all product UI, including the machine strings and
     micro-labels. There is no monospace family: see globals.css § --font-mono.
   Instrument Serif — display moments only (never a section heading, never body). */
const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

/* ─────────────────────────────────────────────────────────────────────────────
   Site-wide metadata.

   `metadataBase` is the one line that makes the rest work: without it every
   relative URL Next generates — canonical tags, og:image, the sitemap's own
   links — resolves against localhost in development and against nothing in
   production, and a canonical pointing at localhost is worse than none.

   The default title leads with the category rather than the brand — see the
   note on TITLE in lib/seo.ts for why.
   ───────────────────────────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    // The template applies to CHILD segments only, never to this default — so
    // `TITLE` already ending in the brand is correct, not a duplication. Next's
    // own docs: "title.template applies to child route segments and not the
    // segment it's defined in."
    default: TITLE,
    template: TITLE_TEMPLATE,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: KEYWORDS,
  authors: [{ name: SITE_NAME, url: siteUrl() }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  /* No `alternates` here on purpose. A canonical set at the root is inherited
     by every page that does not set its own — which pointed the guest booking
     pages, and every screen inside the app, at the home page. Each public page
     declares its own; anything else gets none, which is the correct answer for
     a page nobody should be indexing. */
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    locale: "en",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Let Google show a full snippet and a large image rather than the
      // truncated default. Without these it decides for itself, and for a page
      // nobody has heard of it decides conservatively.
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  /* No `verification` block. Those tokens are per-account and belong to whoever
     owns the Search Console property — see README § SEO. */
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
        {/* Both are client components that render no markup of their own (the
            consent banner only once someone has to be asked), so neither opts
            a single page out of static rendering — which the marketing layout
            depends on. Read process.env directly rather than through env(): a
            NEXT_PUBLIC_ variable is inlined at build time, and calling the
            validator here would drag the whole server schema into the browser
            bundle. */}
        <AnalyticsBeacon />
        <AnalyticsConsent
          measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ""}
        />

        {/* Who runs this, what it is, and what it costs — on every page rather
            than only the home page, because the page an agent lands on is
            whichever one answered the question it was asked. One @graph so the
            nodes can reference each other by @id instead of each restating the
            publisher. */}
        <JsonLd
          json={graph(organizationLd(), webSiteLd(), softwareApplicationLd())}
        />

        <SpeedInsights />
      </body>
    </html>
  );
}
