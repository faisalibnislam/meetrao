import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/ui/logo";
import { Icon, type IconName } from "@/components/ui/icon";
import { SiteAccountMenu } from "./site-account-menu";
import { SiteAccountLive, SignedOutActions } from "./site-account-live";
import { POSTAL_ADDRESS } from "@/lib/contact";

/* ─────────────────────────────────────────────────────────────────────────────
   Marketing chrome, one sticky nav and one footer, shared by the landing page
   and the four standalone public pages. The prototypes duplicate this across
   five files because the design tool has no layout primitive.
   ───────────────────────────────────────────────────────────────────────────── */

/** Where "see a booking page" points. Unset, the CTA offers the walkthrough
    instead of promising a demo that does not exist. */
function demoBookingPath(): string | null {
  return process.env.NEXT_PUBLIC_DEMO_BOOKING_PATH || null;
}

export type NavAccount = {
  name: string;
  email: string;
  avatarUrl?: string | null;
  onSignOut: () => void | Promise<void>;
};

export function SiteNav({
  sectionLinks = true,
  account,
  liveAccount,
}: {
  sectionLinks?: boolean;
  /** Signed in, the two sign-up buttons make no sense, show the way back. */
  account?: NavAccount | null;
  /**
   * Resolve the session in the BROWSER instead of on the server.
   *
   * For the statically rendered pages (landing, Terms, Privacy) where reading
   * a cookie on the server would turn the whole page dynamic. See
   * site-account-live.tsx for why that trade is not worth making on the page
   * search engines measure. Pages that already read the session (/help,
   * /support) pass `account` instead and get the right nav with no swap.
   */
  liveAccount?: { onSignOut: () => void | Promise<void> };
}) {
  return (
    <header className="pointer-events-none sticky top-0 z-60 px-[26px] pt-[20px] max-[720px]:px-0 max-[720px]:pt-0">
      <div className="pointer-events-auto mx-auto flex max-w-[1148px] items-center gap-[22px] rounded-[12px] border border-line bg-white py-[10px] pr-[14px] pl-[18px] shadow-[0_1px_2px_rgba(26,25,23,0.04),0_12px_28px_-14px_rgba(26,25,23,0.22)] max-[720px]:max-w-none max-[720px]:gap-[12px] max-[720px]:rounded-none max-[720px]:border-x-0 max-[720px]:border-t-0 max-[720px]:p-[10px_16px] max-[720px]:shadow-[0_1px_2px_rgba(26,25,23,0.06)]">
        <Link href="/" className="unlink flex flex-none items-center">
          <Logo height={19} />
        </Link>

        {sectionLinks ? (
          <nav className="ml-[10px] flex min-w-0 flex-wrap gap-[22px] max-[720px]:hidden">
            <NavLink href="/#product">Product</NavLink>
            <NavLink href="/#how">How it works</NavLink>
            <NavLink href="/#usecases">Use cases</NavLink>
            <NavLink href="/pricing">Pricing</NavLink>
            <NavLink href="/#faq">FAQ</NavLink>
          </nav>
        ) : null}

        <div className="ml-auto flex flex-none items-center gap-[12px]">
          {account ? (
            <SiteAccountMenu
              name={account.name}
              email={account.email}
              avatarUrl={account.avatarUrl}
              onSignOut={account.onSignOut}
            />
          ) : liveAccount ? (
            <SiteAccountLive onSignOut={liveAccount.onSignOut} />
          ) : (
            <SignedOutActions />
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="unlink text-[13.5px] whitespace-nowrap text-ink-2">
      {children}
    </Link>
  );
}

const FOOTER_TRUST: { glyph: IconName; title: string; text: string }[] = [
  { glyph: "tag", title: "Completely free", text: "No subscription, no card, no trial that expires." },
  {
    glyph: "eye-slash",
    title: "Your calendar stays private",
    text: "Meetrao reads busy or free: never what your meetings are about.",
  },
  {
    glyph: "xmark",
    title: "Disconnect whenever",
    text: "One click in Settings, and the calendar token is deleted.",
  },
];

export function SiteFooter() {
  const demo = demoBookingPath();

  const columns: { title: string; links: [string, string][] }[] = [
    {
      title: "Product",
      links: [
        ["How it works", "/#how"],
        ["Use cases", "/#usecases"],
        ["What you get", "/#product"],
        ["Your own domain", "/custom-domain"],
        demo ? ["See a booking page", demo] : ["Read the FAQ", "/#faq"],
      ],
    },
    {
      title: "Get started",
      links: [
        ["Create a free link", "/signup"],
        ["Log in", "/login"],
        ["Connect Google Calendar", "/help#calendar"],
        ["Set your availability", "/help#availability"],
      ],
    },
    {
      /* A crawler reaches a page by following a link to it. Two comparison
         pages with nothing pointing at them are two pages that get found
         late, if at all, and the footer is on every page of the site. */
      title: "Compare",
      links: [
        ["Calendly alternatives", "/alternatives"],
        ["Meetrao vs Calendly", "/vs/calendly"],
        ["Meetrao vs Cal.com", "/vs/cal-com"],
        ["Meetrao vs Acuity", "/vs/acuity-scheduling"],
        ["FAQ", "/#faq"],
      ],
    },
    {
      title: "Support",
      links: [
        ["Help centre", "/help"],
        ["Contact support", "/support"],
        ["Calendar privacy", "/guides/calendar-privacy"],
      ],
    },
    {
      title: "Company",
      links: [
        ["Privacy Policy", "/privacy"],
        ["Terms of Service", "/terms"],
      ],
    },
  ];

  return (
    <footer className="bg-accent-2 text-on-accent">
      <div className="mx-auto max-w-[1200px] px-[26px] max-[560px]:px-[18px]">
        {/* CTA band, the top of the footer */}
        <div className="flex flex-wrap items-end justify-between gap-[30px] pt-[76px] pb-[60px]">
          <div className="flex min-w-[290px] flex-1 flex-col gap-[14px]">
            <Kicker>Get started</Kicker>
            <h2 className="m-0 max-w-[21ch] font-serif text-[clamp(34px,5.2vw,66px)] leading-[1] font-normal tracking-[-0.024em] text-balance text-white">
              Your calendar already knows when you&rsquo;re free.
            </h2>
            <p className="m-0 max-w-[46ch] text-[15.5px] leading-[1.6] text-pretty text-white/75">
              Let Meetrao handle the scheduling. It&rsquo;s completely free to use, no card, no subscription.
            </p>
          </div>
          {/* flex-initial, not flex-none. The design file says `flex:none` here, which
              was authored at desktop width where the row sits beside the heading and
              fits. Flex-none is `flex: 0 0 auto`, the row sizes to its content and
              refuses to shrink, so its own flex-wrap can never engage and two 15px
              buttons hold the page at 466px. On a 390px phone that is what makes the
              whole site pan sideways. Flex-initial keeps it from stretching and lets
              it wrap. */}
          <div className="flex min-w-0 flex-initial flex-wrap gap-[10px]">
            <Link
              href="/signup"
              className="unlink inline-flex h-[52px] items-center justify-center gap-[10px] rounded-[8px] bg-white px-[24px] text-[15px] font-semibold text-accent-2 transition-opacity duration-[120ms] hover:text-accent-2 hover:opacity-90"
            >
              Create your booking link
              <Icon name="arrow-right" size={12} />
            </Link>
            <Link
              href={demo ?? "/#how"}
              className="unlink inline-flex h-[52px] items-center justify-center gap-[10px] rounded-[8px] border border-white/35 px-[21px] text-[15px] font-semibold text-white transition-colors duration-[120ms] hover:bg-white/10 hover:text-white"
            >
              <Icon name="play" size={12} />
              {demo ? "See a booking page" : "See how it works"}
            </Link>
          </div>
        </div>

        <div className="mt-[44px] mb-[30px] grid grid-cols-[minmax(240px,1.35fr)_repeat(auto-fit,minmax(140px,1fr))] items-start gap-x-[34px] gap-y-[44px] rounded-[20px] bg-[#206155] px-[30px] pt-[34px] pb-[36px] max-[700px]:grid-cols-[1fr] max-[700px]:gap-[30px]">
          {columns.map((column) => (
            <div key={column.title} className="flex min-w-0 flex-col gap-[14px]">
              <span className="text-[10.5px] tracking-[0.08em] text-white/85 uppercase">
                {column.title}
              </span>
              <div className="flex flex-col gap-[11px]">
                {column.links.map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    className="unlink text-[14px] font-normal text-white/85 transition-colors duration-[120ms] hover:text-white"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-[30px] flex flex-wrap gap-[16px] rounded-[20px] bg-[#206155] px-[30px] py-[26px]">
          {FOOTER_TRUST.map((item) => (
            <div key={item.title} className="flex min-w-[230px] flex-1 items-start gap-[12px]">
              <Icon name={item.glyph} size={14} className="mt-[2px] w-[18px] flex-none text-white/85" />
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-[13.5px] font-semibold text-white">{item.title}</span>
                <span className="text-[13px] leading-[1.55] text-pretty text-white/85">{item.text}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-[16px] pt-[22px] pb-[34px]">
          <span className="text-[13px] text-white/60">
            © 2026 Meetrao · {POSTAL_ADDRESS}
          </span>
          <div className="ml-auto flex flex-wrap gap-[20px]">
            <Link href="/pricing" className="unlink text-[13px] text-white/75 hover:text-white">
              Pricing
            </Link>
            <Link href="/privacy" className="unlink text-[13px] text-white/75 hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="unlink text-[13px] text-white/75 hover:text-white">
              Terms
            </Link>
            <Link href="/support" className="unlink text-[13px] text-white/75 hover:text-white">
              Contact
            </Link>
          </div>
        </div>

        <div className="pb-[30px]">
          <Image
            src="/brand/meetrao-logo-white.svg"
            alt="Meetrao"
            width={1200}
            height={265}
            className="block h-auto w-full opacity-95"
          />
        </div>
      </div>
    </footer>
  );
}

/** The rule-and-label that opens every section. */
export function Kicker({ children, tone = "light" }: { children: string; tone?: "light" | "dark" }) {
  const color = tone === "light" ? "text-[#7FD8C4]" : "text-accent-ink";
  const rule = tone === "light" ? "bg-[#7FD8C4]" : "bg-accent";
  return (
    <span className={`inline-flex items-center gap-[10px] text-[10.5px] font-medium tracking-[0.14em] uppercase ${color}`}>
      <span aria-hidden="true" className={`h-[2px] w-[18px] flex-none rounded-[1px] ${rule}`} />
      {children}
    </span>
  );
}
