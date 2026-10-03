import type { Metadata } from "next";
import { AudiencePage } from "@/components/marketing/audience-page";
import { JsonLd } from "@/components/seo/json-ld";
import { AGENCIES } from "@/lib/audiences";
import { OG_IMAGE, breadcrumbLd, faqLd, graph } from "@/lib/seo";

const DATA = AGENCIES;

/* The title and description are written out as literals rather than taken
   from DATA. seo-invariants.test.ts reads each page's metadata without
   executing it, so a value behind a reference is one it cannot measure, and
   the 60- and 155-character limits stop being checked for this page. The
   strings match audiences.ts, and audiences.test.ts asserts that they do. */
export const metadata: Metadata = {
  title: "Free round-robin scheduling for agencies",
  description:
    "One link several people answer, rotating to whoever is free and least recently booked. " +
    "Priced per account at $30 a year, not per seat.",
  alternates: { canonical: `/for/${DATA.slug}` },
  openGraph: {
    images: [OG_IMAGE],
    type: "website",
    title: `${DATA.title} · Meetrao`,
    description: DATA.description,
    url: `/for/${DATA.slug}`,
  },
};

export default function Page() {
  return (
    <>
      <JsonLd
        json={graph(
          faqLd(DATA.faq),
          breadcrumbLd([
            ["Meetrao", "/"],
            [DATA.title, `/for/${DATA.slug}`],
          ]),
        )}
      />
      <AudiencePage data={DATA} />
    </>
  );
}
