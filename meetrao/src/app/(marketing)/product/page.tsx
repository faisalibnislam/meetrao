import type { Metadata } from "next";
import Link from "next/link";
import { dayKey } from "@/components/marketing/demo-date";
import { ImageFrame } from "@/components/marketing/image-frame";
import { LiveBookingsTable, LiveMeetingsTable } from "@/components/marketing/live-tables";
import { Reveal } from "@/components/marketing/reveal";
import { Kicker } from "@/components/marketing/site-chrome";
import { JsonLd } from "@/components/seo/json-ld";
import { Icon, type IconName } from "@/components/ui/icon";
import { cx } from "@/lib/cx";
import { OG_IMAGE, breadcrumbLd, graph } from "@/lib/seo";

/* ─────────────────────────────────────────────────────────────────────────────
   /product: the long version of the landing page.

   The landing page had grown to thirteen sections, and a visitor deciding
   whether this is the kind of thing they want does not need thirteen. It now
   says what the product is, how it works, what you get, who it is for and what
   it costs, and stops.

   What it gave up is here rather than deleted, because each part is worth
   seeing for somebody who has already decided to look closer: the problem
   (the email thread), the before and after, and the two live tables, which
   are the nearest thing on the site to the product itself.

   Not moved, on purpose: the "why it matters" figures and the cost
   calculator. The figures were "Lower" and "Higher" with no number beside
   them and a disclaimer under each one saying not to rely on it, and the
   calculator ended on "Meetrao: $0" next to two paid plans. Neither is worth
   a second page.
   ───────────────────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "How booking works, screen by screen",
  description:
    "The email thread Meetrao replaces, eight steps cut to three, and live copies of the Meetings " +
    "and Bookings screens you can click through.",
  alternates: { canonical: "/product" },
  openGraph: {
    images: [OG_IMAGE],
    type: "website",
    title: "Meetrao: how booking works, screen by screen",
    description:
      "The email thread it replaces, eight steps cut to three, and the Meetings and Bookings screens, live.",
    url: "/product",
  },
};

const THREAD: [string, boolean][] = [
  ["Are you free Tuesday?", false],
  ["I'm busy Tuesday. Wednesday?", true],
  ["Wednesday at 3?", false],
  ["Which timezone?", true],
  ["Can we do Thursday instead?", false],
];

const BEFORE: [string, boolean][] = [
  ['Email: "when are you free?"', false],
  ["Reply with three options", false],
  ["Check your calendar", false],
  ["Suggest a time", false],
  ["No answer for a day", true],
  ["That slot has gone: reschedule", false],
  ["Confirm the new time", false],
  ["Send a meeting link", false],
];

const AFTER: [string, string, string, IconName][] = [
  ["01", "Share your link", "One URL, in an email signature or a DM.", "link"],
  ["02", "They pick a time", "Only times you are genuinely free, in their timezone.", "calendar"],
  ["03", "Booked", "On both calendars, with a Meet link attached.", "check"],
];

/** Read once per render. On this static page that is the build, and the
    tables swap in the visitor's own day after hydration (see demo-date.ts).
    Outside the component so the read is plainly not part of rendering. */
function renderDay(): string {
  return dayKey(new Date());
}

