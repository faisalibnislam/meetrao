import type { Metadata } from "next";
import { PricingPage } from "@/components/marketing/pricing-page";
import { JsonLd } from "@/components/seo/json-ld";
import { PRICING_FAQ } from "@/lib/pricing";
import { OG_IMAGE, breadcrumbLd, faqLd, graph } from "@/lib/seo";

export const metadata: Metadata = {
  /* "Pricing" alone would render as "Pricing · Meetrao", which says nothing to
     somebody who has not heard of Meetrao. The query is "free scheduling app
     pricing" and the answer worth putting in a title is the number. */
  title: "Pricing: free to book, $30 a year for Pro",
  description:
    "Taking bookings is free: no card, no trial clock, no booking limit. Pro is $30 a year for a " +
    "custom domain, your own branding and team links.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    images: [OG_IMAGE],
    type: "website",
    title: "Meetrao pricing: free to book, $30 a year for Pro",
    description:
      "Taking bookings is free with no card. Pro adds a custom domain, your own branding, team links and the API.",
    url: "/pricing",
  },
};

export default function Page() {
  return (
    <>
      {/* The SoftwareApplication and its `offers.price: "0"` already render on
          every page from the root layout, so this adds only what is local: the
          questions, built from the same array the page renders, and the trail.

          No `Product` node. Meetrao is software, schema.org has a type for
          that, and dressing it up as a Product to chase a price-range rich
          result would be describing the thing as something it is not. */}
      <JsonLd
        json={graph(
          faqLd(PRICING_FAQ),
          breadcrumbLd([
            ["Meetrao", "/"],
            ["Pricing", "/pricing"],
          ]),
        )}
      />
      <PricingPage />
    </>
  );
}
