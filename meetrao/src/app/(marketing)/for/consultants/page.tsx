import type { Metadata } from "next";
import { AudiencePage } from "@/components/marketing/audience-page";
import { JsonLd } from "@/components/seo/json-ld";
import { CONSULTANTS } from "@/lib/audiences";
import { OG_IMAGE, breadcrumbLd, faqLd, graph } from "@/lib/seo";

const DATA = CONSULTANTS;

/* The title and description are written out as literals rather than taken
   from DATA. seo-invariants.test.ts reads each page's metadata without
   executing it, so a value behind a reference is one it cannot measure, and
   the 60- and 155-character limits stop being checked for this page. The
   strings match audiences.ts, and audiences.test.ts asserts that they do. */
export const metadata: Metadata = {
  title: "Free scheduling software for consultants",
  description:
    "A short discovery call and a long working session need different links. Both are free on " +
    "Meetrao, with buffers and a notice period that protect the day.",
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
