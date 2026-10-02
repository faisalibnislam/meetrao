import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatDuration, formatLongDate, formatTimeRange } from "@/lib/booking/time";
import { getBookingByReference } from "@/lib/data/guest-booking";
import { whereText } from "@/lib/locations";
import { cx } from "@/lib/cx";
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

export const metadata: Metadata = { title: "You're booked", robots: PRIVATE_PAGE };

export default async function ConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ moved?: string }>;
}) {
  const { reference } = await params;
  const moved = (await searchParams).moved === "1";
  const booking = await getBookingByReference(reference);
  if (!booking) notFound();
  if (booking.status === "cancelled") redirect(`/booking/${reference}/cancelled`);

  const zone = booking.guestTimezone ?? booking.hostTimezone;
  const start = new Date(booking.startsAt);
  const end = new Date(booking.endsAt);

  const rows: { key: string; value: string; machine?: boolean }[] = [
    { key: "Meeting", value: booking.meetingName },
    { key: "Host", value: booking.hostName },
    { key: "When", value: `${formatLongDate(start, zone)} · ${formatTimeRange(start, end, zone)}` },
    { key: "Duration", value: formatDuration(booking.durationMinutes) },
    {
      key: "Where",
      value: whereText(booking.location, booking.locationDetail, booking.meetUrl),
      machine: Boolean(booking.meetUrl),
    },
  ];

  return (
    <BrandScope brand={booking.hostBrand}>
    <div className="animate-in m-auto flex w-full max-w-[520px] flex-col gap-[14px]">
      <BrandMark brand={booking.hostBrand} hostName={booking.hostName} height={20} />

      <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
        <div className="flex flex-col gap-[18px] px-[30px] pt-[30px] pb-[24px] max-[820px]:px-[22px]">
          <div className="flex items-center gap-[12px]">
            <span className="inline-flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full bg-accent text-on-accent">
              <Icon name="check" weight="solid" size={13} />
            </span>
            <h1 className="m-0 font-serif text-[30px] leading-[1.05] font-normal tracking-[-0.01em] text-ink">
              You&rsquo;re booked!
            </h1>
          </div>
          <p className="m-0 text-[13.5px] leading-[1.55] text-ink-2">
            A confirmation is on its way to {booking.guestEmail}. The invite includes the Google Meet link.
          </p>
        </div>

        <div className="border-t border-line bg-fill">
          {rows.map((row, i) => (
            <div
              key={row.key}
              className={cx(
                "flex flex-wrap gap-[12px] px-[30px] py-[10px] max-[820px]:px-[22px]",
                i > 0 && "border-t border-line-soft",
              )}
            >
              <span className="w-[82px] flex-none text-[12.5px] text-ink-3">{row.key}</span>
              <span
                className={cx(
                  "min-w-[150px] flex-1 break-words text-ink",
                  row.machine ? "text-[12.5px]" : "text-[13px] font-medium",
                )}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-[12px] border-t border-line px-[30px] pt-[22px] pb-[26px] max-[820px]:px-[22px]">
          {booking.meetUrl ? (
            <a
              href={booking.meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="unlink box-border inline-flex h-[42px] w-full cursor-pointer items-center justify-center gap-[9px] rounded-[6px] border border-accent bg-accent font-sans text-[14px] font-semibold text-on-accent no-underline hover:bg-accent-2"
            >
              <Icon name="video" size={13} />
              Join Google Meet
            </a>
          ) : null}

          <div className="flex gap-[11px] rounded-[8px] border border-accent-line bg-accent-soft px-[14px] py-[12px]">
            <Icon name="check" weight="solid" size={11} className="mt-[3px] flex-none text-accent-ink" />
            <span className="text-[12.5px] leading-[1.6] text-ink-2">
              {moved ? (
                <>
                  Moved. Both calendars now read the new time, and we emailed{" "}
                  <strong className="font-semibold text-ink">{booking.guestEmail}</strong>.
                  {booking.meetUrl ? " The same Meet link still works." : ""}
                </>
              ) : (
                <>
                  This is already on your calendar. We sent an invitation to{" "}
                  <strong className="font-semibold text-ink">{booking.guestEmail}</strong>
                  {booking.meetUrl ? " with the Meet link attached." : " with the details."}
                </>
              )}
            </span>
          </div>

          <div className="flex flex-wrap gap-[8px]">
            {/* A plain link, so it works for a guest whose calendar is not Google. */}
            <ButtonLink variant="secondary" size={34} href={`/booking/${reference}/ics`} icon="download" prefetch={false}>
              Download .ics instead
            </ButtonLink>
          </div>

          {/* Moving is offered before cancelling, and reads as the lighter of
              the two, because a guest who can move a meeting usually would. */}
          <span className="text-[12.5px] leading-[1.5] text-ink-3">
            Need to change plans? <Link href={`/booking/${reference}/reschedule`}>Move this meeting</Link> or{" "}
            <Link href={`/booking/${reference}/cancel`}>cancel it</Link>.
          </span>
        </div>
      </div>
    </div>
      <PublicFooter badge={!booking.hostUnbranded} />
    </BrandScope>
  );
}
