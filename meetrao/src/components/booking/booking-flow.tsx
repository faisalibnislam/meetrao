"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Avatar, Eyebrow } from "@/components/ui/controls";
import { Field, FieldError, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { detectTimezone, timezoneLabel } from "@/lib/timezones";
import { formatLongDate, formatTimeRange } from "@/lib/booking/time";
import { useHydrated } from "@/lib/use-hydrated";

export type MonthPayload = {
  month: string;
  hostTimezone: string;
  todayKey: string;
  /** host-calendar-day → bookable instants, as ISO strings */
  days: Record<string, string[]>;
};

export type BookingPageData = {
  username: string;
  slug: string;
  hostName: string;
  hostJobTitle: string;
  hostAvatarUrl: string | null;
  meetingName: string;
  meetingDescription: string;
  durationMinutes: number;
  /** YYYY-MM values the guest may page through. */
  months: string[];
  initialMonth: MonthPayload;
};

const WEEK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return `${new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, m - 1, 1)),
  )} ${year}`;
}

/** Day-of-week (0–6) that the 1st of `month` falls on, in UTC terms. */
function firstDayOffset(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).getUTCDay();
}

function daysInMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

export function BookingFlow({ data }: { data: BookingPageData }) {
  const router = useRouter();
  const { notify } = useToast();

  const [monthIndex, setMonthIndex] = useState(0);
  const [payloads, setPayloads] = useState<Record<string, MonthPayload>>({
    [data.initialMonth.month]: data.initialMonth,
  });
  /* Start on the host's timezone so SSR and the first client paint agree, then
     switch to the guest's real zone once hydrated. */
  const hydrated = useHydrated();
  const guestTz = hydrated ? detectTimezone() : data.initialMonth.hostTimezone;

  const month = data.months[monthIndex];
  const payload = payloads[month];
  // Derived rather than tracked: no payload for this month means it is loading.
  const loadingMonth = !payload;

  const [selectedKey, setSelectedKey] = useState<string | null>(() => {
    const keys = Object.keys(data.initialMonth.days).sort();
    return keys[0] ?? null;
  });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "details">("pick");
  const [slotTaken, setSlotTaken] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestNote, setGuestNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(false);

  const slotsUrl = useCallback(
    (target: string) =>
      `/api/slots?username=${encodeURIComponent(data.username)}` +
      `&slug=${encodeURIComponent(data.slug)}&month=${target}`,
    [data.username, data.slug],
  );

  // Months already asked for, so paging back and forth does not refetch.
  const requested = useRef(new Set<string>([data.initialMonth.month]));

  useEffect(() => {
    if (requested.current.has(month)) return;
    requested.current.add(month);

    const controller = new AbortController();

    void (async () => {
      try {
        const res = await fetch(slotsUrl(month), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as MonthPayload;
        setPayloads((p) => ({ ...p, [month]: json }));
      } catch {
        if (controller.signal.aborted) return;
        // Let a later visit to this month try again.
        requested.current.delete(month);
        notify("bad", "Could not load times", "Try again in a moment.");
      }
    })();

    return () => controller.abort();
  }, [month, slotsUrl, notify]);

  /** Re-reads the current month, used after a slot turns out to be gone. */
  const refreshMonth = useCallback(async () => {
    setPayloads((p) => {
      const next = { ...p };
      delete next[month];
      return next;
    });

    const res = await fetch(slotsUrl(month), { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as MonthPayload;
      setPayloads((p) => ({ ...p, [month]: json }));
    } else {
      requested.current.delete(month);
    }
  }, [slotsUrl, month]);

  const cells = useMemo(() => {
    if (!payload) return [];
    const offset = firstDayOffset(month);
    const total = daysInMonth(month);

    const out: Array<{
      key: string;
      label: string;
      dateKey?: string;
      state: "empty" | "disabled" | "open" | "today" | "selected";
    }> = [];

    for (let i = 0; i < offset; i++) {
      out.push({ key: `e${i}`, label: "", state: "empty" });
    }
    for (let day = 1; day <= total; day++) {
      const dateKey = `${month}-${String(day).padStart(2, "0")}`;
      const open = Boolean(payload.days[dateKey]?.length);
      const isToday = dateKey === payload.todayKey;
      const isSelected = dateKey === selectedKey && open;

      out.push({
        key: dateKey,
        label: String(day),
        dateKey,
        state: !open
          ? "disabled"
          : isSelected
            ? "selected"
            : isToday
              ? "today"
              : "open",
      });
    }
    return out;
  }, [payload, month, selectedKey]);

  const slots = selectedKey ? (payload?.days[selectedKey] ?? []) : [];

  const selectedDateLabel = selectedKey
    ? formatLongDate(
        new Date(`${selectedKey}T12:00:00Z`),
        // A date has no timezone, so render the label in UTC to avoid the
        // guest's own zone shifting the calendar day by one.
        "UTC",
      )
    : "";

  const selectionSummary =
    selectedSlot != null
      ? `${formatLongDate(new Date(selectedSlot), guestTz)} · ${formatTimeRange(
          new Date(selectedSlot),
          new Date(new Date(selectedSlot).getTime() + data.durationMinutes * 60_000),
          guestTz,
        )}`
      : "";

  const nameInvalid = touched && !guestName.trim();
  const emailInvalid = touched && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guestEmail);

  async function submit() {
    if (!guestName.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guestEmail)) {
      setTouched(true);
      return;
    }
    if (!selectedSlot) return;

    setSubmitting(true);
    setBookingError(false);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username,
          slug: data.slug,
          startsAt: selectedSlot,
          guestName,
          guestEmail,
          guestNote,
          guestTimezone: guestTz,
        }),
      });

      if (res.status === 201) {
        const json = (await res.json()) as { reference: string };
        router.push(`/booking/${json.reference}`);
        return;
      }

      if (res.status === 409) {
        setBookingError(true);
        notify(
          "bad",
          "Booking failed",
          "That time was taken while you were filling in your details.",
        );
        void refreshMonth();
        return;
      }

      const json = (await res.json()) as { message?: string };
      notify("bad", "Could not book", json.message ?? "Try another time.");
    } catch {
      notify("bad", "Could not book", "Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Guest details step ────────────────────────────────────────────────── */

  if (step === "details") {
    return (
      <div className="flex min-h-dvh items-start justify-center bg-ground p-[20px]">
        <div className="m-auto flex w-full max-w-[520px] flex-col gap-[14px]">
          <Link href="/" title="Meetrao home" className="block self-start no-underline">
            <Logo height={20} />
          </Link>

          <div className="flex flex-col gap-[22px] rounded-[12px] border border-line bg-surface p-[30px]">
            <div className="flex flex-col gap-[8px]">
              <h1 className="m-0 font-serif text-[28px] leading-[1.1] font-normal tracking-[-0.01em] text-ink">
                Confirm your details
              </h1>
              <div className="flex flex-col gap-[5px] rounded-[8px] border border-line bg-fill px-[14px] py-[12px]">
                <span className="text-[13.5px] font-semibold text-ink">
                  {data.meetingName} · {data.durationMinutes} min
                </span>
                <span className="text-[12.5px] text-ink-2">
                  {selectionSummary}
                </span>
              </div>
            </div>

            {bookingError ? (
              <div
                role="alert"
                className="flex flex-wrap items-center gap-[12px] rounded-[8px] border border-red-line bg-red-soft px-[14px] py-[12px]"
              >
                <Icon
                  name="circleExclamation"
                  weight={900}
                  size={13}
                  className="text-red"
                />
                <div className="flex min-w-[190px] flex-1 flex-col gap-[3px]">
                  <span className="text-[13px] font-semibold text-red">
                    That time is no longer available
                  </span>
                  <span className="text-[12.5px] leading-[1.5] text-red-ink">
                    Someone booked it while you were filling this in. Nothing
                    has been scheduled.
                  </span>
                </div>
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => {
                    setBookingError(false);
                    setSelectedSlot(null);
                    // The picker now shows a refreshed list, so tell the guest
                    // why the slot they chose has gone.
                    setSlotTaken(true);
                    setStep("pick");
                  }}
                >
                  Pick another time
                </Button>
              </div>
            ) : null}

            <div className="flex flex-col gap-[14px]">
              <label className="flex flex-col gap-[6px]">
                <span className="text-[12.5px] font-semibold text-ink">
                  Full name
                </span>
                <Input
                  fieldSize="lg"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  invalid={nameInvalid}
                  placeholder="John Smith"
                  autoComplete="name"
                />
                {nameInvalid ? (
                  <FieldError>
                    {data.hostName.split(" ")[0]} needs to know who they are
                    meeting.
                  </FieldError>
                ) : null}
              </label>

              <label className="flex flex-col gap-[6px]">
                <span className="text-[12.5px] font-semibold text-ink">
                  Email address
                </span>
                <Input
                  fieldSize="lg"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  invalid={emailInvalid}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
                {emailInvalid ? (
                  <FieldError>
                    Enter an email we can send the confirmation to.
                  </FieldError>
                ) : (
                  <span className="text-[12px] text-ink-3">
                    The confirmation and Meet link go here.
                  </span>
                )}
              </label>

              <Field
                label={
                  <>
                    Note{" "}
                    <span className="font-normal text-ink-3">(optional)</span>
                  </>
                }
              >
                <Textarea
                  value={guestNote}
                  onChange={(e) => setGuestNote(e.target.value)}
                  placeholder={`Anything ${data.hostName.split(" ")[0]} should know beforehand?`}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-[10px]">
              <Button size="4xl" full loading={submitting} onClick={submit}>
                {submitting ? "Scheduling…" : "Schedule meeting"}
              </Button>
              <Button
                variant="ghost"
                size="xl"
                full
                onClick={() => setStep("pick")}
              >
                <Icon name="chevronLeft" size={10} />
                Back to times
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Pick a time ───────────────────────────────────────────────────────── */

  return (
    <div className="flex min-h-dvh items-start justify-center bg-ground p-[20px]">
      <div className="m-auto flex w-full max-w-[940px] flex-col gap-[14px]">
        <div className="flex items-center justify-between gap-[12px] px-[2px]">
          <Link href="/" title="Meetrao home" className="block no-underline">
            <Logo height={20} />
          </Link>
          <Eyebrow className="tracking-[0.07em]">Booking page</Eyebrow>
        </div>

        <div className="grid overflow-hidden rounded-[12px] border border-line bg-surface md:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-[15px] border-b border-line bg-fill p-[26px_22px] md:border-r md:border-b-0 md:p-[30px]">
            <div className="flex items-center gap-[11px]">
              {data.hostAvatarUrl ? (
                <Image
                  src={data.hostAvatarUrl}
                  alt=""
                  width={38}
                  height={38}
                  unoptimized
                  className="size-[38px] flex-none rounded-[8px] object-cover"
                />
              ) : (
                <Avatar
                  initials={data.hostName
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()}
                  size={38}
                />
              )}
              <div className="flex min-w-0 flex-col gap-[1px]">
                <span className="text-[13.5px] font-semibold text-ink">
                  {data.hostName}
                </span>
                {data.hostJobTitle ? (
                  <span className="text-[12px] text-ink-3">
                    {data.hostJobTitle}
                  </span>
                ) : null}
              </div>
            </div>

            <h1 className="m-0 font-serif text-[31px] leading-[1.08] font-normal tracking-[-0.01em] text-pretty text-ink">
              {data.meetingName}
            </h1>
            {data.meetingDescription ? (
              <p className="m-0 text-[13.5px] leading-[1.55] text-pretty text-ink-2">
                {data.meetingDescription}
              </p>
            ) : null}

            <div className="mt-auto flex flex-col gap-[10px] pt-[4px]">
              <div className="flex items-center gap-[10px]">
                <Icon name="clock" size={13} className="w-[15px] text-center text-ink-3" />
                <span className="text-[13px] text-ink">
                  {data.durationMinutes} minutes
                </span>
              </div>
              <div className="flex items-center gap-[10px]">
                <Icon name="video" size={13} className="w-[15px] text-center text-ink-3" />
                <span className="text-[13px] text-ink">Google Meet</span>
              </div>
              <div className="flex items-start gap-[10px]">
                <Icon name="globe" size={13} className="w-[15px] text-center text-ink-3" />
                <span className="text-[13px] leading-[1.45] text-ink-2">
                  Times shown in {timezoneLabel(guestTz)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-[18px] p-[24px_22px] md:p-[30px]">
            <div className="flex flex-col gap-[12px]">
              <div className="flex items-center justify-between gap-[12px]">
                <Eyebrow className="tracking-[0.07em] whitespace-nowrap">
                  Select a date
                </Eyebrow>
                <div className="flex items-center gap-[4px]">
                  <button
                    type="button"
                    title="Previous month"
                    aria-label="Previous month"
                    disabled={monthIndex === 0}
                    onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
                    className="inline-flex size-[28px] items-center justify-center rounded-[6px] border border-line bg-surface text-ink-2 hover:bg-fill disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon name="chevronLeft" size={10} />
                  </button>
                  <span className="min-w-[118px] text-center text-[13.5px] font-semibold text-ink">
                    {monthLabel(month)}
                  </span>
                  <button
                    type="button"
                    title="Next month"
                    aria-label="Next month"
                    disabled={monthIndex >= data.months.length - 1}
                    onClick={() =>
                      setMonthIndex((i) =>
                        Math.min(data.months.length - 1, i + 1),
                      )
                    }
                    className="inline-flex size-[28px] items-center justify-center rounded-[6px] border border-line bg-surface text-ink-2 hover:bg-fill disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon name="chevronRight" size={10} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-[5px]">
                {WEEK_LABELS.map((label) => (
                  <span
                    key={label}
                    className="pb-[2px] text-center font-mono text-[10px] tracking-[0.04em] uppercase text-ink-3"
                  >
                    {label}
                  </span>
                ))}

                {cells.map((cell) => (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={cell.state === "empty" || cell.state === "disabled"}
                    aria-label={
                      cell.dateKey
                        ? formatLongDate(
                            new Date(`${cell.dateKey}T12:00:00Z`),
                            "UTC",
                          )
                        : undefined
                    }
                    onClick={() => {
                      if (!cell.dateKey) return;
                      setSelectedKey(cell.dateKey);
                      setSelectedSlot(null);
                      setSlotTaken(false);
                    }}
                    className={cn(
                      "flex h-[38px] items-center justify-center rounded-[6px] text-[13px] font-medium",
                      "transition-[background-color,border-color] duration-[120ms]",
                      cell.state === "empty" &&
                        "pointer-events-none border border-transparent bg-transparent text-transparent",
                      cell.state === "disabled" &&
                        "cursor-not-allowed border border-transparent bg-transparent text-ink-3 opacity-45",
                      cell.state === "open" &&
                        "cursor-pointer border border-line bg-surface text-ink hover:border-line-strong hover:bg-fill",
                      cell.state === "today" &&
                        "cursor-pointer border border-accent bg-surface font-semibold text-accent hover:bg-fill",
                      cell.state === "selected" &&
                        "cursor-pointer border border-accent bg-accent font-semibold text-white hover:bg-accent-2",
                    )}
                  >
                    {cell.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-[14px] pt-[2px]">
                <span className="inline-flex items-center gap-[6px] text-[11.5px] text-ink-3">
                  <span className="size-[9px] rounded-[3px] border border-accent" />
                  Today
                </span>
                <span className="inline-flex items-center gap-[6px] text-[11.5px] text-ink-3">
                  <span className="size-[9px] rounded-[3px] bg-accent" />
                  Selected
                </span>
                <span className="inline-flex items-center gap-[6px] text-[11.5px] text-ink-3">
                  <span className="size-[9px] rounded-[3px] border border-line" />
                  Available
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-[11px] border-t border-line pt-[18px]">
              <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
                <Eyebrow className="tracking-[0.07em]">Available times</Eyebrow>
                <span className="text-[12.5px] text-ink-2">
                  {selectedDateLabel}
                </span>
              </div>

              {slotTaken ? (
                <div className="flex gap-[10px] rounded-[8px] border border-red-line bg-red-soft px-[13px] py-[11px]">
                  <Icon
                    name="circleExclamation"
                    weight={900}
                    size={12}
                    className="mt-[2px] text-red"
                  />
                  <span className="text-[12.5px] leading-[1.5] text-red-ink">
                    That time was just booked by someone else. The list below is
                    up to date.
                  </span>
                </div>
              ) : null}

              {loadingMonth ? (
                <div className="flex flex-col gap-[6px] rounded-[8px] border border-dashed border-line-strong px-[16px] py-[22px]">
                  <span className="text-[13.5px] font-semibold text-ink">
                    Loading times…
                  </span>
                </div>
              ) : slots.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-[6px]">
                  {slots.map((iso) => (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => {
                        setSelectedSlot(iso);
                        setTouched(false);
                        setBookingError(false);
                        setStep("details");
                      }}
                      className={cn(
                        "flex h-[38px] cursor-pointer items-center justify-center rounded-[6px] px-[10px] text-[13px] font-medium",
                        "transition-[background-color,border-color] duration-[120ms]",
                        selectedSlot === iso
                          ? "border border-accent bg-accent font-semibold text-white hover:bg-accent-2"
                          : "border border-line-strong bg-surface text-ink hover:border-accent hover:bg-fill",
                      )}
                    >
                      {new Intl.DateTimeFormat("en-US", {
                        timeZone: guestTz,
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(iso))}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-[6px] rounded-[8px] border border-dashed border-line-strong px-[16px] py-[22px]">
                  <span className="text-[13.5px] font-semibold text-ink">
                    No times on this day
                  </span>
                  <span className="text-[12.5px] text-ink-2">
                    {data.hostName.split(" ")[0]} is not taking bookings then.
                    Try another date.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
