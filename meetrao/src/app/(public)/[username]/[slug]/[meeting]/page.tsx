import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { OG_IMAGE } from "@/lib/seo";
import { companyForRequest, publicUrl } from "@/lib/public-origin";
import { MeetingPage } from "@/components/booking/meeting-page";
import {
  companyBySlug,
  hostOnCompany,
  getPublicHost,
  getPublicMeeting,
  meetingIsOnCompany,
} from "@/lib/data/public-booking";
import { movedTo } from "@/convex/lib/meetingSlugs";

/* ─────────────────────────────────────────────────────────────────────────────
   A company's own address: meetrao.com/<company>/<handle>/<meeting>.

   Every company has one, whether or not it has bought a domain. A custom
   domain is then a prettier alias for this page rather than the only way to
   have one, which is what it used to be: before this, a company's meetings
   were only reachable at their HOST's personal address, so a company and the
   people in it shared one set of links.

   HANDLES, NOT USERNAMES, as on a custom domain. A handle is who somebody is
   inside this company; usernames are global and first come first served, so a
   company cannot be promised one.

   A HANDLE THAT IS NOT THIS COMPANY'S IS A 404, and that is the security
   property rather than a nicety: resolving an arbitrary username here would
   serve a stranger's booking page under somebody else's logo, and make every
   company slug a way to enumerate the product's hosts.

   No company page and no handle page. Three segments or nothing, because
   there is no screen anywhere that lists somebody's meetings.

   THE PARAMETER NAMES ARE NEXT'S, NOT THIS PRODUCT'S. Next refuses two
   different parameter names at the same position in a path, and the
   two-segment personal route already owns `[username]/[slug]` there, so this
   route has to nest inside them. So `username` holds the COMPANY slug and
   `slug` holds the HANDLE, and they are renamed on the first line of each
   function below rather than carried around under names that lie.
   ───────────────────────────────────────────────────────────────────────── */

export const dynamic = "force-dynamic";

type Params = Promise<{ username: string; slug: string; meeting: string }>;

/** The host behind a company address, or null when the path names nobody. */
async function resolve(params: Params) {
  const { username: companySlug, slug: handle, meeting: slug } = await params;
  // Independent of each other, so asked together rather than one then the other.
  const [company, username] = await Promise.all([companyBySlug(companySlug), hostOnCompany(companySlug, handle)]);
  if (!company) return null;
  if (!username) return null;

  return { company, username, handle, slug };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await resolve(params);
  if (!found) return { title: "Not found", robots: { index: false, follow: false } };

  const [host, meeting] = await Promise.all([
    getPublicHost(found.username),
    getPublicMeeting(found.username, found.slug),
  ]);
  if (!host || !meeting) return { title: "Not found", robots: { index: false, follow: false } };

  const name = host.fullName || host.username;
  const title = `${meeting.name} with ${name}`;
  /* Canonical to THIS address, which is the company's. The personal one
     redirects here, so pointing back at it would send a crawler in a circle. */
  const here = await publicUrl(`/${found.company.slug}/${found.handle}/${meeting.slug}`);
  const description =
    meeting.description ||
    `Book a ${meeting.durationMinutes}-minute ${meeting.name.toLowerCase()} with ${name} at ${found.company.name}. ` +
      `Live availability, no account needed, and a Google Meet link on every booking.`;

  return {
    title,
    description,
    alternates: { canonical: here },
    openGraph: { title, description, url: here, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}

export default async function CompanyBookingPage({ params }: { params: Params }) {
  const found = await resolve(params);
  if (!found) notFound();

  /* AN OLD LINK, as on the personal route: the meeting's slug was moved and
     this is one it used to have. Sent on with a 308 to the current address,
     but only once the meeting is confirmed to be THIS company's, so a stale
     slug cannot be used to find out where somebody's other meetings live.

     The base is what the guest's browser shows. On the company's own domain
     the proxy rewrote /<handle>/<meeting> to this route, so the redirect has
     to name the handle alone; on meetrao.com it names the company too.

     The meeting read is memoised and the page makes it anyway, so the
     ordinary visit costs nothing extra; the two further checks run only for
     an address that actually used an old slug. */
  void getPublicHost(found.username);
  const meeting = await getPublicMeeting(found.username, found.slug);
  if (meeting && movedTo(found.slug, meeting, "")) {
    const [ours, domainCompany] = await Promise.all([
      meetingIsOnCompany(found.username, meeting.slug, found.company.slug),
      companyForRequest(),
    ]);
    const base = domainCompany ? `/${found.handle}` : `/${found.company.slug}/${found.handle}`;
    const moved = ours ? movedTo(found.slug, meeting, base) : null;
    if (moved) permanentRedirect(moved);
  }

  return <MeetingPage username={found.username} slug={found.slug} company={found.company} />;
}
