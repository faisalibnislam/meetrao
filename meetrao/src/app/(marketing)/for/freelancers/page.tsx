import type { Metadata } from "next";
import { AudiencePage } from "@/components/marketing/audience-page";
import { JsonLd } from "@/components/seo/json-ld";
import { FREELANCERS } from "@/lib/audiences";
import { OG_IMAGE, breadcrumbLd, faqLd, graph } from "@/lib/seo";

const DATA = FREELANCERS;

/* The title and description are written out as literals rather than taken
   from DATA. seo-invariants.test.ts reads each page's metadata without
   executing it, so a value behind a reference is one it cannot measure, and
   the 60- and 155-character limits stop being checked for this page. The
   strings match audiences.ts, and audiences.test.ts asserts that they do. */
export const metadata: Metadata = {
  title: "A free booking link for freelancers",
  description:
    "Your booking page on meet.yourname.com with your logo and your colours, for $30 a year. " +
    "Taking bookings is free, and there is no card to put on file.",
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
