"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ImageFrame } from "./image-frame";
import { BrowserFrame, DemoMonthGrid, DemoSlot, demoDayLabel } from "./demo-calendar";
import { cx } from "@/lib/cx";
import { useMediaQuery } from "@/lib/use-client-value";

/* ─────────────────────────────────────────────────────────────────────────────
   The walkthrough: four collapsed rails and one expanded card holding a real,
   clickable product screen.

   It advances itself every seven seconds until the visitor takes over. Any
   manual pick stops the rotation for good — once someone is steering, moving
   the card under them is hostile.
   ───────────────────────────────────────────────────────────────────────────── */

const DWELL = 7000;

type StageKey = "avail" | "booking" | "guest" | "confirm";

const WALK: { key: StageKey; n: string; title: string; text: string; outcome: string; url: string }[] = [
  {
    key: "avail",
    n: "01",
    title: "Set your availability",
    text: "Tick the days you work and the hours within them. Meetrao never offers anything outside them.",
    outcome: "Mon to Fri, 9:00 to 17:00. Nothing outside it is ever offered.",
    url: "meetrao.com/settings/availability",
  },
  {
    key: "booking",
    n: "02",
    title: "Share one link",
    text: "meetrao.com/adam, always reflecting your calendar exactly as it is right now.",
    outcome: "One link. It never goes stale and never double-books.",
    url: "meetrao.com/adam",
  },
  {
    key: "guest",
    n: "03",
    title: "Your guest picks",
    text: "A name, an email, done. No account, no download, no timezone maths.",
    outcome: "Your guest sees your hours in their own timezone.",
    url: "meetrao.com/adam — confirm",
  },
  {
    key: "confirm",
    n: "04",
    title: "Booked, both sides",
    text: "One calendar event with a Google Meet link, and your guest invited to the same event.",
    outcome: "On both calendars, with a Meet link, automatically.",
    url: "meetrao.com/adam — booked",
  },
];

const AVAIL_DAYS: [string, string, [string, string][]][] = [
  ["mon", "Monday", [["9:00 AM", "12:00 PM"], ["2:00 PM", "5:00 PM"]]],
  ["tue", "Tuesday", [["9:00 AM", "5:00 PM"]]],
  ["wed", "Wednesday", [["9:00 AM", "5:00 PM"]]],
  ["thu", "Thursday", [["9:00 AM", "5:00 PM"]]],
  ["fri", "Friday", [["9:00 AM", "3:00 PM"]]],
];


