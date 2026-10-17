import type { Metadata } from "next";
import Link from "next/link";
import { dayKey } from "@/components/marketing/demo-date";
import { Faq } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import { Reveal } from "@/components/marketing/reveal";
import { PricingBand, PricingBandActions } from "@/components/marketing/pricing-band";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { Kicker } from "@/components/marketing/site-chrome";
import { UseCases } from "@/components/marketing/use-cases";
import { Walkthrough } from "@/components/marketing/walkthrough";
import { Icon } from "@/components/ui/icon";
import { DESCRIPTION, OG_IMAGE, faqLd, graph } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { FAQS } from "@/lib/faq";

/* No `title` here, deliberately. The root layout's `title.default` already
   leads with the category (which is what somebody who has never heard the name
   types) and omitting the key inherits it.

   `title: null` was the obvious way to write that and is wrong: it renders an
   EMPTY <title>, on the home page, silently. Measured, not assumed. */
export const metadata: Metadata = {
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { url: "/", images: [OG_IMAGE] },
};

/* ── what this page is ─────────────────────────────────────────────────────

   Six sections and the footer: hero, how it works, what you get, use cases,
   pricing, FAQ. It was thirteen, and every one of the extra seven was
   individually defensible and collectively the reason nobody reached the
   price.

   Where the rest went:
   - the problem, before and after, and the two live tables: /product, which
     the nav links as "Product" and the "See it up close" link under What you
     get points at. Worth seeing for somebody who has decided to look closer; not worth
     scrolling past for somebody who has not.
   - "why it matters" and the cost calculator: deleted, not moved. The figures
     were "Lower" and "Higher" without a number, each with a disclaimer under
     it saying not to rely on it, and the calculator ended on "Meetrao: $0"
     beside two paid plans. A page whose pricing has to be believed cannot
     carry either.

   The section ids are what the nav and footer link to (#how, #product,
   #usecases, #pricing, #faq). Renaming one breaks a link on every page of the
   site, silently, because a missing fragment still loads the page. */

/** The day the demos open on. On this static page that is the build day; the
    browser replaces it with its own after hydration (see demo-date.ts).
    Outside the component so the read is plainly not part of rendering. */
function renderDay(): string {
  return dayKey(new Date());
}

