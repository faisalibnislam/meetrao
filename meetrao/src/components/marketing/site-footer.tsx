import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { buttonClass } from "@/components/ui/button-style";
import { publicEnv } from "@/lib/env";

/**
 * The public site's footer, rendered once by `(marketing)/layout.tsx`.
 *
 * It absorbs the final call to action as its top band, so the page ends in one
 * continuous dark green block rather than a separate CTA card followed by a
 * footer. Five bands: CTA, link columns, trust row, legal row, and the mark at
 * full container width.
 */
const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#how" },
      { label: "Use cases", href: "/#usecases" },
      { label: "What you get", href: "/#product" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Create a free link", href: "/signup" },
      { label: "Log in", href: "/login" },
      { label: "Set your availability", href: "/availability" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help centre", href: "/help" },
      { label: "Contact support", href: "/support" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

const TRUST: { glyph: IconName; title: string; text: string }[] = [
  {
    glyph: "bolt",
    title: "Completely free",
    text: "No subscription, no card, no trial that expires.",
  },
  {
    glyph: "circleInfo",
    title: "Your calendar stays private",
    text: "Meetrao reads busy or free — never what your meetings are about.",
  },
  {
    glyph: "circleXmark",
    title: "Disconnect whenever",
    text: "One click in Settings, and the calendar token is deleted.",
  },
];

export function SiteFooter() {
  const demo = publicEnv.demoUsername;

  return (
    <footer className="bg-accent-2 text-white">
      <div className="mx-auto max-w-[1200px] px-[18px] sm:px-[26px]">
        {/* CTA band */}
        <div className="flex flex-wrap items-end justify-between gap-[24px] py-[52px]">
          <div className="flex min-w-0 max-w-[620px] flex-col gap-[12px]">
            <h2 className="m-0 font-serif text-[clamp(28px,3.6vw,44px)] leading-[1.04] font-normal tracking-[-0.02em] text-white text-balance">
              Your calendar already knows when you&apos;re free.
            </h2>
            <p className="m-0 text-[14.5px] leading-[1.6] text-white/80 text-pretty">
              Let Meetrao handle the scheduling. It&apos;s completely free to
              use — no card, no subscription.
            </p>
          </div>
          <div className="flex flex-wrap gap-[10px]">
            <Link
              href="/signup"
              className={buttonClass({
                size: "3xl",
                className:
                  "h-[44px] border-white bg-white text-ink hover:bg-white/90 hover:text-ink sm:h-[40px]",
              })}
            >
              Create your free booking link
            </Link>
            <Link
              href={demo ? `/${demo}` : "/#how"}
              className={buttonClass({
                size: "3xl",
                className:
                  "h-[44px] border-white/35 bg-transparent text-white hover:border-white/60 hover:bg-white/10 hover:text-white sm:h-[40px]",
              })}
            >
              See a booking page
            </Link>
          </div>
        </div>

        {/* Link columns. The first track has a 240px floor, so they stack below
            700px rather than being squeezed beside a 140px sibling. */}
        <div className="grid gap-[26px] rounded-[14px] bg-white/[0.055] p-[24px] [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex min-w-0 flex-col gap-[14px]">
              <span className="font-mono text-[10.5px] tracking-[0.08em] text-white/80 uppercase">
                {col.title}
              </span>
              <div className="flex flex-col gap-[2px] sm:gap-[11px]">
                {col.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="inline-flex min-h-[44px] items-center text-[14px] font-normal text-white/85 no-underline transition-colors duration-[120ms] hover:text-white sm:min-h-0"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Trust row */}
        <div className="mt-[30px] flex flex-wrap gap-[24px] rounded-[14px] bg-white/[0.055] p-[24px]">
          {TRUST.map((item) => (
            <div
              key={item.title}
              className="flex min-w-[230px] flex-1 items-start gap-[12px]"
            >
              <Icon
                name={item.glyph}
                size={14}
                className="mt-[2px] w-[18px] flex-none text-center text-white/80"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-[13.5px] font-semibold text-white">
                  {item.title}
                </span>
                <span className="text-[13px] leading-[1.55] text-white/80 text-pretty">
                  {item.text}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Legal row */}
        <div className="flex flex-wrap items-center gap-[16px] pt-[22px] pb-[34px]">
          <span className="text-[13px] text-white/60">
            © 2026 Meetrao · Operated by{" "}
            <a
              href="https://airlystudio.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/85 underline decoration-white/35 underline-offset-2 hover:text-white hover:decoration-white"
            >
              Airly Studio
            </a>
          </span>
          <div className="ml-auto flex flex-wrap gap-[20px]">
            <Link href="/privacy" className="inline-flex min-h-[44px] items-center text-[13px] text-white/70 no-underline hover:text-white sm:min-h-0">
              Privacy
            </Link>
            <Link href="/terms" className="inline-flex min-h-[44px] items-center text-[13px] text-white/70 no-underline hover:text-white sm:min-h-0">
              Terms
            </Link>
            <Link href="/support" className="inline-flex min-h-[44px] items-center text-[13px] text-white/70 no-underline hover:text-white sm:min-h-0">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
