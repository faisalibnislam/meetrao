import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { LogoLink } from "@/components/ui/logo";
import { BUSINESS_YEARLY, PRO_YEARLY } from "@/lib/pricing";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   One card for log in, sign up, forgot and reset.

   TWO PANELS INSIDE ONE FRAME. The left is the brand: the homepage hero's
   green, drifting, with what comes next written on it. The right is the form
   and nothing else, centred, with soft filled fields and one large button.

   THE LEFT PANEL SAYS SOMETHING DIFFERENT PER SCREEN. Signing up shows the
   three steps to a first booking with the current one lit, because somebody
   creating an account wants to know how long this takes. Signing in shows
   what is waiting for them instead; a returning host does not need the steps.

   On a phone the panel goes and the logo moves above the form: the panel is
   persuasion, and a phone screen is for the form.
   ───────────────────────────────────────────────────────────────────────────── */

export type AuthPanel = "signup" | "login";

const STEPS: { title: string }[] = [
  { title: "Create your account" },
  { title: "Connect Google Calendar" },
  { title: "Share your booking link" },
];

const WAITING: { icon: IconName; title: string }[] = [
  { icon: "calendar", title: "Your bookings, in your timezone" },
  { icon: "link", title: "Your links, ready to share" },
  { icon: "clock", title: "Your hours, kept free of clashes" },
];

export function AuthCard({
  title,
  blurb,
  children,
  footer,
  panel = "login",
}: {
  title: string;
  blurb: string;
  children: ReactNode;
  footer?: ReactNode;
  panel?: AuthPanel;
}) {
  return (
    <div className="box-border flex min-h-screen items-start justify-center p-[20px] max-[820px]:p-[12px]">
      <div className="m-auto grid w-full max-w-[1120px] grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] gap-[10px] rounded-[30px] bg-surface p-[10px] shadow-[0_1px_2px_rgba(26,25,23,0.05),0_18px_50px_-24px_rgba(26,25,23,0.25)] max-[820px]:grid-cols-[1fr] max-[820px]:rounded-[22px]">
        <BrandPanel panel={panel} />

        <div className="flex min-w-0 flex-col items-center justify-center px-[40px] py-[52px] max-[820px]:px-[14px] max-[820px]:py-[26px]">
          <div className="flex w-full max-w-[420px] flex-col gap-[24px]">
            <LogoLink height={24} className="hidden max-[820px]:block" />

            <div className="flex flex-col items-center gap-[8px] text-center max-[820px]:items-start max-[820px]:text-left">
              <h1 className="m-0 font-serif text-[44px] leading-[1.02] font-normal tracking-[-0.015em] text-ink max-[820px]:text-[36px]">
                {title}
              </h1>
              <p className="m-0 max-w-[36ch] text-[14px] leading-[1.55] text-pretty text-ink-2">{blurb}</p>
            </div>

            {children}
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandPanel({ panel }: { panel: AuthPanel }) {
  const signup = panel === "signup";

  return (
    <aside className="relative isolate flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-[22px] bg-[#103b33] p-[40px] text-white max-[820px]:hidden">
      {/* The hero's light, the same three drifting fields and sweep, so the
          sign-in screen reads as the same place the visitor just came from. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-1 overflow-hidden">
        <div className="drift-a absolute -top-[18%] -left-[22%] h-[90%] w-[90%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(24,105,90,1),rgba(24,105,90,0)_70%)] blur-[44px]" />
        <div className="drift-b absolute -top-[10%] -right-[30%] h-[80%] w-[80%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(64,184,160,1),rgba(64,184,160,0)_68%)] blur-[56px]" />
        <div className="drift-c absolute -bottom-[28%] left-[10%] h-[70%] w-[80%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(58,102,134,0.9),rgba(58,102,134,0)_72%)] blur-[58px]" />
        <div className="sweep absolute top-0 -left-[25%] h-full w-[50%] bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,23,20,0)_0%,rgba(11,23,20,0)_45%,rgba(11,23,20,0.38)_100%)]" />
      </div>

      <Link href="/" title="Meetrao home" className="unlink block self-start">
        <Image
          src="/brand/meetrao-logo-white.svg"
          alt="Meetrao"
          width={Math.round(24 * (576 / 127))}
          height={24}
          priority
          className="block w-auto"
          style={{ height: 24 }}
        />
      </Link>

      <div className="mt-auto flex flex-col gap-[18px]">
        <span className="inline-flex items-center gap-[8px] self-start rounded-full border border-white/20 bg-white/12 px-[14px] py-[7px] text-[13px] font-medium text-white backdrop-blur-[6px]">
          <Icon name="check" weight="solid" size={10} />
          Free to take bookings, no card
        </span>

        <h2 className="m-0 font-serif text-[52px] leading-[1.02] font-normal tracking-[-0.015em] text-pretty text-white">
          {signup ? "Start taking bookings" : "Good to see you again"}
        </h2>
        <p className="m-0 max-w-[40ch] text-[15px] leading-[1.55] text-white/80">
          {signup
            ? "Three steps to your first booking. Most people are done in about two minutes."
            : "Everything is where you left it."}
        </p>

        <ol className="m-0 mt-[14px] grid list-none grid-cols-3 gap-[10px] p-0">
          {signup
            ? STEPS.map((step, i) => (
                <PanelCard key={step.title} lit={i === 0} badge={<StepNumber n={i + 1} lit={i === 0} />}>
                  {step.title}
                </PanelCard>
              ))
            : WAITING.map((item) => (
                <PanelCard
                  key={item.title}
                  badge={
                    <span className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full border border-white/50">
                      <Icon name={item.icon} size={13} />
                    </span>
                  }
                >
                  {item.title}
                </PanelCard>
              ))}
        </ol>

        {/* The plan shape, where somebody is deciding whether to sign up at
            all. A visitor who finds out about a paid tier after investing an
            afternoon feels misled, even when nothing was hidden. */}
        <p className="m-0 text-[12.5px] leading-[1.55] text-white/70">
          Pro is {PRO_YEARLY} for your own domain and branding. Business is {BUSINESS_YEARLY} for a company with its
          own people.{" "}
          <Link href="/pricing" className="unlink font-semibold text-white underline underline-offset-2">
            Compare plans
          </Link>
        </p>
      </div>
    </aside>
  );
}

function PanelCard({ lit = false, badge, children }: { lit?: boolean; badge: ReactNode; children: ReactNode }) {
  return (
    <li
      className={cx(
        "flex min-h-[132px] flex-col justify-between gap-[14px] rounded-[16px] p-[16px]",
        lit
          ? "bg-white text-ink"
          : "border border-white/15 bg-white/10 text-white/85 backdrop-blur-[8px]",
      )}
    >
      <span className={cx("inline-flex", lit ? "text-accent" : "text-white")}>{badge}</span>
      <span className="text-[14px] leading-[1.35] font-medium">{children}</span>
    </li>
  );
}

function StepNumber({ n, lit }: { n: number; lit: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex h-[28px] w-[28px] items-center justify-center rounded-full text-[13px] font-semibold",
        lit ? "bg-accent text-on-accent" : "border border-white/50 text-white",
      )}
    >
      {n}
    </span>
  );
}
