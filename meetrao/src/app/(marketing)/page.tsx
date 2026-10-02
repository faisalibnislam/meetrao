import type { Metadata } from "next";
import Link from "next/link";
import { CostCalculator } from "@/components/marketing/cost-calculator";
import { Faq } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import { ImageFrame } from "@/components/marketing/image-frame";
import { LiveBookingsTable, LiveMeetingsTable } from "@/components/marketing/live-tables";
import { Reveal } from "@/components/marketing/reveal";
import { PlanComparison } from "@/components/marketing/plan-comparison";
import { Kicker } from "@/components/marketing/site-chrome";
import { UseCases } from "@/components/marketing/use-cases";
import { Walkthrough } from "@/components/marketing/walkthrough";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { cx } from "@/lib/cx";
import { DESCRIPTION, OG_IMAGE, faqLd, graph } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { FAQS } from "@/lib/faq";

/* No `title` here, deliberately. The root layout's `title.default` already
   leads with the category — which is what somebody who has never heard the name
   types — and omitting the key inherits it.

   `title: null` was the obvious way to write that and is wrong: it renders an
   EMPTY <title>, on the home page, silently. Measured, not assumed. */
export const metadata: Metadata = {
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { url: "/", images: [OG_IMAGE] },
};

const THREAD: [string, boolean][] = [
  ["Are you free Tuesday?", false],
  ["I'm busy Tuesday. Wednesday?", true],
  ["Wednesday at 3?", false],
  ["Which timezone?", true],
  ["Can we do Thursday instead?", false],
];

const RESEARCH = [
  {
    tone: "slate" as const,
    tag: "Peer-reviewed",
    figure: "23%",
    text: "Average appointment no-show rate across all specialties, from a review of 105 studies.",
    source: "Dantas et al., Health Policy, 2018 (13.2% Oceania – 43.0% Africa).",
  },
  {
    tone: "accent" as const,
    tag: "Peer-reviewed",
    figure: "Lower",
    text: "No-show rate for appointments booked online versus offline, in one practice.",
    source: "Frontiers in Digital Health, 2025. Single-practice study — not generalisable alone.",
  },
  {
    tone: "plain" as const,
    tag: "Vendor",
    figure: "Higher",
    text: "Deal-close rates among customers using its meeting scheduler.",
    source: "HubSpot, self-reported. Marketing data, not independent research.",
  },
];

const RESEARCH_TONE = {
  slate: { figure: "text-slate", tag: "border-slate-line bg-slate-soft text-slate" },
  accent: { figure: "text-accent-ink", tag: "border-accent-line bg-accent-soft text-accent-ink" },
  plain: { figure: "text-ink-2", tag: "border-line bg-fill text-ink-2" },
};

const BEFORE: [string, boolean][] = [
  ['Email: "when are you free?"', false],
  ["Reply with three options", false],
  ["Check your calendar", false],
  ["Suggest a time", false],
  ["No answer for a day", true],
  ["That slot has gone — reschedule", false],
  ["Confirm the new time", false],
  ["Send a meeting link", false],
];

const AFTER: [string, string, string, IconName][] = [
  ["01", "Share your link", "One URL, in an email signature or a DM.", "link"],
  ["02", "They pick a time", "Only times you are genuinely free, in their timezone.", "calendar"],
  ["03", "Booked", "On both calendars, with a Meet link attached.", "check"],
];

const BENEFITS: [IconName, string, string][] = [
  ["calendar", "Never double-book", "Your calendar is checked before any time is offered."],
  ["link", "They book themselves", "Send the link. Stop negotiating over email."],
  ["globe", "Timezones handled", "Guests see your hours in their own timezone."],
  ["video", "Meet links automatically", "Every online booking creates the event and its Meet link."],
  ["rotate-left", "Moving, not cancelling", "Guests pick a new time from their confirmation. Same booking, same Meet link."],
  ["bolt", "Reminders that arrive", "The day before and an hour before — to both of you."],
  ["sliders", "Your hours protected", "Buffers, minimum notice, a booking window, and days off."],
  ["tag", "Free to use, Pro when you need it", "Taking bookings costs nothing. $10 a year adds your domain, your branding and a team."],
];

