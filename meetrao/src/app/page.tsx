import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Icon, type IconName } from "@/components/ui/icon";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Meetrao — Stop asking “what time works for you?”",
  description:
    "Share one link. Meetrao reads your calendar, offers only the times you are genuinely free, and puts a Google Meet link on every booking.",
};

/* ── Content ─────────────────────────────────────────────────────────────── */

const PROOF = [
  "No double bookings",
  "Google Meet on every booking",
  "Every timezone converted",
  "One link, all your meetings",
];

const FEATURES: Array<{ glyph: IconName; title: string; text: string }> = [
  {
    glyph: "calendar",
    title: "Conflict-aware by default",
    text: "Meetrao checks your Google Calendar before it offers a slot, so nothing lands on top of what you already have.",
  },
  {
    glyph: "video",
    title: "Meet links, automatically",
    text: "Every confirmed booking creates a calendar event with its own Google Meet link, for you and your guest.",
  },
  {
    glyph: "sliders",
    title: "Rules that protect your day",
    text: "Buffers between calls, a minimum notice period, and a booking window — so nobody grabs the next ten minutes.",
  },
];

const AVAILABILITY_POINTS = [
  "Several ranges per day, for a real lunch break.",
  "Turn a day off without deleting its hours.",
  "Ninety-four timezones, searchable, correct through DST.",
];

const STEPS = [
  {
    n: "01",
    title: "Connect your calendar",
    text: "One Google permission. Meetrao reads your busy times and nothing else.",
  },
  {
    n: "02",
    title: "Describe one meeting",
    text: "A name, a length, and the hours you are free. That is the whole setup.",
  },
  {
    n: "03",
    title: "Send the link",
    text: "Your guest picks from the times that are actually open. The invite writes itself.",
  },
];

const GUEST_CHIPS: Array<{ glyph: IconName; text: string; note: string }> = [
  { glyph: "signIn", text: "No sign-up", note: "Name and email, nothing else" },
  { glyph: "calendar", text: "Add to Calendar", note: "Google, one tap" },
  { glyph: "download", text: "Download .ics", note: "For every other calendar" },
  {
    glyph: "circleXmark",
    text: "Cancel in one click",
    note: "From the confirmation itself",
  },
];

