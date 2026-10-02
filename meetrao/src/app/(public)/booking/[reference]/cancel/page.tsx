import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buttonClass } from "@/components/ui/button-class";
import { formatLongDate, formatTimeRange } from "@/lib/booking/time";
import { cancelAsGuest } from "@/lib/actions/guest-cancel";
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

export const metadata: Metadata = { title: "Cancel this meeting", robots: PRIVATE_PAGE };

/* A confirmation step, not a one-click link: mail clients and link previewers
   fetch every URL in an email, so cancelling has to be a deliberate POST. */
export default async function CancelPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const booking = await getBookingByReference(reference);
  if (!booking) notFound();
  if (booking.status === "cancelled") redirect(`/booking/${reference}/cancelled`);

  const zone = booking.guestTimezone ?? booking.hostTimezone;
  const start = new Date(booking.startsAt);
  const end = new Date(booking.endsAt);

  return (
    <BrandScope brand={booking.hostBrand}>
    <div className="m-auto flex w-full max-w-[460px] flex-col gap-[14px]">
      <BrandMark brand={booking.hostBrand} hostName={booking.hostName} height={20} />

      <div className="flex flex-col gap-[16px] rounded-[12px] border border-line bg-surface p-[30px] max-[820px]:p-[22px]">
        <h1 className="m-0 font-serif text-[27px] leading-[1.1] font-normal tracking-[-0.01em] text-ink">
          Cancel this meeting?
        </h1>

        <div className="flex flex-col gap-[5px] rounded-[8px] border border-line bg-fill px-[14px] py-[12px]">
          <span className="text-[13.5px] font-semibold text-ink">
            {booking.meetingName} with {booking.hostName}
          </span>
          <span className="text-[12.5px] text-ink-2">
            {formatLongDate(start, zone)} · {formatTimeRange(start, end, zone)}
          </span>
        </div>

        <p className="m-0 text-[13.5px] leading-[1.55] text-pretty text-ink-2">
          {booking.hostName.split(" ")[0]} will be notified, the calendar event is removed, and the time opens
          back up for someone else.
        </p>

        <form action={cancelAsGuest} className="flex flex-wrap gap-[10px] pt-[2px]">
          <input type="hidden" name="reference" value={reference} />
          <button type="submit" className={buttonClass("danger", 36)}>
            Cancel meeting
          </button>
          <Link href={`/booking/${reference}`} className={`unlink no-underline ${buttonClass("ghost", 36)}`}>
            Keep it
          </Link>
        </form>
      </div>
    </div>
      <PublicFooter badge={!booking.hostUnbranded} />
    </BrandScope>
  );
}
