import type { Metadata } from "next";
import { Icon } from "@/components/ui/icon";
import { Eyebrow } from "@/components/marketing/landing/eyebrow";
import { Hero } from "@/components/marketing/landing/hero";
import { Walkthrough } from "@/components/marketing/landing/walkthrough";
import { CostCalculator } from "@/components/marketing/landing/cost-calculator";
import { ProductTables } from "@/components/marketing/landing/product-tables";
import { UseCases } from "@/components/marketing/landing/use-cases";
import { Faq } from "@/components/marketing/landing/faq";

export const metadata: Metadata = {
  title: "Meetrao — Simple scheduling. Less back-and-forth.",
  description:
    "Share one link. Guests pick a time you are genuinely free, and every booking gets a Google Meet link automatically. Free, with no card and no subscription.",
};

/** The email thread the product replaces. Deliberately mundane. */
const THREAD = [
  { who: "guest", name: "Priya Nair", text: "Would Thursday afternoon work for a call?" },
  { who: "host", name: "You", text: "Thursday's gone, sorry. Friday morning?" },
  { who: "guest", name: "Priya Nair", text: "Friday I'm out. Monday?" },
  { who: "host", name: "You", text: "Monday works — 10:00? Or is that too early your time?" },
  { who: "guest", name: "Priya Nair", text: "Let me check and come back to you." },
] as const;

const BEFORE = [
  "Send a message proposing times",
  "Wait for a reply",
  "None of them work",
  "Propose three more",
  "Agree a time in the wrong timezone",
  "Create the calendar event",
  "Create a video link",
  "Send the invite",
];

const AFTER = ["Share your link", "They pick a time", "It's on both calendars"];

export default function LandingPage() {
  return (
    <>
      <Hero />

      {/* ── The problem ─────────────────────────────────────────────── */}
      <section className="border-t border-line bg-fill">
        <div className="mx-auto max-w-[1200px] px-[18px] py-[64px] sm:px-[26px]">
          <div className="grid gap-[32px] lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
            <div className="flex min-w-0 flex-col gap-[14px]">
              <Eyebrow>The problem</Eyebrow>
              <h2 className="m-0 max-w-[540px] font-serif text-[clamp(28px,3.6vw,44px)] leading-[1.04] font-normal tracking-[-0.02em] text-ink text-balance">
                Scheduling shouldn&apos;t be a conversation.
              </h2>
              <p className="m-0 max-w-[460px] text-[15px] leading-[1.65] text-ink-2 text-pretty">
                You don&apos;t need another thread. You need one link.
              </p>
              <div className="mt-[4px] flex flex-wrap gap-[10px]">
                <span className="inline-flex items-center gap-[8px] rounded-[8px] border border-line bg-surface px-[12px] py-[8px] text-[13px] text-ink-2">
                  <Icon name="clock" size={12} className="text-ink-3" />
                  Thu – Mon
                </span>
                <span className="inline-flex items-center gap-[8px] rounded-[8px] border border-line bg-surface px-[12px] py-[8px] text-[13px] text-ink-2">
                  <Icon name="list" size={12} className="text-ink-3" />
                  5 messages later
                </span>
                <span className="inline-flex items-center gap-[8px] rounded-[8px] border border-red-line bg-red-soft px-[12px] py-[8px] text-[13px] text-red-ink">
                  <Icon name="circleXmark" weight={900} size={12} />
                  Still nothing booked
                </span>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-[10px] rounded-[14px] border border-line bg-surface p-[18px]">
              <span className="font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
                Priya Nair &amp; you · trying to find half an hour
              </span>
              {THREAD.map((msg, i) => (
                <div
                  key={i}
                  className={`flex max-w-[86%] flex-col gap-[3px] rounded-[10px] px-[13px] py-[9px] ${
                    msg.who === "host"
                      ? "ml-auto bg-accent-soft"
                      : "mr-auto bg-fill-2"
                  }`}
                >
                  <span className="text-[11px] font-semibold text-ink-3">
                    {msg.name}
                  </span>
                  <span className="text-[13px] leading-[1.5] text-ink">
                    {msg.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Walkthrough />
      <CostCalculator />

      {/* ── Before / after ──────────────────────────────────────────── */}
      <section id="compare" className="border-t border-line bg-[#E7E3DC]">
        <div className="mx-auto max-w-[1200px] px-[18px] py-[56px] sm:px-[26px]">
          <div className="flex max-w-[600px] flex-col gap-[11px]">
            <Eyebrow>Before &amp; after</Eyebrow>
            <h2 className="m-0 font-serif text-[clamp(28px,3.6vw,44px)] leading-[1.04] font-normal tracking-[-0.02em] text-ink text-balance">
              Eight steps become three.
            </h2>
          </div>

          <div className="mt-[24px] grid gap-[14px] md:grid-cols-2">
            <div className="flex flex-col gap-[12px] rounded-[14px] border border-line bg-surface p-[20px]">
              <div className="flex items-baseline justify-between gap-[12px]">
                <span className="text-[14px] font-semibold text-ink">
                  The email thread
                </span>
                <span className="font-mono text-[11px] text-ink-3">
                  Days, not minutes
                </span>
              </div>
              <ol className="m-0 flex list-none flex-col gap-[7px] p-0">
                {BEFORE.map((step, i) => (
                  <li key={step} className="flex items-start gap-[10px]">
                    <span className="inline-flex size-[18px] flex-none items-center justify-center rounded-full bg-fill-2 font-mono text-[10.5px] text-ink-3">
                      {i + 1}
                    </span>
                    <span className="text-[13px] leading-[1.5] text-ink-2">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col gap-[12px] rounded-[14px] border border-accent-line bg-accent-soft p-[20px]">
              <div className="flex items-baseline justify-between gap-[12px]">
                <span className="text-[14px] font-semibold text-ink">
                  With Meetrao
                </span>
                <span className="font-mono text-[11px] text-accent">
                  Minutes, not days
                </span>
              </div>
              <ol className="m-0 flex list-none flex-col gap-[7px] p-0">
                {AFTER.map((step) => (
                  <li key={step} className="flex items-start gap-[10px]">
                    <Icon
                      name="check"
                      weight={900}
                      size={11}
                      className="mt-[4px] flex-none text-accent"
                    />
                    <span className="text-[13px] leading-[1.5] text-ink">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <ProductTables />
      <UseCases />
      <Faq />
    </>
  );
}
