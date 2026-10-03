import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { Kicker } from "@/components/marketing/site-chrome";
import { Icon } from "@/components/ui/icon";
import { COMPARISONS } from "@/lib/comparisons";
import { LIMITS } from "@/lib/pricing";
import { OG_IMAGE, breadcrumbLd, graph } from "@/lib/seo";

/* ─────────────────────────────────────────────────────────────────────────────
   The hub the comparison pages were missing.

   The comparison pages linked to nothing, which is a handful of pages on
   their own rather than a cluster. This is the pillar: one page for the plural
   query, pointing at each comparison and carrying the part that is true
   whichever tool somebody is leaving.

   IT REPEATS THE LIMITS. A page called "alternatives" is read by somebody
   deciding whether to switch, and the fastest way to lose that reader is to
   let them find out after signing up. The same list is on /pricing; saying it
   twice costs nothing and leaving it off here would be a choice.

   No session read and no chrome of its own: the marketing layout supplies the
   nav and footer, and reading the session here would opt the page out of
   static rendering for no gain.
   ───────────────────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  /* The plural query ("calendly alternatives") is the one this page exists
     for, so it leads. The template appends " · Meetrao", which is why the
     brand is not in the string. */
  title: "Free Calendly, Cal.com and Acuity alternatives",
  description:
    "Honest comparisons with the schedulers people leave, including where each of them is still " +
    "the better choice. Free to take bookings, $30 a year for Pro.",
  alternates: { canonical: "/alternatives" },
  openGraph: {
    images: [OG_IMAGE],
    type: "website",
    title: "Meetrao: a free alternative to the big schedulers",
    description:
      "Comparisons that say where the other tool is better, first. Free to take bookings, $30 a year for a domain and your own branding.",
    url: "/alternatives",
  },
};

export default function AlternativesPage() {
  return (
    <>
      <JsonLd
        json={graph(
          breadcrumbLd([
            ["Meetrao", "/"],
            ["Alternatives", "/alternatives"],
          ]),
        )}
      />

      <section className="bg-[#F4F3ED]">
        <div className="mx-auto max-w-[1200px] px-[26px] pt-[72px] pb-[56px] max-[560px]:px-[18px] max-[560px]:pt-[48px]">
          <div className="flex max-w-[760px] flex-col gap-[14px]">
            <Kicker tone="dark">Alternatives</Kicker>
            <h1 className="m-0 font-serif text-[clamp(32px,4.6vw,54px)] leading-[1.03] font-normal tracking-[-0.02em] text-balance text-ink">
              An honest look at the schedulers people leave
            </h1>
            <p className="m-0 text-[16px] leading-[1.6] text-pretty text-ink-2">
              Each comparison below says where the other tool is better, first,
              before it says anything else. Meetrao is smaller than most of
              them. That is the argument, not a thing to admit at the end.
            </p>
          </div>

          <div className="mt-[30px] grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-[16px]">
            {COMPARISONS.map((c) => (
              <Link
                key={c.slug}
                href={`/vs/${c.slug}`}
                className="unlink flex flex-col gap-[10px] rounded-[14px] border border-line bg-surface px-[22px] pt-[20px] pb-[22px] no-underline transition-colors duration-[120ms] hover:border-accent-line"
              >
                <span className="text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">
                  Meetrao vs {c.competitor}
                </span>
                <span className="text-[15px] leading-[1.45] font-semibold tracking-[-0.008em] text-ink">
                  {c.summary[0]}
                </span>
                <span className="mt-[2px] inline-flex items-center gap-[7px] text-[13.5px] font-semibold text-accent-ink">
                  Read the comparison
                  <Icon name="arrow-right" size={12} className="flex-none" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* The part that does not change with whichever tool they are on. */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <h2 className="m-0 font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
            What Meetrao does not do
          </h2>
          <p className="mt-[10px] mb-[22px] max-w-[640px] text-[14px] leading-[1.6] text-pretty text-ink-2">
            True of every comparison on this page, and worth knowing before you
            move rather than after.
          </p>
          <div className="grid max-w-[900px] grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-[14px]">
            {LIMITS.map(([title, body]) => (
              <div
                key={title}
                className="flex flex-col gap-[7px] rounded-[10px] border border-line bg-fill px-[16px] py-[15px]"
              >
                <span className="text-[14px] font-semibold text-ink">
                  {title}
                </span>
                <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">
                  {body}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-[32px] flex max-w-[900px] flex-wrap items-center gap-[12px] rounded-[10px] border border-accent-line bg-accent-soft px-[18px] py-[16px]">
            <span className="min-w-[220px] flex-1 text-[14.5px] leading-[1.5] text-ink">
              Free, no card, nothing to cancel. Three screens and your link
              works.
            </span>
            <Link
              href="/signup"
              className="unlink inline-flex h-[42px] flex-none items-center rounded-[8px] bg-accent px-[18px] text-[14px] font-semibold whitespace-nowrap text-on-accent no-underline hover:bg-accent-2 hover:text-on-accent"
            >
              Create a free account
            </Link>
            <Link
              href="/pricing"
              className="unlink inline-flex h-[42px] flex-none items-center rounded-[8px] border border-line-strong bg-surface px-[18px] text-[14px] font-semibold text-ink no-underline hover:bg-fill"
            >
              See every feature
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
