import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { Kicker } from "@/components/marketing/site-chrome";
import { Icon } from "@/components/ui/icon";
import { cx } from "@/lib/cx";
import { COMPARISONS } from "@/lib/comparisons";
import { PRO_YEARLY } from "@/lib/pricing";
import { OG_IMAGE, articleLd, breadcrumbLd, faqLd, graph } from "@/lib/seo";

/* ─────────────────────────────────────────────────────────────────────────────
   The page for "white label scheduling" and "custom domain booking page".

   The feature was only ever described inside /pricing and a section of the
   help centre, which are both pages you reach after you already know the
   product exists. This is the one somebody finds while still looking.

   The comparison table is built from COMPARISONS rather than written out, so
   the figures here are the ones the /vs pages print and carry the same checked
   date. Writing them twice would mean maintaining them twice, and the second
   copy is the one that goes stale.
   ───────────────────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Your booking link on your own domain",
  description:
    "Put your booking page on meet.yourcompany.com with your logo and your colours, for " +
    "$30 a year. One CNAME record, certificate handled.",
  alternates: { canonical: "/custom-domain" },
  openGraph: {
    images: [OG_IMAGE],
    type: "website",
    title: "Meetrao: your booking link on your own domain",
    description:
      "meet.yourcompany.com/your-name, with your logo and your colours, for $30 a year. One CNAME record and the certificate is handled.",
    url: "/custom-domain",
  },
};

const ADDRESSES: [string, string][] = [
  ["meet.yourcompany.com/alex/intro", "A meeting on your domain. This is the one for a signature."],
  ["meet.yourcompany.com/sarah/review", "Somebody else in the company, with their own handle."],
];

const STEPS: [string, string][] = [
  [
    "Pick the name",
    "A subdomain of a domain you already own: meet.yourcompany.com, book.yourcompany.com, whatever reads right. It cannot be a bare apex domain, because the DNS record it needs is a CNAME.",
  ],
  [
    "Add one CNAME record",
    "Settings shows the exact record and the value to point it at. One line at your DNS provider, and nothing else at your end.",
  ],
  [
    "Wait for the certificate",
    "The panel watches for the record and issues the certificate when it sees it. Usually minutes. The panel says which of the two it is waiting on, so a typo in the record reads as a typo rather than as nothing happening.",
  ],
];

const KEEPS: string[] = [
  "Your meetrao.com meeting links keep working, so anything already shared is safe.",
  "Search engines are told your domain is the real address, which is the point of having one.",
  "Confirmation links in guest emails are served on your domain too, not just the booking page.",
  "Remove releases the domain at once, and your meetrao.com links carry on.",
];

const FAQ: [string, string][] = [
  [
    "Do I need to buy a domain?",
    "No, and you cannot buy one here. You point a subdomain of a domain you already own at Meetrao with a CNAME record. If you do not own a domain, this feature is not for you yet.",
  ],
  [
    "Can I use the bare domain, yourcompany.com?",
    "No. The record has to be a CNAME, and a CNAME cannot sit on an apex domain. Use a subdomain: meet., book., calendar., whatever suits.",
  ],
  [
    "What is at meet.yourcompany.com on its own?",
    "Nothing. Every link names a specific meeting, so the root of the domain is not a page. If you want it to go somewhere, point it at your own site.",
  ],
  [
    "What happens to my meetrao.com links?",
    "They keep working, permanently. The custom domain is an additional address, not a replacement, so nothing you have already shared breaks.",
  ],
  [
    "Does the domain cover my whole team?",
    "A custom domain serves one account. A link on your domain that names somebody else is read as one of your meetings and shows nothing if you have no meeting by that name.",
  ],
  [
    "Is the certificate included?",
    "Yes. There is nothing to upload, renew or pay for separately.",
  ],
];

/** The competitors that charge for this, as their own pricing pages state it. */
const DOMAIN_ROWS = COMPARISONS.map((c) => ({
  competitor: c.competitor,
  slug: c.slug,
  them: c.rows.find((r) => r.feature.startsWith("Custom domain"))?.them ?? null,
})).filter((r): r is { competitor: string; slug: string; them: string } => r.them !== null);

