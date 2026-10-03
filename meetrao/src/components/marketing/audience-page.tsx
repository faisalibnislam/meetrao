import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Kicker } from "./site-chrome";
import { Reveal } from "./reveal";
import { AUDIENCES, type Audience } from "@/lib/audiences";

/* ─────────────────────────────────────────────────────────────────────────────
   One layout, four audience pages.

   Same order of argument as the comparison pages, and for the same reason:
   what it does, then what it will not do, then where to go if that was
   disqualifying. A page that only lists strengths is read as a page that only
   lists strengths.

   The cross-links at the foot are to the other three. Four pages that each
   point only back at the home page are four leaves, and a reader who is half a
   consultant and half an agency should be able to move between them.
   ───────────────────────────────────────────────────────────────────────────── */

export function AudiencePage({ data }: { data: Audience }) {
  const others = AUDIENCES.filter((a) => a.slug !== data.slug);

  return (
    <>
      {/* ── opening ───────────────────────────────────────────────────────── */}
      <section className="bg-[#F4F3ED]">
        <div className="mx-auto max-w-[1200px] px-[26px] pt-[72px] pb-[56px] max-[560px]:px-[18px] max-[560px]:pt-[48px]">
          <div className="flex max-w-[760px] flex-col gap-[14px]">
            {/* The slug, not the title. The title is forty characters of
                search-result copy and reads as shouting in a kicker. */}
            <Kicker tone="dark">{`For ${data.slug}`}</Kicker>
            <h1 className="m-0 font-serif text-[clamp(30px,4.2vw,50px)] leading-[1.04] font-normal tracking-[-0.02em] text-balance text-ink">
              {data.heading}
            </h1>
            {data.intro.map((paragraph) => (
              <p key={paragraph} className="m-0 text-[16px] leading-[1.6] text-pretty text-ink-2">
                {paragraph}
              </p>
            ))}

            <div className="mt-[10px] flex flex-wrap items-center gap-[10px]">
              <Link
                href="/signup"
                className="unlink inline-flex h-[44px] items-center rounded-[8px] bg-accent px-[18px] text-[14px] font-semibold whitespace-nowrap text-on-accent no-underline hover:bg-accent-2 hover:text-on-accent"
              >
                Start free
              </Link>
              <Link
                href="/#how"
                className="unlink inline-flex h-[44px] items-center rounded-[8px] border border-line-strong bg-surface px-[18px] text-[14px] font-semibold text-ink no-underline hover:bg-fill"
              >
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── what it does for this reader ──────────────────────────────────── */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <Reveal>
            <h2 className="m-0 mb-[22px] font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
              What it does for you
            </h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-[14px]">
              {data.does.map(([title, body]) => (
                <div
                  key={title}
                  className="flex flex-col gap-[7px] rounded-[10px] border border-accent-line bg-accent-soft px-[16px] py-[15px]"
                >
                  <span className="text-[14px] font-semibold text-ink">{title}</span>
                  <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">{body}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── and what it will not ──────────────────────────────────────────── */}
      <section className="border-t border-line bg-[#F4F3ED]">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <Reveal>
            <h2 className="m-0 font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
              What it will not do for you
            </h2>
            <p className="mt-[10px] mb-[22px] max-w-[640px] text-[14px] leading-[1.6] text-ink-2">
              Here rather than at the end, so anybody this rules out finds out before connecting a
              calendar.
            </p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-[14px]">
              {data.cannot.map(([title, body]) => (
                <div
                  key={title}
                  className="flex flex-col gap-[7px] rounded-[10px] border border-line bg-fill px-[16px] py-[15px]"
                >
                  <span className="text-[14px] font-semibold text-ink">{title}</span>
                  <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">{body}</span>
                </div>
              ))}
            </div>

            {data.insteadSee ? (
              <p className="mt-[18px] max-w-[660px] text-[14px] leading-[1.6] text-pretty text-ink-2">
                If one of those decided it for you, the page that goes into it is{" "}
                <Link href={data.insteadSee.href}>{data.insteadSee.label}</Link>.
              </p>
            ) : null}
          </Reveal>
        </div>
      </section>

      {/* ── questions ─────────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <Reveal>
            <h2 className="m-0 mb-[20px] font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
              Questions
            </h2>
            <div className="flex max-w-[760px] flex-col gap-[16px]">
              {data.faq.map(([question, answer]) => (
                <div key={question} className="flex flex-col gap-[5px]">
                  <h3 className="m-0 text-[15px] font-semibold text-ink">{question}</h3>
                  <p className="m-0 text-[14px] leading-[1.6] text-pretty text-ink-2">{answer}</p>
                </div>
              ))}
            </div>

            <nav
              aria-label="Other kinds of work"
              className="mt-[30px] flex max-w-[760px] flex-wrap items-center gap-[10px]"
            >
              {others.map((a) => (
                <Link
                  key={a.slug}
                  href={`/for/${a.slug}`}
                  className="unlink inline-flex items-center gap-[7px] rounded-[8px] border border-line bg-fill px-[13px] py-[8px] text-[13px] font-semibold text-ink no-underline capitalize hover:bg-surface"
                >
                  For {a.slug}
                  <Icon name="arrow-right" size={11} className="flex-none" />
                </Link>
              ))}
            </nav>

            <div className="mt-[26px] flex max-w-[760px] flex-wrap items-center gap-[12px] rounded-[10px] border border-accent-line bg-accent-soft px-[18px] py-[16px]">
              <span className="min-w-[220px] flex-1 text-[14.5px] leading-[1.5] text-ink">
                Free, no card, nothing to cancel. Three screens and your link works.
              </span>
              <Link
                href="/signup"
                className="unlink inline-flex h-[42px] flex-none items-center rounded-[8px] bg-accent px-[18px] text-[14px] font-semibold whitespace-nowrap text-on-accent no-underline hover:bg-accent-2 hover:text-on-accent"
              >
                Create a free account
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
