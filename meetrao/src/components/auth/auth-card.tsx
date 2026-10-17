import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { LogoLink } from "@/components/ui/logo";
import { BUSINESS_YEARLY, PRO_YEARLY } from "@/lib/pricing";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   One card for log in, sign up, forgot and reset.

   THIRDS, EDGE TO EDGE. No card around them: the screen is the frame. Two
   thirds are the showcase, one third the form, because the form needs a
   column and the product needs room to be seen.
   The left is the brand: the homepage hero's
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
    <div className="grid min-h-screen w-full grid-cols-[minmax(0,2fr)_minmax(400px,1fr)] bg-surface max-[1000px]:grid-cols-[minmax(0,1.2fr)_minmax(380px,1fr)] max-[820px]:grid-cols-[1fr]">
      <BrandPanel panel={panel} />

      <div className="flex min-w-0 flex-col items-center justify-center px-[40px] py-[56px] max-[820px]:px-[20px] max-[820px]:py-[32px]">
        <div className="flex w-full max-w-[400px] flex-col gap-[24px]">
          <LogoLink height={24} className="hidden max-[820px]:block" />

          <div className="flex flex-col items-center gap-[8px] text-center max-[820px]:items-start max-[820px]:text-left">
            <h1 className="m-0 font-serif text-[40px] leading-[1.02] font-normal tracking-[-0.015em] text-ink max-[820px]:text-[36px]">
              {title}
            </h1>
            <p className="m-0 max-w-[36ch] text-[14px] leading-[1.55] text-pretty text-ink-2">{blurb}</p>
          </div>

          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}

