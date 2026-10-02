import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatLongDate } from "@/lib/booking/time";
import { getBookingByReference } from "@/lib/data/guest-booking";
import { PublicFooter } from "@/components/booking/public-footer";
import { BrandMark, BrandScope } from "@/components/booking/brand";

export const dynamic = "force-dynamic";

/* Never indexed. This page is reached with a 32-hex-character reference and
   shows a named guest, a named host and a time — the whole point is that only
   the two people involved can see it. `noindex, nofollow` rather than a
   robots.txt disallow, because a disallowed page is one a crawler never fetches
   and therefore one whose noindex it never reads; a bare URL can still be
   listed from a link somewhere. This directive is read. */
const PRIVATE_PAGE = { index: false, follow: false, nocache: true } as const;

export const metadata: Metadata = { title: "Meeting cancelled", robots: PRIVATE_PAGE };

export default async function CancelledPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const booking = await getBookingByReference(reference);
  if (!booking) notFound();

  const zone = booking.guestTimezone ?? booking.hostTimezone;
  const when = formatLongDate(new Date(booking.startsAt), zone);

  return (
    <BrandScope brand={booking.hostBrand}>
    <div className="m-auto flex w-full max-w-[460px] flex-col gap-[14px]">
      <BrandMark brand={booking.hostBrand} hostName={booking.hostName} height={20} />

      <div className="flex flex-col gap-[16px] rounded-[12px] border border-line bg-surface p-[30px] max-[820px]:p-[22px]">
        <span className="inline-flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full border border-red-line bg-red-soft text-red">
          <Icon name="xmark" weight="solid" size={12} />
        </span>

        <h1 className="m-0 font-serif text-[27px] leading-[1.1] font-normal tracking-[-0.01em] text-ink">
          Meeting cancelled
        </h1>

        <p className="m-0 text-[13.5px] leading-[1.55] text-pretty text-ink-2">
          Your meeting with {booking.hostName} on {when} is cancelled. The calendar event has been removed and
          the time is free again.
        </p>

        <div className="flex gap-[10px] pt-[2px]">
          <ButtonLink variant="accent" size={36} href={`/${booking.hostUsername}`}>
            Book another time
          </ButtonLink>
        </div>
      </div>
    </div>
      <PublicFooter badge={!booking.hostUnbranded} />
    </BrandScope>
  );
}