export default function CustomDomainPage() {
  return (
    <>
      <JsonLd
        json={graph(
          articleLd({
            headline: "Put your booking link on your own domain",
            description:
              "What a custom booking domain costs on Meetrao, how to set one up with a single " +
              "CNAME record, and which schedulers offer one at all.",
            path: "/custom-domain",
          }),
          faqLd(FAQ),
          breadcrumbLd([
            ["Meetrao", "/"],
            ["Custom domain", "/custom-domain"],
          ]),
        )}
      />

      {/* ── opening ───────────────────────────────────────────────────────── */}
      <section className="bg-[#F4F3ED]">
        <div className="mx-auto max-w-[1200px] px-[26px] pt-[72px] pb-[56px] max-[560px]:px-[18px] max-[560px]:pt-[48px]">
          <div className="flex max-w-[760px] flex-col gap-[14px]">
            <Kicker tone="dark">Custom domain</Kicker>
            <h1 className="m-0 font-serif text-[clamp(32px,4.6vw,54px)] leading-[1.03] font-normal tracking-[-0.02em] text-balance text-ink">
              Your booking link, on your own domain
            </h1>
            <p className="m-0 text-[16px] leading-[1.6] text-pretty text-ink-2">
              A scheduling link is a thing you put in a signature, on a card and at the end of a
              proposal. On most tools it carries the vendor&rsquo;s name. On Meetrao Pro it carries
              yours, for {PRO_YEARLY}, and so do the logo and the colours on the page it opens.
            </p>

            <div className="mt-[6px] flex flex-col gap-[8px]">
              {ADDRESSES.map(([address, note]) => (
                <div
                  key={address}
                  className="flex flex-wrap items-baseline gap-x-[12px] gap-y-[2px] rounded-[10px] border border-line bg-surface px-[15px] py-[11px]"
                >
                  <code className="text-[13.5px] font-semibold text-accent-ink">{address}</code>
                  <span className="text-[13px] leading-[1.5] text-ink-2">{note}</span>
                </div>
              ))}
            </div>

            <div className="mt-[10px] flex flex-wrap items-center gap-[10px]">
              <Link
                href="/signup"
                className="unlink inline-flex h-[44px] items-center rounded-[8px] bg-accent px-[18px] text-[14px] font-semibold whitespace-nowrap text-on-accent no-underline hover:bg-accent-2 hover:text-on-accent"
              >
                Start free
              </Link>
              <Link
                href="/pricing"
                className="unlink inline-flex h-[44px] items-center rounded-[8px] border border-line-strong bg-surface px-[18px] text-[14px] font-semibold text-ink no-underline hover:bg-fill"
              >
                See what else Pro adds
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── setting it up ─────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <h2 className="m-0 font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
            One record, and the certificate is handled
          </h2>
          <p className="mt-[10px] mb-[22px] max-w-[640px] text-[14px] leading-[1.6] text-ink-2">
            There is no proxy to run and nothing to renew.
          </p>

          <div className="mb-[24px] flex max-w-[860px] flex-col gap-[1px] overflow-hidden rounded-[10px] border border-line bg-line">
            {STEPS.map(([title, text], i) => (
              <div key={title} className="flex gap-[14px] bg-surface px-[16px] py-[14px]">
                <span className="inline-flex h-[24px] w-[24px] flex-none items-center justify-center rounded-full bg-accent-soft text-[11px] font-medium text-accent-ink">
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="text-[13.5px] font-semibold text-ink">{title}</span>
                  <span className="text-[13px] leading-[1.55] text-pretty text-ink-2">{text}</span>
                </div>
              </div>
            ))}
          </div>

          <ul className="m-0 flex max-w-[760px] list-none flex-col gap-[10px] p-0">
            {KEEPS.map((line) => (
              <li key={line} className="flex items-start gap-[10px]">
                <Icon name="check" weight="solid" size={10} className="mt-[5px] flex-none text-accent-ink" />
                <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── what it costs elsewhere ───────────────────────────────────────── */}
      <section className="border-t border-line bg-[#F4F3ED]">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <h2 className="m-0 font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
            What this costs elsewhere
          </h2>
          <p className="mt-[10px] mb-[22px] max-w-[660px] text-[14px] leading-[1.6] text-ink-2">
            Read off each vendor&rsquo;s own pricing page in {COMPARISONS[0].checkedOn}. Prices change
            without notice, and each row links to the comparison that cites the source.
          </p>

          <div className="scroll-x max-w-[860px] overflow-hidden rounded-[10px] border border-line">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <caption className="sr-only">
                What a custom booking domain costs on each scheduler
              </caption>
              <thead>
                <tr className="bg-fill">
                  <th scope="col" className="px-[15px] py-[11px] text-[12.5px] font-semibold text-ink-2">
                    Scheduler
                  </th>
                  <th scope="col" className="px-[15px] py-[11px] text-[12.5px] font-semibold text-ink">
                    Custom domain
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-accent-soft">
                  <th scope="row" className="px-[15px] py-[12px] align-top text-[13.5px] font-semibold text-ink">
                    Meetrao
                  </th>
                  <td className="px-[15px] py-[12px] align-top text-[13.5px] leading-[1.5] text-ink">
                    Pro, {PRO_YEARLY} for the account
                  </td>
                </tr>
                {DOMAIN_ROWS.map((row, i) => (
                  <tr key={row.slug} className={cx("border-t border-line-soft", i % 2 === 1 && "bg-fill")}>
                    <th
                      scope="row"
                      className="px-[15px] py-[12px] align-top text-[13.5px] font-semibold text-ink"
                    >
                      <Link href={`/vs/${row.slug}`}>{row.competitor}</Link>
                    </th>
                    <td className="px-[15px] py-[12px] align-top text-[13.5px] leading-[1.5] text-ink-2">
                      {row.them}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cal.com is absent from the table above on purpose: its answer does
              not fit in the cell, and leaving it out silently would be the
              convenient omission. */}
          <p className="mt-[16px] max-w-[760px] text-[13.5px] leading-[1.6] text-pretty text-ink-2">
            <Link href="/vs/cal-com">Cal.com</Link> is the one that does not fit a cell. Its
            Organizations plan gives a company subdomain of cal.com rather than a domain of your
            own, and it is the only product here you can self-host, in which case it runs on any
            domain you like and this comparison stops meaning anything.
          </p>
        </div>
      </section>

      {/* ── questions ─────────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <h2 className="m-0 mb-[20px] font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
            Questions
          </h2>
          <div className="flex max-w-[760px] flex-col gap-[16px]">
            {FAQ.map(([question, answer]) => (
              <div key={question} className="flex flex-col gap-[5px]">
                <h3 className="m-0 text-[15px] font-semibold text-ink">{question}</h3>
                <p className="m-0 text-[14px] leading-[1.6] text-pretty text-ink-2">{answer}</p>
              </div>
            ))}
          </div>

          <div className="mt-[32px] flex max-w-[760px] flex-wrap items-center gap-[12px] rounded-[10px] border border-accent-line bg-accent-soft px-[18px] py-[16px]">
            <span className="min-w-[220px] flex-1 text-[14.5px] leading-[1.5] text-ink">
              Start free and add the domain when you want it. Nothing expires in the meantime.
            </span>
            <Link
              href="/signup"
              className="unlink inline-flex h-[42px] flex-none items-center rounded-[8px] bg-accent px-[18px] text-[14px] font-semibold whitespace-nowrap text-on-accent no-underline hover:bg-accent-2 hover:text-on-accent"
            >
              Create a free account
            </Link>
            <Link
              href="/help#domain"
              className="unlink inline-flex h-[42px] flex-none items-center rounded-[8px] border border-line-strong bg-surface px-[18px] text-[14px] font-semibold text-ink no-underline hover:bg-fill"
            >
              Read the setup guide
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