export function Walkthrough() {
  const compact = useMediaQuery("(max-width: 1000px)");
  const [stage, setStage] = useState<StageKey>("avail");
  const [auto, setAuto] = useState(true);

  const [availOn, setAvailOn] = useState<Record<string, boolean>>({
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
  });
  const [day, setDay] = useState(9);
  const [slot, setSlot] = useState("10:00");
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      if (document.hidden) return;
      setStage((current) => {
        const i = WALK.findIndex((w) => w.key === current);
        return WALK[(i + 1) % WALK.length].key;
      });
      setBooked(false);
    }, DWELL);

    return () => clearInterval(id);
  }, [auto]);

  const pick = (key: StageKey) => {
    setAuto(false);
    setStage(key);
    setBooked(false);
  };

  const openDays = Object.values(availOn).filter(Boolean).length;
  const current = WALK.find((w) => w.key === stage) ?? WALK[0];
  const currentIndex = WALK.findIndex((w) => w.key === stage);

  return (
    <div className="relative mt-[30px]">
      <div className={cx("relative flex items-stretch gap-[8px]", compact ? "flex-col" : "min-h-[504px]")}>
        {WALK.map((step, i) => {
          if (step.key !== stage) {
            const reached = currentIndex >= i;
            return (
              <button
                key={step.key}
                type="button"
                aria-label={`Step ${step.n} — ${step.title}`}
                onClick={() => pick(step.key)}
                className={cx(
                  "relative box-border block cursor-pointer overflow-hidden rounded-[14px] border border-line bg-fill p-0 font-sans",
                  "transition-[flex-basis,background-color,border-color] duration-[780ms] ease-[cubic-bezier(.22,1,.36,1)]",
                  "hover:border-line-strong hover:bg-fill-2",
                  compact ? "h-[58px] flex-none" : "flex-[0_0_54px]",
                )}
              >
                <span
                  className={cx(
                    "box-border h-full",
                    compact
                      ? "flex w-full items-center gap-[12px] px-[16px]"
                      : "flex flex-col items-center gap-[14px] py-[16px]",
                  )}
                >
                  <span
                    className={cx(
                      "flex-none font-serif text-[24px] leading-[1] tracking-[-0.02em] transition-colors duration-[420ms]",
                      reached ? "text-accent" : "text-ink-3",
                    )}
                  >
                    {step.n}
                  </span>
                  <span
                    className={cx(
                      "overflow-hidden text-[13px] font-semibold tracking-[0.01em] overflow-ellipsis whitespace-nowrap text-ink-2",
                      compact ? "min-w-0 flex-1 text-left" : "min-h-0 flex-1 rotate-180 text-right [writing-mode:vertical-rl]",
                    )}
                  >
                    {step.title}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cx(
                      "h-[6px] w-[6px] flex-none rounded-full transition-colors duration-[420ms]",
                      reached ? "bg-accent" : "bg-line-strong",
                    )}
                  />
                </span>
              </button>
            );
          }

          return (
            <div
              key={step.key}
              aria-current="step"
              className="animate-open relative box-border min-w-0 flex-[1_1_auto] overflow-hidden rounded-[14px] border border-white/15 bg-accent-2 shadow-[0_1px_2px_rgba(26,25,23,0.04),0_18px_34px_-20px_rgba(26,25,23,0.26)]"
              style={{
                backgroundImage:
                  "radial-gradient(115% 85% at 4% 0%, rgba(52,168,146,0.30) 0%, rgba(52,168,146,0) 58%)," +
                  "radial-gradient(85% 75% at 100% 14%, rgba(127,216,196,0.16) 0%, rgba(127,216,196,0) 60%)," +
                  "radial-gradient(95% 105% at 34% 108%, rgba(11,23,20,0.55) 0%, rgba(11,23,20,0) 56%)",
              }}
            >
              <div
                className={cx(
                  "grid items-center",
                  compact
                    ? "grid-cols-[1fr] gap-[20px] p-[22px]"
                    : "grid-cols-[minmax(250px,0.78fr)_minmax(0,1fr)] gap-[26px] p-[28px]",
                )}
              >
                <div className="flex min-w-0 flex-col gap-[14px]">
                  <div className="flex items-center gap-[12px]">
                    <span
                      className={cx(
                        "flex-none font-serif leading-[0.9] tracking-[-0.03em] text-[#7FD8C4]",
                        compact ? "text-[38px]" : "text-[52px]",
                      )}
                    >
                      {step.n}
                    </span>
                    <span aria-hidden="true" className="h-[1px] min-w-0 flex-1 bg-white/25" />
                    <span className="flex-none font-mono text-[10px] tracking-[0.07em] text-[#7FD8C4] uppercase">
                      Step {i + 1} of {WALK.length}
                    </span>
                  </div>

                  <h3
                    className={cx(
                      "m-0 font-serif leading-[1.02] font-normal tracking-[-0.022em] text-balance text-white",
                      compact ? "text-[clamp(26px,7vw,32px)]" : "text-[clamp(28px,2.9vw,40px)]",
                    )}
                  >
                    {step.title}
                  </h3>

                  <p className="m-0 max-w-[34ch] text-[14px] leading-[1.6] text-pretty text-white/80">
                    {step.text}
                  </p>

                  <div className="flex gap-[11px] rounded-[11px] border border-white/15 bg-white/10 px-[14px] py-[12px]">
                    <Icon name="check" weight="solid" size={10} className="mt-[3px] flex-none text-[#7FD8C4]" />
                    <span className="min-w-0 flex-1 text-[13px] leading-[1.5] font-medium text-white">
                      {current.outcome}
                    </span>
                  </div>

                  {/* The countdown exists only while the rotation does — a static
                      bar would falsely promise an advance that is not coming. */}
                  {auto ? (
                    <span className="block h-[3px] w-full overflow-hidden rounded-[2px] bg-line">
                      <span
                        key={stage}
                        className="block h-full rounded-[2px] bg-accent"
                        style={{ animation: `mr-fill ${DWELL}ms linear both` }}
                      />
                    </span>
                  ) : null}
                </div>

                <div className="relative min-w-0">
                  <BrowserFrame url={step.url}>
                    <div className="flex min-h-[460px] flex-col justify-center p-[22px]">
                      {stage === "avail" ? (
                        <div className="animate-stage flex flex-col gap-[12px]">
                          <div className="flex flex-wrap items-end justify-between gap-[10px]">
                            <span className="text-[15px] font-semibold text-ink">Availability</span>
                            <span className="inline-flex h-[30px] items-center gap-[8px] rounded-[6px] border border-line-strong bg-surface px-[11px] text-[12.5px] text-ink">
                              <Icon name="globe" size={11} className="text-ink-3" />
                              GMT+06:00 Dhaka
                            </span>
                          </div>

                          <div className="overflow-hidden rounded-[9px] border border-line">
                            {AVAIL_DAYS.map(([key, label, ranges], di) => {
                              const on = availOn[key];
                              return (
                                <div
                                  key={key}
                                  className={cx(
                                    "flex flex-wrap items-center gap-[12px] px-[13px] py-[10px]",
                                    di > 0 && "border-t border-line-soft",
                                    on ? "bg-surface" : "bg-fill",
                                  )}
                                >
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={on}
                                    aria-label={`${on ? "Disable" : "Enable"} ${label}`}
                                    onClick={() => setAvailOn((s) => ({ ...s, [key]: !s[key] }))}
                                    className="flex w-[118px] flex-none cursor-pointer items-center gap-[9px] border-0 bg-transparent p-0 text-left font-sans"
                                  >
                                    <span
                                      className={cx(
                                        "inline-flex h-[16px] w-[16px] flex-none items-center justify-center rounded-[4px] border text-white",
                                        "transition-[background-color,border-color] duration-[120ms]",
                                        on ? "border-accent bg-accent" : "border-line-strong bg-surface",
                                      )}
                                    >
                                      {on ? <Icon name="check" weight="solid" size={8} /> : null}
                                    </span>
                                    <span className="text-[13px] font-medium text-ink">{label}</span>
                                  </button>

                                  {on ? (
                                    <div className="flex flex-wrap items-center gap-[6px]">
                                      {ranges.map(([start, end]) => (
                                        <span key={start} className="inline-flex items-center gap-[7px]">
                                          <span className="inline-flex h-[27px] items-center rounded-[6px] border border-line-strong bg-surface px-[9px] text-[12px] text-ink">
                                            {start}
                                          </span>
                                          <span className="text-[11.5px] text-ink-3">to</span>
                                          <span className="inline-flex h-[27px] items-center rounded-[6px] border border-line-strong bg-surface px-[9px] text-[12px] text-ink">
                                            {end}
                                          </span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[12.5px] text-ink-3">Unavailable</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <span className="text-[12px] text-ink-3">
                            {openDays === 0
                              ? "No days selected — your link would show no times at all."
                              : `${openDays} ${openDays === 1 ? "day" : "days"} a week. Tick a day off and watch it grey out — it is live.`}
                          </span>
                        </div>
                      ) : null}

                      {stage === "booking" ? (
                        <div className="animate-stage flex flex-col gap-[12px]">
                          <div className="flex items-center gap-[10px]">
                            <ImageFrame
                              label="Host"
                              className="h-[32px] w-[32px] flex-none"
                              rounded="rounded-[8px]"
                              ground="bg-accent-soft"
                            />
                            <div className="flex min-w-0 flex-col gap-[1px]">
                              <span className="text-[13px] font-semibold text-ink">Adam Voigt</span>
                              <span className="font-mono text-[11px] text-ink-3">meetrao.com/adam</span>
                            </div>
                            <span className="ml-auto inline-flex h-[24px] flex-none items-center gap-[7px] rounded-[5px] border border-line bg-fill px-[9px] text-[11.5px] text-ink-2">
                              30 min · Google Meet
                            </span>
                          </div>

                          <DemoMonthGrid selected={day} onSelect={setDay} />

                          <div className="grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-[5px] border-t border-line pt-[11px]">
                            {["9:00", "9:30", "10:00", "10:30", "11:00", "2:00", "2:30", "3:00"].map((label) => (
                              <DemoSlot
                                key={label}
                                label={label}
                                on={slot === label}
                                onClick={() => setSlot(label)}
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {stage === "guest" ? (
                        <div className="animate-stage mx-auto flex w-full max-w-[420px] flex-col gap-[12px]">
                          <span className="font-serif text-[26px] leading-[1.06] text-ink">
                            Confirm your details
                          </span>
                          <div className="flex flex-col gap-[4px] rounded-[8px] border border-line bg-fill px-[13px] py-[11px]">
                            <span className="text-[13px] font-semibold text-ink">
                              30 Minute Consultation · 30 min
                            </span>
                            <span className="text-[12.5px] text-ink-2">
                              {demoDayLabel(day)} · {slot || "10:00"} – 10:30 AM
                            </span>
                          </div>

                          {[
                            ["Full name", "Priya Nair", false],
                            ["Email address", "priya@nairstudio.com", true],
                            ["Note (optional)", "Happy to share the brief beforehand.", false],
                          ].map(([label, value, mono]) => (
                            <div key={label as string} className="flex flex-col gap-[6px]">
                              <span className="text-[12px] font-semibold text-ink">{label as string}</span>
                              <div
                                className={cx(
                                  "rounded-[6px] border border-line-strong bg-surface px-[11px] py-[8px] text-[12.5px] text-ink",
                                  mono && "font-mono",
                                )}
                              >
                                {value as string}
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => {
                              setAuto(false);
                              if (booked) {
                                setStage("confirm");
                                return;
                              }
                              setBooked(true);
                              setTimeout(() => setStage("confirm"), 620);
                            }}
                            className="inline-flex h-[40px] cursor-pointer items-center justify-center gap-[9px] rounded-[7px] border border-accent bg-accent font-sans text-[13.5px] font-semibold text-white transition-colors duration-[120ms] hover:bg-accent-2"
                          >
                            {booked ? "Scheduled — go to step 04" : "Schedule meeting"}
                          </button>
                        </div>
                      ) : null}

                      {stage === "confirm" ? (
                        <div className="animate-stage mx-auto flex w-full max-w-[420px] flex-col gap-[12px]">
                          <div className="flex items-center gap-[11px]">
                            <span className="inline-flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-accent text-white">
                              <Icon name="check" weight="solid" size={12} />
                            </span>
                            <span className="font-serif text-[28px] leading-[1.02] text-ink">
                              You&rsquo;re booked!
                            </span>
                          </div>

                          <div className="flex flex-col overflow-hidden rounded-[9px] border border-line">
                            {[
                              ["Meeting", "30 Minute Consultation", false],
                              ["Host", "Adam Voigt", false],
                              ["When", `${demoDayLabel(day)} · ${slot || "10:00"} – 10:30 AM`, false],
                              ["Where", "meet.google.com/qvd-mspt-jrb", true],
                            ].map(([k, v, mono], ri) => (
                              <div
                                key={k as string}
                                className={cx(
                                  "flex flex-wrap gap-[10px] px-[13px] py-[9px]",
                                  ri > 0 && "border-t border-line-soft",
                                )}
                              >
                                <span className="w-[74px] flex-none text-[12px] text-ink-3">{k as string}</span>
                                <span
                                  className={cx(
                                    "min-w-[130px] flex-1 break-words text-ink",
                                    mono ? "font-mono text-[12px]" : "text-[12.5px] font-medium",
                                  )}
                                >
                                  {v as string}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-[10px] rounded-[9px] border border-accent-line bg-accent-soft px-[13px] py-[11px]">
                            <Icon name="check" weight="solid" size={11} className="mt-[2px] flex-none text-accent" />
                            <span className="min-w-0 flex-1 text-[12.5px] leading-[1.5] text-accent">
                              This is already on your calendar. Adam has been invited to the same event.
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </BrowserFrame>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