/* ── Shared bits ─────────────────────────────────────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10.5px] tracking-[0.08em] uppercase text-ink-3">
      {children}
    </span>
  );
}

function Shot({
  desktop,
  mobile,
  alt,
  priority,
}: {
  desktop: string;
  mobile: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <>
      <Image
        src={mobile}
        alt={alt}
        width={860}
        height={1600}
        priority={priority}
        className="block h-auto w-full md:hidden"
      />
      <Image
        src={desktop}
        alt={alt}
        width={2400}
        height={1500}
        priority={priority}
        className="hidden h-auto w-full md:block"
      />
    </>
  );
}

export default function LandingPage() {
  // Only promise "a live booking page" when there is actually one to open.
  const demo = publicEnv.demoUsername;
  const secondaryCta = demo
    ? { href: `/${demo}`, label: "See a live booking page", icon: true }
    : { href: "#how", label: "See how it works", icon: false };

  return (
    <div className="min-h-dvh overflow-x-clip bg-ground">
      {/* ── nav ── */}
      <header className="sticky top-0 z-50 border-b border-line bg-ground/88 backdrop-blur-[12px]">
        <div className="mx-auto flex max-w-[1160px] items-center gap-[12px] px-[20px] py-[12px] md:gap-[20px] md:px-[24px]">
          <Link href="/" className="flex-none no-underline">
            <Logo height={24} />
          </Link>
          <nav className="ml-[8px] hidden gap-[20px] md:flex">
            <a href="#features" className="text-[13.5px] text-ink-2 no-underline">
              Features
            </a>
            <a href="#how" className="text-[13.5px] text-ink-2 no-underline">
              How it works
            </a>
            <a href="#guest" className="text-[13.5px] text-ink-2 no-underline">
              For guests
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-[16px] md:gap-[24px]">
            <Link
              href="/login"
              className="inline-flex h-[44px] items-center text-[13.5px] text-ink-2 no-underline"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-[34px] items-center rounded-[6px] bg-accent px-[14px] text-[13px] font-semibold text-white no-underline transition-colors duration-[120ms] hover:bg-accent-2 hover:text-white"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── hero ── */}
      <section className="mx-auto flex max-w-[1160px] flex-col items-center gap-[22px] px-[20px] pt-[54px] text-center md:px-[24px] md:pt-[76px]">
        <h1 className="m-0 max-w-[30ch] font-serif text-[clamp(40px,11.5vw,50px)] leading-[0.98] font-normal tracking-[-0.02em] text-balance text-ink md:text-[clamp(44px,6.4vw,82px)] md:leading-none md:tracking-[-0.022em]">
          Stop asking &ldquo;what time works for you?&rdquo;
        </h1>

        <p className="m-0 max-w-[52ch] text-[clamp(15px,1.4vw,17.5px)] leading-[1.55] text-pretty text-ink-2">
          Share one link. Meetrao reads your calendar, offers only the times you
          are genuinely free, and puts a Google Meet link on every booking.
        </p>

        <div
          id="start"
          className="flex w-full flex-col gap-[9px] pt-[4px] md:w-auto md:flex-row md:flex-wrap md:justify-center"
        >
          <Link
            href="/signup"
            className="flex h-[50px] items-center justify-center gap-[9px] rounded-[8px] bg-accent px-[22px] text-[15px] font-semibold text-white no-underline transition-colors duration-[120ms] hover:bg-accent-2 hover:text-white md:h-[46px] md:rounded-[7px] md:text-[14.5px]"
          >
            Create your free account
            <Icon name="arrowRight" size={11} />
          </Link>
          <Link
            href={secondaryCta.href}
            className="flex h-[50px] items-center justify-center gap-[9px] rounded-[8px] border border-line-strong bg-surface px-[20px] text-[15px] font-semibold text-ink no-underline transition-colors duration-[120ms] hover:bg-fill hover:text-ink md:h-[46px] md:rounded-[7px] md:text-[14.5px]"
          >
            {secondaryCta.icon ? <Icon name="calendar" size={12} /> : null}
            {secondaryCta.label}
          </Link>
        </div>

        <span className="text-[12.5px] text-ink-3">
          No credit card. Two minutes to set up. Your link looks like{" "}
          <span className="font-mono text-ink-2">
            {publicEnv.bookingHost}/you
          </span>
        </span>

        <div className="relative mt-[26px] w-full md:mt-[34px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[8%] left-1/2 h-[70%] w-[min(760px,88%)] -translate-x-1/2 rounded-full bg-accent opacity-[0.11] blur-[90px]"
          />
          <div className="animate-mu-up relative overflow-hidden rounded-[20px] border border-line-strong bg-surface shadow-[var(--hero-pop)] md:rounded-[16px]">
            <Shot
              desktop="/assets/shot-booking.png"
              mobile="/assets/m-booking.png"
              alt="The Meetrao booking page: pick a date, then a time"
              priority
            />
          </div>
        </div>
      </section>

      {/* ── proof strip ── */}
      <section className="mt-[46px] border-y border-line bg-fill md:mt-[60px]">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-[10px] px-[20px] py-[16px] md:flex-row md:flex-wrap md:items-center md:justify-center md:gap-x-[26px] md:px-[24px]">
          {PROOF.map((text) => (
            <span
              key={text}
              className="inline-flex items-center gap-[9px] font-mono text-[11px] tracking-[0.06em] uppercase text-ink-2"
            >
              <Icon name="check" weight={900} size={9} className="text-accent" />
              {text}
            </span>
          ))}
        </div>
      </section>

      {/* ── features ── */}
      <section
        id="features"
        className="mx-auto flex max-w-[1160px] flex-col gap-[26px] px-[20px] pt-[58px] md:gap-[34px] md:px-[24px] md:pt-[82px]"
      >
        <div className="flex max-w-[640px] flex-col gap-[12px]">
          <Eyebrow>What you get</Eyebrow>
          <h2 className="m-0 font-serif text-[clamp(28px,7.6vw,34px)] leading-[1.06] font-normal tracking-[-0.016em] text-balance text-ink md:text-[clamp(30px,3.6vw,44px)] md:tracking-[-0.018em]">
            Scheduling that respects the calendar you already keep.
          </h2>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(258px,1fr))] gap-px overflow-hidden rounded-[12px] border border-line bg-line">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col gap-[11px] bg-surface px-[24px] pt-[26px] pb-[28px]"
            >
              <span className="inline-flex size-[34px] flex-none items-center justify-center rounded-[8px] bg-accent-soft text-accent">
                <Icon name={feature.glyph} size={15} />
              </span>
              <span className="text-[15.5px] font-semibold tracking-[-0.005em] text-ink">
                {feature.title}
              </span>
              <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">
                {feature.text}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── split: availability ── */}
      <section className="mx-auto max-w-[1160px] px-[20px] pt-[52px] md:px-[24px] md:pt-[74px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-center gap-[28px] md:gap-[40px]">
          <div className="flex min-w-0 flex-col gap-[16px]">
            <Eyebrow>Availability</Eyebrow>
            <h3 className="m-0 font-serif text-[clamp(26px,3vw,36px)] leading-[1.1] font-normal tracking-[-0.015em] text-ink">
              Set your hours once. Answer no more emails about it.
            </h3>
            <p className="m-0 text-[14.5px] leading-[1.6] text-pretty text-ink-2">
              Tick the days you work, add the ranges you want, and Meetrao
              handles the rest — including converting every slot into your
              guest&apos;s own timezone.
            </p>
            <ul className="m-0 flex list-none flex-col gap-[10px] p-0">
              {AVAILABILITY_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-[11px]">
                  <Icon
                    name="check"
                    weight={900}
                    size={10}
                    className="mt-[5px] text-accent"
                  />
                  <span className="text-[13.5px] leading-[1.55] text-ink-2">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 overflow-hidden rounded-[20px] border border-line bg-surface md:rounded-[12px]">
            <Shot
              desktop="/assets/shot-availability.png"
              mobile="/assets/m-availability.png"
              alt="Availability: seven day rows with time ranges"
            />
          </div>
        </div>
      </section>

      {/* ── split: dashboard ── */}
      <section className="mx-auto max-w-[1160px] px-[20px] pt-[52px] md:px-[24px] md:pt-[74px]">
        <div className="flex flex-col gap-[26px]">
          <div className="flex flex-wrap items-end justify-between gap-[20px]">
            <div className="flex min-w-0 max-w-[620px] flex-col gap-[13px]">
              <Eyebrow>Your day</Eyebrow>
              <h3 className="m-0 font-serif text-[clamp(26px,3vw,36px)] leading-[1.1] font-normal tracking-[-0.015em] text-ink">
                Open it once in the morning and you are done.
              </h3>
              <p className="m-0 text-[14.5px] leading-[1.6] text-pretty text-ink-2">
                Today first, this week underneath, and a Join button that goes
                straight into the call. No dashboards to interpret, no charts
                nobody asked for.
              </p>
            </div>
            <span className="inline-flex h-[27px] flex-none items-center gap-[9px] rounded-[5px] border border-line-strong bg-surface px-[11px] font-mono text-[10.5px] tracking-[0.06em] uppercase text-ink-2">
              <span className="size-[5px] rounded-full bg-accent" />
              Live product
            </span>
          </div>
          <div className="overflow-hidden rounded-[20px] border border-line-strong bg-surface md:rounded-[12px]">
            <Shot
              desktop="/assets/shot-dashboard.png"
              mobile="/assets/m-dashboard.png"
              alt="Meetrao dashboard showing today and later this week"
            />
          </div>
        </div>
      </section>

      {/* ── how it works ── */}
      <section id="how" className="mt-[58px] border-y border-line bg-fill md:mt-[82px]">
        <div className="mx-auto flex max-w-[1160px] flex-col gap-[30px] px-[20px] pt-[52px] pb-[56px] md:px-[24px] md:pt-[66px] md:pb-[70px]">
          <div className="flex max-w-[560px] flex-col gap-[12px]">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="m-0 font-serif text-[clamp(28px,7.6vw,34px)] leading-[1.06] font-normal tracking-[-0.016em] text-ink md:text-[clamp(30px,3.6vw,44px)] md:tracking-[-0.018em]">
              Three steps, then never again.
            </h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[22px]">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="flex flex-col gap-[11px] border-t-2 border-accent pt-[18px]"
              >
                <span className="font-mono text-[11px] tracking-[0.08em] text-accent">
                  {step.n}
                </span>
                <span className="text-[16px] font-semibold tracking-[-0.008em] text-ink">
                  {step.title}
                </span>
                <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">
                  {step.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── guest experience ── */}
      <section
        id="guest"
        className="mx-auto max-w-[1160px] px-[20px] pt-[52px] md:px-[24px] md:pt-[74px]"
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] items-center gap-[28px] md:gap-[40px]">
          <div className="flex min-w-0 flex-col gap-[15px]">
            <Eyebrow>For your guests</Eyebrow>
            <h3 className="m-0 font-serif text-[clamp(26px,3vw,36px)] leading-[1.1] font-normal tracking-[-0.015em] text-ink">
              Two taps and a confirmation they can trust.
            </h3>
            <p className="m-0 text-[14.5px] leading-[1.6] text-pretty text-ink-2">
              No account, no download, no timezone maths. Name, email, done —
              the invite lands with the Meet link already in it.
            </p>
            <div className="grid grid-cols-2 gap-[10px] pt-[8px]">
              {GUEST_CHIPS.map((chip) => (
                <div
                  key={chip.text}
                  className="flex items-start gap-[11px] rounded-[10px] border border-line bg-surface px-[14px] py-[13px] transition-[border-color,transform] duration-[140ms] hover:-translate-y-[2px] hover:border-accent-line"
                >
                  <span className="inline-flex size-[28px] flex-none items-center justify-center rounded-[8px] bg-accent-soft text-accent">
                    <Icon name={chip.glyph} size={12} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-[2px]">
                    <span className="text-[13px] leading-[1.25] font-semibold text-ink">
                      {chip.text}
                    </span>
                    <span className="text-[11.5px] leading-[1.4] text-ink-3">
                      {chip.note}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full min-w-0 justify-self-center overflow-hidden rounded-[20px] border border-line bg-surface md:max-w-[420px] md:rounded-[12px]">
            <Shot
              desktop="/assets/shot-confirm.png"
              mobile="/assets/m-confirm.png"
              alt="Booking confirmed, with the meeting details and a Join Google Meet button"
            />
          </div>
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="mx-auto mt-[64px] max-w-[1160px] px-[20px] md:mt-[92px] md:px-[24px]">
        <div className="flex flex-wrap items-end justify-between gap-[28px] rounded-[14px] bg-accent p-[clamp(30px,4vw,52px)]">
          <div className="flex min-w-0 flex-col gap-[12px]">
            <h2 className="m-0 font-serif text-[clamp(28px,7.6vw,34px)] leading-[1.05] font-normal tracking-[-0.016em] text-balance text-white md:text-[clamp(30px,3.8vw,46px)] md:leading-[1.04] md:tracking-[-0.018em]">
              Your calendar already knows when you are free.
            </h2>
            <p className="m-0 max-w-[44ch] text-[14.5px] leading-[1.6] text-pretty text-white/72">
              Let it do the scheduling. Claim your link and send it to the next
              person who asks.
            </p>
          </div>
          <div className="flex flex-none flex-wrap gap-[10px]">
            <Link
              href="/signup"
              className="inline-flex h-[44px] items-center justify-center gap-[9px] rounded-[7px] bg-white px-[20px] text-[14px] font-semibold text-accent no-underline transition-opacity duration-[120ms] hover:text-accent hover:opacity-90"
            >
              Get started free
              <Icon name="arrowRight" size={11} />
            </Link>
            <a
              href="#features"
              className="inline-flex h-[44px] items-center justify-center rounded-[7px] border border-white/30 px-[18px] text-[14px] font-semibold text-white no-underline transition-colors duration-[120ms] hover:bg-white/10 hover:text-white"
            >
              See the features
            </a>
          </div>
        </div>
      </section>

      {/* ── footer ── */}
      <footer className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-[16px] px-[20px] pt-[34px] pb-[44px] md:px-[24px]">
        <Logo height={20} />
        <span className="text-[12.5px] text-ink-3">© 2026 Meetrao</span>
        <div className="ml-auto flex flex-wrap gap-[18px]">
          {/* Placeholders, as in the design — these pages do not exist yet. */}
          <a
            href="#"
            className="inline-flex h-[44px] items-center text-[12.5px] text-ink-2 no-underline"
          >
            Privacy
          </a>
          <a
            href="#"
            className="inline-flex h-[44px] items-center text-[12.5px] text-ink-2 no-underline"
          >
            Terms
          </a>
          <Link
            href="/login"
            className="inline-flex h-[44px] items-center text-[12.5px] text-ink-2 no-underline"
          >
            Log in
          </Link>
        </div>
      </footer>

      {/* ── sticky action bar (mobile only) ── */}
      <div className="sticky bottom-0 z-[45] flex items-center gap-[12px] border-t border-line bg-ground/94 px-[20px] pt-[10px] pb-[12px] backdrop-blur-[12px] md:hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[13px] font-semibold text-ink">
            Claim your link
          </span>
          <span className="truncate font-mono text-[11.5px] text-ink-3">
            {publicEnv.bookingHost}/you
          </span>
        </div>
        <Link
          href="/signup"
          className="inline-flex h-[44px] flex-none items-center justify-center rounded-[7px] bg-accent px-[16px] text-[14px] font-semibold text-white no-underline hover:bg-accent-2 hover:text-white"
        >
          Get started
        </Link>
      </div>
    </div>
  );
}
