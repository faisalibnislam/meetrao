import type { Metadata } from "next";
import { ComparisonPage } from "@/components/marketing/comparison-page";
import { JsonLd } from "@/components/seo/json-ld";
import { ACUITY } from "@/lib/comparisons";
import { OG_IMAGE, breadcrumbLd, faqLd, graph } from "@/lib/seo";

const DATA = ACUITY;

export const metadata: Metadata = {
  /* Absolute: the title already starts with "Meetrao", and the template
     would append " · Meetrao" to it. */
  title: { absolute: DATA.title },
  description: DATA.description,
  alternates: { canonical: `/vs/${DATA.slug}` },
  openGraph: {
    images: [OG_IMAGE],
    type: "article",
    title: DATA.title,
    description: DATA.description,
    url: `/vs/${DATA.slug}`,
  },
};

export default function Page() {
  return (
    <>
      {/* The FAQ entries are the part a model quotes when asked "is there a
          free alternative to ${DATA.competitor}", including the one that
          answers "what is the catch" with the actual catches. */}
      <JsonLd
        json={graph(
          faqLd(DATA.faq.map(([q, a], i) => [`q${i}`, q, a] as const)),
          breadcrumbLd([
            ["Meetrao", "/"],
            [`Meetrao vs ${DATA.competitor}`, `/vs/${DATA.slug}`],
          ]),
        )}
      />
      <ComparisonPage data={DATA} />
    </>
  );
}