export default function LandingPage() {
  const today = renderDay();

  return (
    <>
      <Hero today={today} />

      {/* ── How it works ────────────────────────────────────────────────── */}
      {/* Full-bleed: the band paints edge to edge and carries the 1200px
          column inside it, rather than the section BEING that column: a
          centred section cannot have a background that reaches the window. */}
      <section id="how" className="bg-[#E7E3DC]">
        <div className="mx-auto max-w-[1200px] px-[26px] pt-[72px] pb-[72px] max-[560px]:px-[18px]">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-[16px]">
              <div className="flex min-w-0 max-w-[640px] flex-col gap-[11px]">
                <Kicker tone="dark">How it works</Kicker>
                <h2 className="m-0 font-serif text-[clamp(30px,4.2vw,50px)] leading-[1.03] font-normal tracking-[-0.02em] text-balance text-ink">
                  One link. One booking. Zero back-and-forth.
                </h2>
              </div>
            </div>
          </Reveal>

          <Walkthrough today={today} />
        </div>
      </section>

      {/* ── What you get ─────────────────────────────────────────────────
          The showcase and nothing else. This section was two grids of sixteen
          cards, then one grid of twelve, then six: each round made it shorter
          and it was still a wall. A reader scanning a landing page is deciding
          whether this is the kind of thing they want, not auditing a feature
          list, and the four panels answer that. "Does it do X" is a different
          question and /pricing is built to answer it. */}
      <section id="product" className="mx-auto max-w-[1200px] px-[26px] py-[72px] max-[560px]:px-[18px]">
        <Reveal>
          <div className="flex max-w-[620px] flex-col gap-[11px]">
            <Kicker tone="dark">What you get</Kicker>
            <h2 className="m-0 font-serif text-[clamp(28px,3.8vw,44px)] leading-[1.04] font-normal tracking-[-0.02em] text-balance text-ink">
              Scheduling that respects the calendar you already keep.
            </h2>
          </div>
        </Reveal>

        <Reveal className="mt-[26px]">
          <ProductShowcase />
        </Reveal>

        {/* The way into what this page no longer carries. One quiet link,
            not a band of its own: a section that only points elsewhere is
            the kind of section this page just lost seven of. */}
        <div className="mt-[22px]">
          <Link
            href="/product"
            className="inline-flex min-h-[40px] items-center gap-[7px] text-[13.5px] font-semibold text-accent-ink"
          >
            See it up close: the before and after, and the live screens
            <Icon name="arrow-right" size={12} className="flex-none" />
          </Link>
        </div>
      </section>

      {/* ── Use cases ─────────────────────────────────────────────────────
          Full-bleed and dark: the band paints its own ground and runs the
          marquee edge to edge, so it takes no centred column here. The heading
          and the three notes carry their own 1200px column inside it. */}
      <section id="usecases">
        <Reveal>
          <UseCases />
        </Reveal>
      </section>

      {/* ── pricing ─────────────────────────────────────────────────────
          Dark, and compact. The full comparison moved to the button: see
          src/components/marketing/pricing-band.tsx for why a table is the
          wrong thing mid-scroll.

          All three plans, because all three are on sale. This section used
          to show Free and Pro only, so the one plan that holds a team was
          invisible on the page most people decide from.

          A darker green than --accent-2, which the use-cases band above it
          already uses. Two adjacent sections in the same green read as one
          very long section, and this one is asking for a decision.

          No border-top: --line is a warm light grey meant for light ground,
          and against dark green it drew a visible hairline between the two
          bands. The change in green is the separation. */}
      <section id="pricing" className="bg-[#082620]">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[60px] max-[560px]:px-[18px]">
          <Reveal>
            <div className="flex max-w-[680px] flex-col gap-[10px]">
              <Kicker>Pricing</Kicker>
              <h2 className="m-0 font-serif text-[clamp(26px,3.4vw,38px)] leading-[1.05] font-normal tracking-[-0.02em] text-balance text-white">
                Free to take bookings. Pay to make it yours, or to run a team on it.
              </h2>
              <p className="m-0 max-w-[56ch] text-[14.5px] leading-[1.6] text-pretty text-white/70">
                The whole booking product is free, with no card: link, calendar, reminders, rescheduling.
                Pro is for running a business on it. Business is for running several, with other people on
                them.
              </p>
            </div>
          </Reveal>

          <Reveal className="mt-[26px]">
            <PricingBand />
            <div className="mt-[20px]">
              <PricingBandActions />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      {/* Built from the same FAQS array the section below renders, so the
          machine-readable answers and the ones a person reads cannot drift.
          Google stopped showing FAQ rich results for most sites in 2023; this
          is here for the retrieval systems that do read it. A model asked
          "is Meetrao free?" gets Meetrao's own careful answer rather than a
          paraphrase of the marketing copy. */}
      <JsonLd json={graph(faqLd(FAQS))} />
      <section id="faq" className="border-t border-line bg-[#F4F3ED]">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[64px] max-[560px]:px-[18px]">
          <Reveal>
            <div className="flex max-w-[620px] flex-col gap-[11px]">
              <Kicker tone="dark">FAQ</Kicker>
              <h2 className="m-0 font-serif text-[clamp(28px,3.8vw,44px)] leading-[1.04] font-normal tracking-[-0.02em] text-ink">
                Questions people actually ask.
              </h2>
            </div>
          </Reveal>

          <Faq />

          <div className="mt-[16px] flex flex-wrap items-center gap-[14px] rounded-[12px] border border-line bg-surface px-[18px] py-[15px]">
            <span className="min-w-[210px] flex-1 text-[13.5px] leading-[1.55] text-ink-2">
              Something not answered here?
            </span>
            {/* flex-initial for the same reason as the footer's CTA row: a
                non-shrinking flex container cannot wrap its own children. */}
            <div className="flex min-w-0 flex-initial flex-wrap gap-[9px]">
              <Link
                href="/help"
                className="unlink inline-flex h-[36px] items-center rounded-[7px] border border-line-strong bg-surface px-[13px] text-[13px] font-semibold text-ink hover:bg-fill-2 hover:text-ink"
              >
                Help centre
              </Link>
              <Link
                href="/support"
                className="unlink inline-flex h-[36px] items-center rounded-[7px] border border-line-strong bg-surface px-[13px] text-[13px] font-semibold text-ink hover:bg-fill-2 hover:text-ink"
              >
                Contact support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
