import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Avatar, Eyebrow } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { initialsOf } from "@/lib/initials";
import type { PublicHost, PublicMeetingType } from "@/lib/booking/service";

/**
 * Not in the prototype, which only ever draws a single meeting's booking page.
 * A host with more than one active meeting needs somewhere for `/:username` to
 * land, so this reuses the booking page's shell and lists what is bookable.
 */
export function MeetingChooser({
  host,
  types,
}: {
  host: PublicHost;
  types: PublicMeetingType[];
}) {
  const name = host.full_name || host.username;

  return (
    <div className="flex min-h-dvh items-start justify-center bg-ground p-[20px]">
      <div className="m-auto flex w-full max-w-[640px] flex-col gap-[14px]">
        <div className="flex items-center justify-between gap-[12px] px-[2px]">
          <Link href="/" title="Meetrao home" className="block no-underline">
            <Logo height={20} />
          </Link>
          <Eyebrow className="tracking-[0.07em]">Booking page</Eyebrow>
        </div>

        <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
          <div className="flex flex-col gap-[15px] border-b border-line bg-fill p-[30px]">
            <div className="flex items-center gap-[11px]">
              {host.avatar_url ? (
                <Image
                  src={host.avatar_url}
                  alt=""
                  width={38}
                  height={38}
                  unoptimized
                  className="size-[38px] flex-none rounded-[8px] object-cover"
                />
              ) : (
                <Avatar initials={initialsOf(name)} size={38} />
              )}
              <div className="flex min-w-0 flex-col gap-[1px]">
                <span className="text-[13.5px] font-semibold text-ink">
                  {name}
                </span>
                {host.job_title ? (
                  <span className="text-[12px] text-ink-3">
                    {host.job_title}
                  </span>
                ) : null}
              </div>
            </div>
            <h1 className="m-0 font-serif text-[31px] leading-[1.08] font-normal tracking-[-0.01em] text-pretty text-ink">
              Pick a meeting
            </h1>
            <p className="m-0 text-[13.5px] leading-[1.55] text-ink-2">
              Choose what you would like to talk about, then pick a time.
            </p>
          </div>

          <div>
            {types.map((type, i) => (
              <Link
                key={type.id}
                href={`/${host.username}/${type.slug}`}
                className={`flex items-center gap-[14px] px-[30px] py-[16px] no-underline transition-colors duration-[120ms] hover:bg-fill ${
                  i > 0 ? "border-t border-line-soft" : ""
                }`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="text-[14px] font-semibold text-ink">
                    {type.name}
                  </span>
                  {type.description ? (
                    <span className="text-[12.5px] leading-[1.45] text-pretty text-ink-3">
                      {type.description}
                    </span>
                  ) : null}
                </div>
                <span className="flex-none text-[12.5px] whitespace-nowrap text-ink-2">
                  {type.duration_minutes} min
                </span>
                <Icon name="chevronRight" size={10} className="text-ink-3" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
