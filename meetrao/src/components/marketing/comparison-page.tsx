import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Kicker } from "./site-chrome";
import { Reveal } from "./reveal";
import { cx } from "@/lib/cx";
import type { Comparison, Edge } from "@/lib/comparisons";

/* ─────────────────────────────────────────────────────────────────────────────
   One layout, two comparison pages.

   The order of the sections is the argument. "Where <them> is better" comes
   before "where Meetrao is better", because a comparison page written by one of
   the two products has to earn the right to be believed and there is only one
   way to do that. A reader who finds the honest section first reads the rest
   differently.

   The table is a real <table> with a caption and row headers, not a grid of
   divs. A screen reader announces which feature a cell belongs to, and (the
   reason it matters here) so does everything that reads pages for a living.
   ───────────────────────────────────────────────────────────────────────────── */

const EDGE: Record<Edge, { label: string; className: string }> = {
  meetrao: { label: "Meetrao", className: "border-accent-line bg-accent-soft text-accent-ink" },
  them: { label: "Them", className: "border-line bg-fill text-ink-2" },
  even: { label: "Even", className: "border-line bg-surface text-ink-3" },
};

export function ComparisonPage({ data }: { data: Comparison }) {
  return (
    <>
      {/* ── opening ───────────────────────────────────────────────────────── */}
      <section className="bg-[#F4F3ED]">
        <div className="mx-auto max-w-[1200px] px-[26px] pt-[72px] pb-[56px] max-[560px]:px-[18px] max-[560px]:pt-[48px]">
          <div className="flex max-w-[760px] flex-col gap-[14px]">
            <Kicker tone="dark">Comparison</Kicker>
            <h1 className="m-0 font-serif text-[clamp(32px,4.6vw,54px)] leading-[1.03] font-normal tracking-[-0.02em] text-balance text-ink">
              Meetrao vs {data.competitor}
            </h1>
            {data.summary.map((paragraph) => (
              <p key={paragraph} className="m-0 text-[16px] leading-[1.6] text-pretty text-ink-2">
                {paragraph}
              </p>
            ))}

            <div className="mt-[10px] flex flex-wrap items-center gap-[10px]">
              <Link
                href="/signup"
                className="unlink inline-flex h-[44px] items-center rounded-[8px] bg-accent px-[18px] text-[14px] font-semibold whitespace-nowrap text-on-accent no-underline hover:bg-accent-2 hover:text-on-accent"
              >
                Get started
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

      {/* ── the table ─────────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <Reveal>
            <h2 className="m-0 font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
              Side by side
            </h2>
            <p className="mt-[10px] mb-[22px] max-w-[640px] text-[14px] leading-[1.6] text-ink-2">
              {data.competitor} figures were last reviewed in {data.checkedOn}. Prices change without
              notice.{" "}
              <a href={data.competitorUrl} rel="nofollow noreferrer" target="_blank">
                check {data.competitor}&rsquo;s own pricing page
              </a>{" "}
              before you decide anything on the strength of this table.
            </p>

            {/* A table is allowed to scroll inside its own container; the page
                is not. Below ~620px this is the only honest way to show three
                columns without shrinking the text to nothing. */}
            <div className="scroll-x overflow-hidden rounded-[10px] border border-line">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <caption className="sr-only">
                  Meetrao compared with {data.competitor}, feature by feature
                </caption>
                <thead>
                  <tr className="bg-fill">
                    <th scope="col" className="px-[15px] py-[11px] text-[12.5px] font-semibold text-ink-2">
                      Feature
                    </th>
                    <th scope="col" className="px-[15px] py-[11px] text-[12.5px] font-semibold text-ink">
                      Meetrao
                    </th>
                    <th scope="col" className="px-[15px] py-[11px] text-[12.5px] font-semibold text-ink">
                      {data.competitor}
                    </th>
                    <th scope="col" className="px-[15px] py-[11px] text-[12.5px] font-semibold text-ink-2">
                      Edge
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <tr key={row.feature} className={cx(i > 0 && "border-t border-line-soft")}>
                      <th
                        scope="row"
                        className="px-[15px] py-[12px] align-top text-[13.5px] font-semibold text-ink"
                      >
                        {row.feature}
                      </th>
                      <td className="px-[15px] py-[12px] align-top text-[13.5px] leading-[1.5] text-ink-2">
                        {row.meetrao}
                      </td>
                      <td className="px-[15px] py-[12px] align-top text-[13.5px] leading-[1.5] text-ink-2">
                        {row.them}
                      </td>
                      <td className="px-[15px] py-[12px] align-top">
                        <span
                          className={cx(
                            "inline-flex items-center rounded-[5px] border px-[7px] py-[3px] text-[11px] font-semibold whitespace-nowrap",
                            EDGE[row.edge].className,
                          )}
                        >
                          {row.edge === "them" ? data.competitor : EDGE[row.edge].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── where they win, first ─────────────────────────────────────────── */}
      <section className="border-t border-line bg-[#F4F3ED]">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <Reveal>
            <h2 className="m-0 font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
              Where {data.competitor} is the better choice
            </h2>
            <p className="mt-[10px] mb-[22px] max-w-[640px] text-[14px] leading-[1.6] text-ink-2">
              This section is first on purpose. A comparison written by one of the two products is worth reading
              only if it starts here.
            </p>
            <Cards items={data.theirWins} tone="plain" />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <Reveal>
            <h2 className="m-0 mb-[22px] font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
              Where Meetrao is the better choice
            </h2>
            <Cards items={data.meetraoWins} tone="accent" />
          </Reveal>
        </div>
      </section>

      {/* ── who should pick what ──────────────────────────────────────────── */}
      <section className="border-t border-line bg-[#F4F3ED]">
        <div className="mx-auto max-w-[1200px] px-[26px] py-[56px] max-[560px]:px-[18px]">
          <Reveal>
            <h2 className="m-0 mb-[22px] font-serif text-[clamp(26px,3.2vw,38px)] leading-[1.06] font-normal tracking-[-0.02em] text-ink">
              So which one?
            </h2>
            <div className="grid grid-cols-2 gap-[16px] max-[720px]:grid-cols-1">
              <Picker title={`Use ${data.competitor} if…`} items={data.chooseThem} tone="plain" />
              <Picker title="Use Meetrao if…" items={data.chooseMeetrao} tone="accent" />
            </div>
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

            <div className="mt-[32px] flex flex-wrap items-center gap-[12px] rounded-[10px] border border-accent-line bg-accent-soft px-[18px] py-[16px]">
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

function Cards({ items, tone }: { items: [string, string][]; tone: "accent" | "plain" }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-[14px]">
      {items.map(([title, body]) => (
        <div
          key={title}
          className={cx(
            "flex flex-col gap-[7px] rounded-[10px] border px-[16px] py-[15px]",
            tone === "accent" ? "border-accent-line bg-accent-soft" : "border-line bg-fill",
          )}
        >
          <span className="text-[14px] font-semibold text-ink">{title}</span>
          <span className="text-[13.5px] leading-[1.55] text-pretty text-ink-2">{body}</span>
        </div>
      ))}
    </div>
  );
}

function Picker({ title, items, tone }: { title: string; items: string[]; tone: "accent" | "plain" }) {
  return (
    <div
      className={cx(
        "flex flex-col gap-[11px] rounded-[10px] border px-[18px] py-[17px]",
        tone === "accent" ? "border-accent-line bg-accent-soft" : "border-line bg-surface",
      )}
    >
      <span className="text-[15px] font-semibold text-ink">{title}</span>
      <ul className="m-0 flex list-none flex-col gap-[9px] p-0">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-[10px]">
            <Icon
              name="check"
              weight="solid"
              size={10}
              className={cx("mt-[5px] flex-none", tone === "accent" ? "text-accent-ink" : "text-ink-3")}
            />
            <span className="text-[13.5px] leading-[1.55] text-ink-2">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