function BrandPanel({ panel }: { panel: AuthPanel }) {
  const signup = panel === "signup";

  return (
    <aside className="sticky top-0 isolate flex h-screen min-h-[620px] min-w-0 flex-col overflow-hidden bg-[#103b33] px-[56px] py-[48px] text-white max-[1100px]:px-[40px] max-[820px]:hidden">
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

      <Showcase />

      <div className="flex flex-col gap-[18px]">
        <span className="inline-flex items-center gap-[8px] self-start rounded-full border border-white/20 bg-white/12 px-[14px] py-[7px] text-[13px] font-medium text-white backdrop-blur-[6px]">
          <Icon name="check" weight="solid" size={10} />
          Free to take bookings, no card
        </span>

        <h2 className="m-0 font-serif text-[56px] leading-[1.02] font-normal tracking-[-0.015em] text-pretty text-white max-[1100px]:text-[44px]">
          {signup ? "Start taking bookings" : "Good to see you again"}
        </h2>
        <p className="m-0 max-w-[40ch] text-[15px] leading-[1.55] text-white/80">
          {signup
            ? "Three steps to your first booking. Most people are done in about two minutes."
            : "Everything is where you left it."}
        </p>

        <ol className="m-0 mt-[14px] grid max-w-[640px] list-none grid-cols-3 gap-[12px] p-0">
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
          Pro is {PRO_YEARLY} for your own domain and branding. Business is {BUSINESS_YEARLY} for a company with its own
          people.{" "}
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
        "flex min-h-[112px] flex-col justify-between gap-[14px] rounded-[16px] p-[16px]",
        lit ? "bg-white text-ink" : "border border-white/15 bg-white/10 text-white/85 backdrop-blur-[8px]",
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

/* ─────────────────────────────────────────────────────────────────────────────
   The showcase: the product itself, floating.

   A booking page, the notification it produces and the link that starts it,
   as three cards hanging over the green light. Drawn here, not screenshotted,
   so it is sharp at every size and the dates are this month's: a demo showing
   last spring's calendar reads as a product nobody is using.

   It gives way on short screens. The headline and the steps are what the
   panel is for; when there is not room for both, the picture goes.
   ───────────────────────────────────────────────────────────────────────────── */

const TIMES = ["9:30 AM", "10:00 AM", "11:30 AM", "2:00 PM"];

function Showcase() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const today = now.getUTCDate();
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const weekday = (d: number) => new Date(Date.UTC(year, month, d)).getUTCDay();
  const open = (d: number) => d > today && weekday(d) !== 0 && weekday(d) !== 6;
  // Two working days out, or the first open day this month.
  const openDays = Array.from({ length: days }, (_, i) => i + 1).filter(open);
  const picked = openDays[1] ?? openDays[0] ?? null;
  const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(now);
  const pickedLabel = picked
    ? new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(
        new Date(Date.UTC(year, month, picked)),
      )
    : "Tomorrow";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative my-[24px] min-h-0 flex-1 select-none max-[1100px]:hidden [@media(max-height:760px)]:hidden"
    >
      <div className="absolute top-1/2 left-1/2 h-[320px] w-[560px] -translate-x-1/2 -translate-y-1/2 [@media(max-height:960px)]:scale-[0.8] [@media(max-height:820px)]:scale-[0.64]">
        {/* The booking page. */}
        <div className="float-a absolute top-0 left-0 w-[300px] rounded-[20px] bg-white p-[16px] text-ink shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-[10px]">
            <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent-ink">
              AV
            </span>
            <span className="flex flex-col">
              <span className="text-[13.5px] font-semibold">30 minute intro</span>
              <span className="text-[12px] text-ink-3">with Adam Voigt · Google Meet</span>
            </span>
          </div>

          <div className="mt-[14px] flex items-center justify-between text-[12px] font-semibold">
            <span>{label}</span>
            <span className="flex gap-[6px] text-ink-3">
              <Icon name="chevron-left" size={10} />
              <Icon name="chevron-right" size={10} />
            </span>
          </div>
          <div className="mt-[8px] grid grid-cols-7 gap-[4px] text-center text-[10.5px]">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} className="pb-[2px] text-ink-3">
                {d}
              </span>
            ))}
            {Array.from({ length: first }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const d = i + 1;
              return (
                <span
                  key={d}
                  className={cx(
                    "inline-flex h-[24px] items-center justify-center rounded-[7px]",
                    d === picked
                      ? "bg-accent font-semibold text-on-accent"
                      : open(d)
                        ? "bg-accent-soft font-semibold text-accent-ink"
                        : "text-ink-3/60",
                  )}
                >
                  {d}
                </span>
              );
            })}
          </div>
        </div>

        {/* The times for the picked day. */}
        <div className="float-c absolute top-[18px] right-0 w-[190px] rounded-[18px] border border-white/20 bg-white/14 p-[14px] text-white shadow-[0_24px_50px_-24px_rgba(0,0,0,0.5)] backdrop-blur-[14px]">
          <span className="text-[11px] font-semibold tracking-[0.06em] text-white/70 uppercase">{pickedLabel}</span>
          <div className="mt-[10px] flex flex-col gap-[7px]">
            {TIMES.map((t) => (
              <span
                key={t}
                className={cx(
                  "rounded-[9px] px-[12px] py-[7px] text-center text-[12.5px] font-semibold",
                  t === "10:00 AM" ? "bg-white text-accent-ink" : "border border-white/25 text-white",
                )}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* What it produces. */}
        <div className="float-b absolute right-[20px] bottom-0 flex w-[290px] items-start gap-[12px] rounded-[16px] bg-white p-[14px] text-ink shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]">
          <span className="inline-flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full bg-accent text-on-accent">
            <Icon name="check" weight="solid" size={12} />
          </span>
          <span className="flex min-w-0 flex-col gap-[2px]">
            <span className="text-[13px] font-semibold">New booking</span>
            <span className="text-[12px] text-ink-2">Priya Nair · {pickedLabel}, 10:00 AM</span>
            <span className="mt-[4px] inline-flex items-center gap-[6px] text-[11.5px] font-medium text-accent-ink">
              <Icon name="video" size={11} />
              Meet link added to both calendars
            </span>
          </span>
        </div>

        {/* Where it starts. */}
        <div className="float-c absolute bottom-0 left-[24px] inline-flex items-center gap-[8px] rounded-full border border-white/20 bg-[#0B1714]/55 px-[14px] py-[8px] text-[12.5px] font-medium text-white backdrop-blur-[10px]">
          <Icon name="link" size={11} />
          meetrao.com/you/intro-call
        </div>
      </div>
    </div>
  );
}
