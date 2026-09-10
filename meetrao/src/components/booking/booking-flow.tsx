"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { Callout } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { addDays, dateKey, type PlainDate } from "@/lib/booking/slots";
import { formatMonth, formatPlainLongDate, formatTime, formatTimeRange } from "@/lib/booking/time";
import { detectTimezone, timezoneLabel } from "@/lib/timezones";
import { useClientValue } from "@/lib/use-client-value";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   The guest path: pick a date, pick a time, confirm details.

   This is the only surface that has to work for someone with no account, on a
   phone, from an email link — so it renders complete from the server and then
   corrects itself to the guest's real timezone once the browser can say what
   that is.
   ───────────────────────────────────────────────────────────────────────────── */

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type FlowProps = {
  username: string;
  slug: string;
  hostName: string;
  hostAvatarUrl?: string | null;
  hostJobTitle: string;
  hostTimezone: string;
  meetingName: string;
  meetingDescription: string;
  durationMinutes: number;
  bookingWindowDays: number;
  initial: {
    year: number;
    month: number;
    openDates: string[];
    day: number | null;
    times: string[];
    timezone: string;
  };
  pageViewId: string | null;
};

type SlotState = { openDates: Set<string>; times: string[] };

export function BookingFlow(props: FlowProps) {
  const router = useRouter();
  const toast = useToast();

  // The server rendered in the host's zone because it cannot know the guest's.
  // This reads the real one on the first client render, with no flash and no
  // hydration mismatch.
  const timezone = useClientValue(detectTimezone, props.initial.timezone);
  const [year, setYear] = useState(props.initial.year);
  const [month, setMonth] = useState(props.initial.month);
  const [selected, setSelected] = useState<PlainDate | null>(
    props.initial.day ? { year: props.initial.year, month: props.initial.month, day: props.initial.day } : null,
  );
  const [slotState, setSlotState] = useState<SlotState>({
    openDates: new Set(props.initial.openDates),
    times: props.initial.times,
  });
  const [loading, setLoading] = useState(false);
  const [slotTaken, setSlotTaken] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "details">("pick");

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestNote, setGuestNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(false);

  const ticket = useRef(0);

  const load = useCallback(
    async (y: number, m: number, day: number | null, tz: string) => {
      const mine = ++ticket.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          username: props.username,
          slug: props.slug,
          year: String(y),
          month: String(m),
          tz,
        });
        if (day) params.set("day", String(day));

        const response = await fetch(`/api/slots?${params}`, { cache: "no-store" });
        if (!response.ok) throw new Error("slots");
        const json = (await response.json()) as { openDates: string[]; times: string[] };
        if (mine !== ticket.current) return;
        setSlotState({ openDates: new Set(json.openDates), times: json.times });
      } catch {
        if (mine === ticket.current) setSlotState({ openDates: new Set(), times: [] });
      } finally {
        if (mine === ticket.current) setLoading(false);
      }
    },
    [props.username, props.slug],
  );

  // Slots were computed in the host's zone; re-fetch them in the guest's the
  // moment we know it differs. This is a subscription to an external system —
  // the loading flag it raises is the fetch starting, not a derived value.
  useEffect(() => {
    if (timezone === props.initial.timezone) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(props.initial.year, props.initial.month, props.initial.day, timezone);
    // Only ever runs for the first paint's values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone]);

  const monthCells = buildMonth(year, month);
  const todayKey = dateKey(todayIn(timezone));
  const lastBookable = addDays(todayIn(timezone), props.bookingWindowDays);

  const canGoBack = year > todayIn(timezone).year || month > todayIn(timezone).month;
  const canGoForward = year < lastBookable.year || (year === lastBookable.year && month < lastBookable.month);

  function goMonth(delta: number) {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1));
    const y = next.getUTCFullYear();
    const m = next.getUTCMonth() + 1;
    setYear(y);
    setMonth(m);
    setSelected(null);
    setChosen(null);
    setSlotState((s) => ({ ...s, times: [] }));
    void load(y, m, null, timezone);
  }

  function pickDate(day: number) {
    const date = { year, month, day };
    setSelected(date);
    setChosen(null);
    setSlotTaken(false);
    void load(year, month, day, timezone);
  }

  async function submit() {
    if (!chosen) return;
    if (!guestName.trim() || !guestEmail.includes("@")) {
      setTouched(true);
      setBookingError(false);
      return;
    }

    setSubmitting(true);
    setBookingError(false);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: props.username,
          slug: props.slug,
          start: chosen,
          guestName,
          guestEmail,
          guestNote,
          guestTimezone: timezone,
          pageViewId: props.pageViewId ?? undefined,
        }),
      });

      if (response.status === 409) {
        // Someone took it between the form loading and this submit. The design
        // has this state built, and the re-check above makes it true.
        setBookingError(true);
        setSubmitting(false);
        toast({
          tone: "bad",
          title: "Booking failed",
          text: "That time was taken while you were filling in your details.",
        });
        return;
      }

      const json = (await response.json()) as { reference?: string; error?: string };
      if (!response.ok || !json.reference) {
        setSubmitting(false);
        toast({ tone: "bad", title: "Could not book", text: json.error ?? "Try again in a moment." });
        return;
      }

      router.push(`/booking/${json.reference}`);
    } catch {
      setSubmitting(false);
      toast({ tone: "bad", title: "Could not book", text: "Check your connection and try again." });
    }
  }

  const chosenStart = chosen ? new Date(chosen) : null;
  const chosenEnd = chosenStart ? new Date(chosenStart.getTime() + props.durationMinutes * 60_000) : null;

  if (step === "details" && chosenStart && chosenEnd && selected) {
    return (
      <div className="m-auto flex w-full max-w-[520px] flex-col gap-[14px]">
        <div className="flex flex-col gap-[22px] rounded-[12px] border border-line bg-surface p-[30px] max-[820px]:p-[22px]">
          <div className="flex flex-col gap-[8px]">
            <h1 className="m-0 font-serif text-[28px] leading-[1.1] font-normal tracking-[-0.01em] text-ink">
              Confirm your details
            </h1>
            <div className="flex flex-col gap-[5px] rounded-[8px] border border-line bg-fill px-[14px] py-[12px]">
              <span className="text-[13.5px] font-semibold text-ink">
                {props.meetingName} · {props.durationMinutes} min
              </span>
              <span className="text-[12.5px] text-ink-2">
                {formatPlainLongDate(selected, timezone)} ·{" "}
                {formatTimeRange(chosenStart, chosenEnd, timezone)}
              </span>
            </div>
          </div>

          {bookingError ? (
            <Callout
              tone="red"
              title="That time is no longer available"
              align="center"
              action={
                <Button
                  variant="danger"
                  size={30}
                  onClick={() => {
                    setBookingError(false);
                    setChosen(null);
                    setStep("pick");
                    // The list the guest comes back to must not still offer the
                    // slot that just went.
                    setSlotTaken(true);
                    if (selected) void load(selected.year, selected.month, selected.day, timezone);
                  }}
                >
                  Pick another time
                </Button>
              }
            >
              Someone booked it while you were filling this in. Nothing has been scheduled.
            </Callout>
          ) : null}

          <div className="flex flex-col gap-[14px]">
            <Field
              label="Full name"
              htmlFor="guest-name"
              error={touched && !guestName.trim() ? `${firstName(props.hostName)} needs to know who he is meeting.` : undefined}
            >
              <Input
                id="guest-name"
                height={38}
                placeholder="John Smith"
                value={guestName}
                invalid={touched && !guestName.trim()}
                onChange={(e) => setGuestName(e.target.value)}
                autoComplete="name"
              />
            </Field>

            <Field
              label="Email address"
              htmlFor="guest-email"
              help="The confirmation and Meet link go here."
              error={touched && !guestEmail.includes("@") ? "Enter an email we can send the confirmation to." : undefined}
            >
              <Input
                id="guest-email"
                type="email"
                height={38}
                placeholder="you@company.com"
                value={guestEmail}
                invalid={touched && !guestEmail.includes("@")}
                onChange={(e) => setGuestEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>

            <Field
              label={
                <>
                  Note <span className="font-normal text-ink-3">(optional)</span>
                </>
              }
              htmlFor="guest-note"
            >
              <Textarea
                id="guest-note"
                rows={3}
                placeholder={`Anything ${firstName(props.hostName)} should know beforehand?`}
                value={guestNote}
                onChange={(e) => setGuestNote(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-[10px]">
            <Button variant="accent" size={42} full busy={submitting} onClick={submit}>
              {submitting ? "Scheduling…" : "Schedule meeting"}
            </Button>
            <Button
              variant="ghost"
              size={36}
              full
              icon="chevron-left"
              iconSize={10}
              onClick={() => {
                setStep("pick");
                setBookingError(false);
              }}
            >
              Back to times
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="m-auto flex w-full max-w-[940px] flex-col gap-[14px]">
      <div className="grid grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] overflow-hidden rounded-[12px] border border-line bg-surface max-[820px]:grid-cols-[1fr]">
        <div className="flex min-w-0 flex-col gap-[15px] border-r border-line bg-fill p-[30px] max-[820px]:border-r-0 max-[820px]:border-b max-[820px]:bg-surface max-[820px]:px-[22px] max-[820px]:py-[26px]">
          <div className="flex items-center gap-[11px]">
            {props.hostAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={props.hostAvatarUrl}
                alt=""
                aria-hidden="true"
                width={38}
                height={38}
                className="h-[38px] w-[38px] flex-none rounded-[8px] object-cover"
              />
            ) : (
              <span className="inline-flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[8px] bg-accent-soft text-[13px] font-bold text-accent">
                {initials(props.hostName)}
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-[1px]">
              <span className="text-[13.5px] font-semibold text-ink">{props.hostName}</span>
              {props.hostJobTitle ? (
                <span className="text-[12px] text-ink-3">{props.hostJobTitle}</span>
              ) : null}
            </div>
          </div>

          <h1 className="m-0 font-serif text-[31px] leading-[1.08] font-normal tracking-[-0.01em] text-pretty text-ink">
            {props.meetingName}
          </h1>
          {props.meetingDescription ? (
            <p className="m-0 text-[13.5px] leading-[1.55] text-pretty text-ink-2">{props.meetingDescription}</p>
          ) : null}

          <div className="mt-auto flex flex-col gap-[10px] pt-[4px]">
            <div className="flex items-center gap-[10px]">
              <Icon name="clock" size={13} className="w-[15px] flex-none text-ink-3" />
              <span className="text-[13px] text-ink">{props.durationMinutes} minutes</span>
            </div>
            <div className="flex items-center gap-[10px]">
              <Icon name="video" size={13} className="w-[15px] flex-none text-ink-3" />
              <span className="text-[13px] text-ink">Google Meet</span>
            </div>
            <div className="flex items-start gap-[10px]">
              <Icon name="globe" size={13} className="mt-[1px] w-[15px] flex-none text-ink-3" />
              <span className="text-[13px] leading-[1.45] text-ink-2">Times shown in {timezoneLabel(timezone)}</span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px] p-[30px] max-[820px]:px-[22px] max-[820px]:py-[24px]">
          <div className="flex flex-col gap-[12px]">
            <div className="flex items-center justify-between gap-[12px]">
              <Eyebrow size={10.5} className="whitespace-nowrap">
                Select a date
              </Eyebrow>
              <div className="flex items-center gap-[4px]">
                <MonthButton dir="prev" disabled={!canGoBack} onClick={() => goMonth(-1)} />
                <span className="min-w-[118px] text-center text-[13.5px] font-semibold text-ink">
                  {formatMonth(year, month)}
                </span>
                <MonthButton dir="next" disabled={!canGoForward} onClick={() => goMonth(1)} />
              </div>
            </div>

            <div className="grid grid-cols-7 gap-[5px]">
              {WEEK.map((label) => (
                <span
                  key={label}
                  className="pb-[2px] text-center text-[10px] tracking-[0.04em] text-ink-3 uppercase"
                >
                  {label}
                </span>
              ))}

              {monthCells.map((cell, i) => {
                if (cell === null) return <span key={`e${i}`} aria-hidden="true" />;
                const key = dateKey({ year, month, day: cell });
                const open = slotState.openDates.has(key);
                const isToday = key === todayKey;
                const isSelected = selected?.day === cell;

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!open}
                    aria-pressed={isSelected}
                    onClick={() => pickDate(cell)}
                    className={cx(
                      "flex h-[38px] items-center justify-center rounded-[6px] border font-sans text-[13px] font-medium",
                      "transition-[background-color,border-color] duration-[120ms]",
                      !open && "cursor-not-allowed border-transparent bg-transparent text-ink-3 opacity-45",
                      open && !isSelected && !isToday && "cursor-pointer border-line bg-surface text-ink hover:border-line-strong hover:bg-fill",
                      open && isToday && !isSelected && "cursor-pointer border-accent bg-surface font-semibold text-accent",
                      isSelected && "cursor-pointer border-accent bg-accent font-semibold text-white hover:bg-accent-2",
                    )}
                  >
                    {cell}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-[14px] pt-[2px]">
              <Legend className="border border-accent">Today</Legend>
              <Legend className="bg-accent">Selected</Legend>
              <Legend className="border border-line">Available</Legend>
            </div>
          </div>

          <div className="flex flex-col gap-[11px] border-t border-line pt-[18px]">
            <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
              <Eyebrow size={10.5}>Available times</Eyebrow>
              {selected ? (
                <span className="text-[12.5px] text-ink-2">{formatPlainLongDate(selected, timezone)}</span>
              ) : null}
            </div>

            {slotTaken ? (
              <Callout tone="red">That time was just booked by someone else. The list below is up to date.</Callout>
            ) : null}

            {loading ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-[6px]" aria-hidden="true">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className="h-[38px] animate-pulse rounded-[6px] border border-line bg-fill" />
                ))}
              </div>
            ) : !selected ? (
              <div className="flex flex-col gap-[6px] rounded-[8px] border border-dashed border-line-strong px-[16px] py-[22px]">
                <span className="text-[13.5px] font-semibold text-ink">Pick a date first</span>
                <span className="text-[12.5px] text-ink-2">
                  Days with open times are outlined in the calendar above.
                </span>
              </div>
            ) : slotState.times.length ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-[6px]">
                {slotState.times.map((iso) => {
                  const isChosen = chosen === iso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => {
                        setChosen(iso);
                        setTouched(false);
                        setStep("details");
                      }}
                      className={cx(
                        "flex h-[38px] items-center justify-center rounded-[6px] border px-[10px] font-sans text-[13px] font-medium",
                        "cursor-pointer transition-[background-color,border-color] duration-[120ms]",
                        isChosen
                          ? "border-accent bg-accent font-semibold text-white hover:bg-accent-2"
                          : "border-line-strong bg-surface text-ink hover:border-accent hover:bg-fill",
                      )}
                    >
                      {formatTime(new Date(iso), timezone)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-[6px] rounded-[8px] border border-dashed border-line-strong px-[16px] py-[22px]">
                <span className="text-[13.5px] font-semibold text-ink">No times on this day</span>
                <span className="text-[12.5px] text-ink-2">
                  {firstName(props.hostName)} is not taking bookings then. Try another date.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthButton({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={dir === "prev" ? "Previous month" : "Next month"}
      aria-label={dir === "prev" ? "Previous month" : "Next month"}
      className={cx(
        "inline-flex h-[28px] w-[28px] items-center justify-center rounded-[6px] border border-line bg-surface text-ink-2",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-fill",
      )}
    >
      <Icon name={dir === "prev" ? "chevron-left" : "chevron-right"} size={10} />
    </button>
  );
}

function Legend({ className, children }: { className: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-[6px] text-[11.5px] text-ink-3">
      <span aria-hidden="true" className={cx("h-[9px] w-[9px] rounded-[3px]", className)} />
      {children}
    </span>
  );
}

/** Leading blanks then the days, so the first of the month lands on its weekday. */
function buildMonth(year: number, month: number): (number | null)[] {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [...Array.from({ length: firstDow }, () => null), ...Array.from({ length: days }, (_, i) => i + 1)];
}

function todayIn(timezone: string): PlainDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = parts.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function firstName(name: string): string {
  return name.split(" ")[0] || name;
}
