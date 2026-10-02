import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar, Eyebrow } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/panels";
import { getPublicHost, getPublicMeetings } from "@/lib/data/public-booking";
import { OG_IMAGE } from "@/lib/seo";
import { publicUrl } from "@/lib/public-origin";
import { PublicFooter } from "@/components/booking/public-footer";
import { BrandMark, BrandScope } from "@/components/booking/brand";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const host = await getPublicHost(username);
  if (!host) return { title: "Not found", robots: { index: false, follow: false } };

  const name = host.fullName || host.username;
  /* Absolute, and built from the domain this request arrived on. A Pro host's
     page on their own domain must not canonicalise to meetrao.com, see
     src/lib/public-origin.ts. */
  const here = await publicUrl(`/${host.username}`);

  return {
    title: `Book a meeting with ${name}`,
    description: `Pick a time that works with ${name}. Live availability, no account needed, and a Google Meet link on every booking.`,
    alternates: { canonical: here },
    openGraph: {
      images: [OG_IMAGE],
      type: "profile",
      title: `Book a meeting with ${name}`,
      description: `Pick a time that works with ${name}. No account needed.`,
      url: here,
    },
  };
}

/** The account link. One active meeting goes straight to it; several offer a choice. */
export default async function HostPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const host = await getPublicHost(username);
  if (!host) notFound();

  const meetings = await getPublicMeetings(username);
  if (meetings.length === 1) redirect(`/${host.username}/${meetings[0].slug}`);

  return (
    <BrandScope brand={host.brand}>
    <div className="m-auto flex w-full max-w-[940px] flex-col gap-[14px]">
      <div className="flex items-center justify-between gap-[12px] px-[2px]">
        <BrandMark brand={host.brand} hostName={host.fullName || host.username} height={20} />
        <Eyebrow size={10.5} className="text-on-ground">Booking page</Eyebrow>
      </div>

      <div className="grid grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] overflow-hidden rounded-[12px] border border-line bg-surface max-[820px]:grid-cols-[1fr]">
        <div className="flex min-w-0 flex-col gap-[15px] border-r border-line bg-fill p-[30px] max-[820px]:border-r-0 max-[820px]:border-b max-[820px]:bg-surface max-[820px]:px-[22px] max-[820px]:py-[26px]">
          <div className="flex items-center gap-[11px]">
            {/* <Avatar>, not hand-rolled initials. This page drew the initials
                itself and never looked at host.avatarUrl, so a host with a
                photograph (set on their own profile screen, and shown on
                every OTHER booking surface) appeared here as two letters.
                The component already falls back to initials when there is no
                photograph, which is the whole of what this used to do. */}
            <Avatar name={host.fullName || host.username} size={38} src={host.avatarUrl} />
            <div className="flex min-w-0 flex-col gap-[1px]">
              <span className="text-[13.5px] font-semibold text-ink">{host.fullName || host.username}</span>
              {host.jobTitle ? <span className="text-[12px] text-ink-3">{host.jobTitle}</span> : null}
            </div>
          </div>

          <h1 className="m-0 font-serif text-[31px] leading-[1.08] font-normal tracking-[-0.01em] text-pretty text-ink">
            Book a time
          </h1>
          <p className="m-0 text-[13.5px] leading-[1.55] text-pretty text-ink-2">
            Pick the kind of meeting you need and choose a time that suits you.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-[12px] p-[30px] max-[820px]:px-[22px] max-[820px]:py-[24px]">
          <Eyebrow size={10.5}>Choose a meeting</Eyebrow>

          {meetings.length === 0 ? (
            <EmptyState
              title="Nothing bookable right now"
              text={`${(host.fullName || host.username).split(" ")[0]} has no meetings open for booking.`}
            />
          ) : (
            <div className="flex flex-col gap-[8px]">
              {meetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/${host.username}/${meeting.slug}`}
                  className="unlink flex items-center gap-[12px] rounded-[8px] border border-line bg-surface px-[15px] py-[13px] transition-colors duration-[120ms] hover:border-line-strong hover:bg-fill"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <span className="text-[13.5px] font-semibold text-ink">{meeting.name}</span>
                    <span className="text-[12.5px] leading-[1.45] text-ink-3">
                      {meeting.durationMinutes} min
                      {meeting.description ? ` · ${meeting.description}` : ""}
                    </span>
                  </div>
                  <Icon name="chevron-right" size={11} className="flex-none text-ink-3" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
      <PublicFooter badge={!host.unbranded} />
    </BrandScope>
  );
}