export default function ProductPage() {
  const today = renderDay();

  return (
    <>
      <JsonLd
        json={graph(
          breadcrumbLd([
            ["Meetrao", "/"],
            ["Product", "/product"],
          ]),
        )}
      />

      {/* ── heading ─────────────────────────────────────────────────────── */}
      <section className="bg-[#F4F3ED]">
        <div className="mx-auto max-w-[1200px] px-[26px] pt-[72px] pb-[48px] max-[560px]:px-[18px] max-[560px]:pt-[48px]">
          <div className="flex max-w-[760px] flex-col gap-[14px]">
            <Kicker tone="dark">Product</Kicker>
            <h1 className="m-0 font-serif text-[clamp(32px,4.6vw,54px)] leading-[1.03] font-normal tracking-[-0.02em] text-balance text-ink">
              What booking a meeting looks like, before and after.
            </h1>
            <p className="m-0 max-w-[60ch] text-[16px] leading-[1.6] text-pretty text-ink-2">
              The thread Meetrao replaces, the steps it removes, and the two screens you would use every
              day. The tables at the bottom are live: toggle a meeting, copy a link, switch tabs. Nothing is
              saved.
            </p>
          </div>
        </div>
      </section>

      {/* ── The problem ─────────────────────────────────────────────────── */}
      <section className="bg-accent-2">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] items-center gap-[36px] px-[26px] py-[68px] max-[560px]:px-[18px]">
          <Reveal className="min-w-0">
            <div className="flex flex-col gap-[13px]">
              <Kicker>The problem</Kicker>
              <h2 className="m-0 font-serif text-[clamp(30px,4.2vw,50px)] leading-[1.03] font-normal tracking-[-0.02em] text-balance text-white">
                Scheduling shouldn&rsquo;t be a conversation.
              </h2>
              <p className="m-0 max-w-[44ch] text-[15px] leading-[1.6] text-pretty text-white/80">
                Timezone confusion, double bookings, meetings that slip a week waiting on a reply. It repeats
                for every meeting, with every person.
              </p>
              <div className="flex flex-col gap-[2px] pt-[8px]">
                <span className="font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.05] text-white/55">
                  You don&rsquo;t need another thread.
                </span>
                <span className="font-serif text-[clamp(30px,4vw,46px)] leading-[1.05] tracking-[-0.02em] text-white">
                  You need one link.
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={80} className="min-w-0">
            <div className="flex flex-col gap-[11px] rounded-[14px] border border-line bg-surface px-[24px] pt-[24px] pb-[22px]">
              <div className="mb-[2px] flex items-center gap-[12px] border-b border-line-soft pb-[13px]">
                <span className="flex flex-none">
                  <ImageFrame
                    label="Guest"
                    avatar
                    src="/people/chat-guest.webp"
                    sizes="34px"
                    className="h-[34px] w-[34px] shadow-[0_0_0_2px_var(--surface)]"
                    rounded="rounded-full"
                  />
                  <ImageFrame
                    label="Host"
                    avatar
                    src="/people/chat-host.webp"
                    sizes="34px"
                    className="-ml-[11px] h-[34px] w-[34px] shadow-[0_0_0_2px_var(--surface)]"
                    rounded="rounded-full"
                    ground="bg-accent-soft"
                  />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
                  <span className="text-[13.5px] font-semibold text-ink">Priya Nair &amp; you</span>
                  <span className="text-[12px] text-ink-3">Trying to find half an hour</span>
                </div>
                <span className="flex-none text-[10px] tracking-[0.06em] text-ink-3 uppercase">
                  Thu–Mon
                </span>
              </div>

              {THREAD.map(([text, mine], i) => (
                <div key={i} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                  <span
                    className={cx(
                      "max-w-[82%] px-[14px] py-[10px] text-[13.5px] leading-[1.5]",
                      mine
                        ? "rounded-[14px_14px_4px_14px] bg-accent text-on-accent"
                        : "rounded-[14px_14px_14px_4px] border border-line bg-fill text-ink",
                    )}
                  >
                    {text}
                  </span>
                </div>
              ))}

              <div className="mt-[2px] flex items-center gap-[12px] border-t border-line-soft pt-[13px]">
                <span className="font-serif text-[32px] leading-[1] text-ink">5</span>
                <span className="text-[13.5px] leading-[1.45] text-ink-2">
                  messages later, and still
                  <br />
                  nothing on the calendar.
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Before & after ──────────────────────────────────────────────── */}
      <section id="compare" className="bg-[#E7E3DC]">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <Reveal>
            <div className="flex max-w-[600px] flex-col gap-[11px]">
              <Kicker tone="dark">Before &amp; after</Kicker>
              <h2 className="m-0 font-serif text-[clamp(28px,3.8vw,44px)] leading-[1.04] font-normal tracking-[-0.02em] text-balance text-ink">
                Eight steps become three.
              </h2>
            </div>
          </Reveal>

          <div className="mt-[26px] grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] items-stretch gap-[16px]">
            <Reveal className="min-w-0">
              <div className="flex h-full flex-col overflow-hidden rounded-[14px] border border-red-line bg-surface">
                <div className="flex flex-wrap items-center gap-[10px] border-b border-red-line bg-red-soft px-[18px] py-[14px]">
                  <span className="inline-flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-red text-white">
                    <Icon name="xmark" weight="solid" size={11} />
                  </span>
                  <span className="min-w-0 flex-1 text-[14.5px] font-semibold text-red">The email thread</span>
                  <span className="flex-none text-[10.5px] tracking-[0.06em] text-red-ink uppercase">
                    Days, not minutes
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-[5px] px-[18px] pt-[16px] pb-[18px]">
                  {BEFORE.map(([label, waiting], i) => (
                    <div
                      key={label}
                      style={{ marginLeft: i * 7 }}
                      className={cx(
                        "flex items-center gap-[11px] rounded-[8px] border px-[10px] py-[7px]",
                        waiting ? "border-red-line bg-red-soft" : "border-line bg-fill",
                      )}
                    >
                      <span
                        className={cx(
                          "flex-none text-[10.5px] tracking-[0.05em]",
                          waiting ? "text-red" : "text-ink-3",
                        )}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 text-[13.5px] text-ink">{label}</span>
                      {waiting ? (
                        <span className="flex-none text-[10px] tracking-[0.05em] text-red uppercase">
                          waiting
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-[16px] border-t border-red-line bg-red-soft px-[18px] py-[13px]">
                  {[
                    ["8", "Steps"],
                    ["2", "People"],
                    ["~2 days", "Elapsed"],
                  ].map(([value, label]) => (
                    <div key={label} className="flex flex-col gap-[1px]">
                      <span className="font-serif text-[22px] leading-[1] text-red">{value}</span>
                      <span className="text-[10px] tracking-[0.06em] text-red-ink uppercase">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={100} className="min-w-0">
              <div className="flex h-full flex-col overflow-hidden rounded-[16px] bg-accent-2">
                <div className="flex flex-wrap items-center justify-between gap-[12px] border-b border-white/15 px-[20px] py-[15px]">
                  <span className="inline-flex items-center gap-[10px] text-[13.5px] font-semibold text-white">
                    <Icon name="check" size={13} className="text-[#7FD8C4]" />
                    With Meetrao
                  </span>
                  <span className="text-[10px] font-medium tracking-[0.1em] text-[#7FD8C4] uppercase">
                    Minutes, not days
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-center px-[20px] pt-[6px] pb-[12px]">
                  {AFTER.map(([n, label, text, glyph], i) => (
                    <div
                      key={n}
                      className={cx(
                        "flex items-center gap-[14px] py-[17px]",
                        i > 0 && "border-t border-white/15",
                      )}
                    >
                      <span className="w-[40px] flex-none font-serif text-[30px] leading-[1] tracking-[-0.016em] text-[#7FD8C4]">
                        {n}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                        <span className="text-[15px] font-semibold tracking-[-0.005em] text-white">{label}</span>
                        <span className="text-[13px] leading-[1.5] text-pretty text-white/70">{text}</span>
                      </div>
                      <Icon name={glyph} size={14} className="flex-none text-white/50" />
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-[16px] border-t border-white/15 bg-white/5 px-[20px] py-[13px]">
                  {[
                    ["3", "Steps"],
                    ["1", "Link"],
                    ["~30 sec", "Elapsed"],
                  ].map(([value, label]) => (
                    <div key={label} className="flex flex-col gap-[1px]">
                      <span className="font-serif text-[22px] leading-[1] text-white">{value}</span>
                      <span className="text-[10px] tracking-[0.06em] text-[#7FD8C4] uppercase">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── The live tables ───────────────────────────────────────────────
          The one part of the site that is the real product rather than a
          description of it. On the light ground, so it reads as a screen
          rather than as another band of marketing. */}
      <section id="screens" className="border-t border-line bg-[#F4F3ED]">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <Reveal>
            <div className="flex max-w-[620px] flex-col gap-[11px]">
              <Kicker tone="dark">The screens</Kicker>
              <h2 className="m-0 font-serif text-[clamp(28px,3.8vw,44px)] leading-[1.04] font-normal tracking-[-0.02em] text-balance text-ink">
                Your meetings and your bookings, as you would see them.
              </h2>
            </div>
          </Reveal>

          <Reveal>
            <div className="flex flex-col gap-[16px]">
              <LiveMeetingsTable />
              <LiveBookingsTable today={today} />
            </div>
          </Reveal>

          <div className="mt-[28px] flex flex-wrap items-center gap-[12px]">
            <Link
              href="/signup"
              className="unlink inline-flex h-[44px] items-center rounded-[8px] bg-accent px-[18px] text-[14px] font-semibold whitespace-nowrap text-on-accent no-underline hover:bg-accent-2 hover:text-on-accent"
            >
              Create a free account
            </Link>
            <Link
              href="/pricing"
              className="unlink inline-flex h-[44px] items-center rounded-[8px] border border-line-strong bg-surface px-[18px] text-[14px] font-semibold text-ink no-underline hover:bg-fill"
            >
              Compare plans
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
