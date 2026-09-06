import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button-style";
import { Icon } from "@/components/ui/icon";
import { getBookingByReference } from "@/lib/booking/service";
import { formatMediumDate } from "@/lib/booking/time";

export const metadata: Metadata = {
  title: "Meeting cancelled",
  robots: { index: false, follow: false },
};

export default async function BookingCancelledPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const booking = await getBookingByReference(reference);
  if (!booking) notFound();

  const when = formatMediumDate(booking.startsAt, booking.hostTimezone);

  return (
    <div className="flex min-h-dvh items-start justify-center bg-ground p-[20px]">
      <div className="m-auto flex w-full max-w-[460px] flex-col gap-[14px]">
        <Link href="/" title="Meetrao home" className="block self-start no-underline">
          <Logo height={20} />
        </Link>

        <div className="flex flex-col gap-[16px] rounded-[12px] border border-line bg-surface p-[30px]">
          <span className="inline-flex size-[32px] flex-none items-center justify-center rounded-full border border-red-line bg-red-soft text-red">
            <Icon name="close" weight={900} size={12} />
          </span>
          <h1 className="m-0 font-serif text-[27px] leading-[1.1] font-normal tracking-[-0.01em] text-ink">
            Meeting cancelled
          </h1>
          <p className="m-0 text-[13.5px] leading-[1.55] text-pretty text-ink-2">
            Your meeting with {booking.hostName} on {when} is cancelled. The
            calendar event has been removed and the time is free again.
          </p>
          <div className="flex gap-[10px] pt-[2px]">
            <Link
              href={`/${booking.hostUsername}`}
              className={buttonClass({ size: "xl" })}
            >
              Book another time
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
