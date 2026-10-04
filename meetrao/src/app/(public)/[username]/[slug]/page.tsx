import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/seo";
import { companyForRequest, publicUrl } from "@/lib/public-origin";
import { permanentRedirect } from "next/navigation";
import { MeetingPage } from "@/components/booking/meeting-page";
import { companyPlaceOf, getPublicHost, getPublicMeeting } from "@/lib/data/public-booking";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  // Together, and memoised, so the page reuses both rather than asking again.
  const [host, meeting] = await Promise.all([getPublicHost(username), getPublicMeeting(username, slug)]);
  if (!host)
    return { title: "Not found", robots: { index: false, follow: false } };

  if (!meeting)
    return { title: "Book a time", robots: { index: false, follow: false } };

  const name = host.fullName || host.username;
  const title = `${meeting.name} with ${name}`;
  /* Absolute, and built from the domain this request arrived on. A Pro host's
     page on their own domain must not canonicalise to meetrao.com, see
     src/lib/public-origin.ts. */
  const here = await publicUrl(`/${host.username}/${meeting.slug}`);
  /* The host's own description when they wrote one, and a generated sentence
     when they did not. An empty description leaves the search result to be
     filled in from whatever text the crawler happens to find first, which on
     this page is a list of times. */
  const description =
    meeting.description ||
    `Book a ${meeting.durationMinutes}-minute ${meeting.name.toLowerCase()} with ${name}. ` +
      `Live availability, no account needed, and a Google Meet link on every booking.`;

  return {
    title,
    description,
    alternates: { canonical: here },
    openGraph: {
      images: [OG_IMAGE],
      type: "website",
      title,
      description,
      url: here,
    },
  };
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;

  /* On a company's own domain the company comes from the HOSTNAME, so
     meetrao.com/alex cannot be made to wear somebody else's logo. */
  const company = await companyForRequest();

  /* ON MEETRAO.COM a company's meeting has its own address, and this is not
     it. Sent on rather than served here: every link already in somebody's
     email signature keeps working, and each page ends up with one canonical
     home instead of two that differ only in branding.

     Not on a custom domain, where this path IS the company's address after
     the proxy has rewritten it. */
  if (!company) {
    /* The page's first reads start NOW, while this decides whether to send
       the guest on. They are memoised, so the page picks up the same calls
       already in flight instead of starting them after this one returns. */
    void getPublicHost(username);
    void getPublicMeeting(username, slug);
    const place = await companyPlaceOf(username, slug);
    if (place) permanentRedirect(`/${place.companySlug}/${place.handle}/${slug}`);
  }

  return <MeetingPage username={username} slug={slug} company={company} />;
}