/* The second row of the product section: the things that are not one-to-one
   booking. Each one is a sentence about what it does, not what it is called —
   "a team link" means nothing to somebody who has not met the idea. */
const EXTRAS: [IconName, string, string][] = [
  ["users", "One link for a team", "Bookings go to whoever is free and least recently booked. Everyone keeps their own hours and calendar."],
  ["user-plus", "Sessions several people share", "A class, a workshop, an office hour. Seats count down and the slot closes when the last one goes."],
  ["rectangle-list", "Ask what you need to know", "Up to five questions on the booking form. The answers arrive with the booking."],
  ["address-card", "Phone, in person, or your own link", "Not everything is a video call. Say where it happens and guests are told."],
  ["hashtag", "On your own site", "Paste one snippet and the booking form appears in your page, sized to fit."],
  ["palette", "Your logo, your colours", "Your mark instead of ours, an accent and a page background. None of our palette is left on the page."],
  ["globe", "Your own domain", "meeting.yourcompany.com/your-name. Point the DNS at us and the certificate is handled."],
  ["chart-line", "Read it from your own tools", "An API key reads your bookings, and a webhook tells you the moment one changes."],
];

export default function LandingPage() {
  // Read off disk at build time: a photo dropped into public/use-cases/ shows up
  // on the next deploy, with no code change.

  return (
    <>
      <Hero />

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

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how" className="mx-auto max-w-[1200px] px-[26px] pt-[72px] max-[560px]:px-[18px]">
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

        <Walkthrough />
      </section>

      {/* ── Why it matters ──────────────────────────────────────────────── */}
      <section className="mt-[72px] border-t border-b border-line bg-fill">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] items-stretch gap-[34px]">
            <Reveal className="min-w-0">
              <div className="flex flex-col gap-[14px]">
                <Kicker tone="dark">Why it matters</Kicker>
                <h2 className="m-0 font-serif text-[clamp(28px,3.6vw,42px)] leading-[1.05] font-normal tracking-[-0.02em] text-balance text-ink">
                  Scheduling isn&rsquo;t admin. It shows up in your numbers.
                </h2>

                <div className="mt-[2px] flex flex-col gap-[1px] overflow-hidden rounded-[12px] border border-line bg-line">
                  {RESEARCH.map((row) => {
                    const tone = RESEARCH_TONE[row.tone];
                    return (
                      <div
                        key={row.text}
                        className="flex flex-wrap items-center gap-[14px] bg-surface px-[16px] py-[15px]"
                      >
                        <span
                          className={cx(
                            "min-w-[76px] flex-none font-serif text-[30px] leading-[1] tracking-[-0.018em]",
                            tone.figure,
                          )}
                        >
                          {row.figure}
                        </span>
                        <div className="flex min-w-[170px] flex-1 flex-col gap-[3px]">
                          <span className="text-[13.5px] leading-[1.5] text-ink">{row.text}</span>
                          <span className="text-[11.5px] leading-[1.45] text-ink-3">{row.source}</span>
                        </div>
                        <span
                          className={cx(
                            "inline-flex h-[20px] flex-none items-center rounded-[5px] border px-[8px] text-[10px] tracking-[0.06em] uppercase",
                            tone.tag,
                          )}
                        >
                          {row.tag}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <span className="text-[12px] leading-[1.55] text-ink-3">
                  About appointment scheduling in general — not evidence about Meetrao.
                </span>
              </div>
            </Reveal>

            <Reveal delay={80} className="min-w-0 self-start">
              <CostCalculator />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Before & after ──────────────────────────────────────────────── */}
      <section id="compare" className="border-t border-line bg-[#E7E3DC]">
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

      {/* ── What you get ────────────────────────────────────────────────── */}
      <section id="product" className="mx-auto max-w-[1200px] px-[26px] py-[72px] max-[560px]:px-[18px]">
        <Reveal>
          <div className="flex max-w-[620px] flex-col gap-[11px]">
            <Kicker tone="dark">What you get</Kicker>
            <h2 className="m-0 font-serif text-[clamp(28px,3.8vw,44px)] leading-[1.04] font-normal tracking-[-0.02em] text-balance text-ink">
              Scheduling that respects the calendar you already keep.
            </h2>
          </div>
        </Reveal>

        <div className="mt-[26px] grid grid-cols-[repeat(auto-fit,minmax(min(288px,100%),1fr))] gap-[18px]">
          {BENEFITS.map(([glyph, title, text]) => (
            <div
              key={title}
              className="flex flex-col gap-[10px] rounded-[14px] border border-line bg-surface px-[22px] pt-[22px] pb-[24px] transition-colors duration-[120ms] hover:border-accent-line"
            >
              <span className="inline-flex h-[32px] w-[32px] flex-none items-center justify-center rounded-[9px] bg-accent-soft text-accent-ink">
                <Icon name={glyph} size={14} />
              </span>
              <span className="text-[14.5px] font-semibold tracking-[-0.005em] text-ink">{title}</span>
              <span className="text-[13px] leading-[1.55] text-pretty text-ink-2">{text}</span>
            </div>
          ))}
        </div>

        <Reveal className="mt-[34px]">
          <div className="flex max-w-[620px] flex-col gap-[11px]">
            <Kicker tone="dark">And when one link is not enough</Kicker>
            <h2 className="m-0 font-serif text-[clamp(24px,3vw,34px)] leading-[1.06] font-normal tracking-[-0.02em] text-balance text-ink">
              The parts you reach for later.
            </h2>
          </div>
        </Reveal>

        <div className="mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(min(288px,100%),1fr))] gap-[18px]">
          {EXTRAS.map(([glyph, title, text]) => (
            <div
              key={title}
              className="flex flex-col gap-[10px] rounded-[14px] border border-line bg-fill px-[22px] pt-[22px] pb-[24px] transition-colors duration-[120ms] hover:border-accent-line"
            >
              <span className="inline-flex h-[32px] w-[32px] flex-none items-center justify-center rounded-[9px] bg-surface text-accent-ink">
                <Icon name={glyph} size={14} />
              </span>
              <span className="text-[14.5px] font-semibold tracking-[-0.005em] text-ink">{title}</span>
              <span className="text-[13px] leading-[1.55] text-pretty text-ink-2">{text}</span>
            </div>
          ))}
        </div>

        <Reveal className="mt-[30px]">
          <div className="flex flex-col gap-[16px]">
            <LiveMeetingsTable />
            <LiveBookingsTable />
          </div>
        </Reveal>
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

      {/* ── pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[72px] max-[560px]:px-[18px]">
          <Reveal>
            <div className="flex max-w-[640px] flex-col gap-[11px]">
              <Kicker tone="dark">Pricing</Kicker>
              <h2 className="m-0 font-serif text-[clamp(28px,3.8vw,44px)] leading-[1.04] font-normal tracking-[-0.02em] text-balance text-ink">
                Free to take bookings. $10 a year to make it yours.
              </h2>
              <p className="m-0 text-[14.5px] leading-[1.6] text-pretty text-ink-2">
                The whole booking product is free — link, calendar, reminders, rescheduling. Pro is for
                running a business on it.
              </p>
            </div>
          </Reveal>

          <Reveal className="mt-[26px]">
            <PlanComparison footnote={false} />
            <div className="mt-[18px] flex flex-wrap items-center gap-[12px]">
              <ButtonLink variant="accent" size={40} href="/signup">
                Start free
              </ButtonLink>
              <ButtonLink variant="secondary" size={40} href="/pricing">
                Compare in full
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      {/* Built from the same FAQS array the section below renders, so the
          machine-readable answers and the ones a person reads cannot drift.
          Google stopped showing FAQ rich results for most sites in 2023; this
          is here for the retrieval systems that do read it — a model asked
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
