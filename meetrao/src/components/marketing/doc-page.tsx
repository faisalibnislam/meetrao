import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export type DocSection = {
  id: string;
  title: string;
  /** Paragraphs, bullet lists and callouts, in order. */
  body: DocBlock[];
};

export type DocBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "term"; term: string; text: string }
  | { kind: "decision"; text: string };

/**
 * Shared shell for Terms, Privacy and the Help centre: a lede, a sticky
 * contents rail and the numbered sections.
 *
 * The rail is `border-box` with `max-height: calc(100vh - 120px)`, and that
 * budget has to cover the sticky offset *and* the element's own padding and
 * border — otherwise it hangs off the bottom of the viewport. Below 880px it
 * goes static and full width rather than sticky.
 */
export function DocPage({
  eyebrow,
  title,
  lede,
  meta,
  sections,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  meta: string[];
  sections: DocSection[];
}) {
  return (
    <div className="mx-auto max-w-[1200px] px-[18px] py-[48px] sm:px-[26px]">
      <div className="flex max-w-[760px] flex-col gap-[14px]">
        <span className="font-mono text-[10.5px] tracking-[0.14em] text-accent uppercase">
          {eyebrow}
        </span>
        <h1 className="m-0 font-serif text-[clamp(30px,4.6vw,52px)] leading-[1.04] font-normal tracking-[-0.02em] text-ink text-balance">
          {title}
        </h1>
        <p className="m-0 text-[15px] leading-[1.65] text-ink-2 text-pretty">
          {lede}
        </p>
        <div className="flex flex-wrap gap-[8px]">
          {meta.map((m) => (
            <span
              key={m}
              className="inline-flex items-center rounded-[6px] border border-line bg-surface px-[10px] py-[5px] font-mono text-[11px] text-ink-3"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-[34px] grid items-start gap-[30px] min-[881px]:grid-cols-[220px_minmax(0,1fr)]">
        {/* Contents rail. Static and full width below 881px. */}
        <nav
          aria-label="Contents"
          className="box-border max-h-none rounded-[12px] border border-line bg-surface p-[16px] min-[881px]:sticky min-[881px]:top-[92px] min-[881px]:max-h-[calc(100vh-120px)] min-[881px]:overflow-y-auto"
        >
          <span className="font-mono text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">
            Jump to
          </span>
          <ul className="m-0 mt-[10px] flex list-none flex-wrap gap-[2px] p-0 min-[881px]:flex-col min-[881px]:flex-nowrap">
            {sections.map((s) => (
              <li key={s.id} className="min-w-0">
                <a
                  href={`#${s.id}`}
                  className="flex min-h-[44px] items-center rounded-[7px] px-[10px] text-[13px] text-ink-2 no-underline hover:bg-fill hover:text-ink min-[881px]:min-h-[34px]"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-[26px]">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-[100px] rounded-[14px] border border-line bg-surface p-[22px]"
            >
              <h2 className="m-0 scroll-mt-[100px] text-[17px] leading-[1.3] font-semibold text-ink">
                {section.title}
              </h2>
              <div className="mt-[12px] flex flex-col gap-[12px]">
                {section.body.map((block, i) => (
                  <DocBlockView key={i} block={block} />
                ))}
              </div>
            </section>
          ))}

          <div className="flex flex-wrap items-center gap-[14px] rounded-[12px] border border-line bg-surface px-[18px] py-[15px]">
            <span className="min-w-[210px] flex-1 text-[13.5px] leading-[1.55] text-ink-2">
              Still need a person?
            </span>
            <Link
              href="/support"
              className="inline-flex min-h-[44px] items-center rounded-[7px] border border-line-strong bg-surface px-[13px] text-[13px] font-semibold text-ink no-underline hover:bg-fill-2 sm:min-h-[36px]"
            >
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocBlockView({ block }: { block: DocBlock }) {
  if (block.kind === "p") {
    return (
      <p className="m-0 text-[13.5px] leading-[1.7] text-ink-2 text-pretty">
        {block.text}
      </p>
    );
  }

  if (block.kind === "term") {
    return (
      <p className="m-0 text-[13.5px] leading-[1.7] text-ink-2 text-pretty">
        <strong className="font-semibold text-ink">{block.term}</strong>{" "}
        {block.text}
      </p>
    );
  }

  if (block.kind === "list") {
    return (
      <ul className="m-0 flex list-none flex-col gap-[7px] p-0">
        {block.items.map((item) => (
          <li key={item} className="flex items-start gap-[10px]">
            <Icon
              name="check"
              weight={900}
              size={10}
              className="mt-[6px] flex-none text-accent"
            />
            <span className="text-[13.5px] leading-[1.65] text-ink-2 text-pretty">
              {item}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  // An open legal question, carried through from the design rather than
  // silently answered. These are visible on purpose: shipping invented legal
  // text would be worse than shipping a page that says what is undecided.
  return (
    <div className="flex gap-[11px] rounded-[8px] border border-amber-line bg-amber-soft px-[14px] py-[12px]">
      <Icon
        name="triangleExclamation"
        weight={900}
        size={13}
        className="mt-[3px] flex-none text-amber"
      />
      <p className="m-0 text-[12.5px] leading-[1.6] text-amber-ink text-pretty">
        <strong className="font-semibold">Needs a decision:</strong> {block.text}
      </p>
    </div>
  );
}
