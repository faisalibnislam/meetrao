"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/badge";
import { Field, Help, Input, Textarea } from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/icon";
import { MenuSelect } from "@/components/ui/menu-select";
import { Callout } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { addDays, dateKey, type PlainDate } from "@/lib/booking/slots";
import { formatLongDate, formatMonth, formatPlainLongDate, formatTime, formatTimeRange } from "@/lib/booking/time";
import { detectTimezone, timezoneLabel, timezoneOptions, type TimezoneOption } from "@/lib/timezones";
import { useClientValue } from "@/lib/use-client-value";
import { cx } from "@/lib/cx";
import type { BookingQuestion } from "@/lib/types";
import { MAX_GUESTS, cleanGuests, groupByDayPart, guestProblem, weeksBefore } from "./booking-helpers";

/* ─────────────────────────────────────────────────────────────────────────────
   The guest path: pick a date, pick a time, confirm details.

   This is the only surface that has to work for someone with no account, on a
   phone, from an email link, so it renders complete from the server and then
   corrects itself to the guest's real timezone once the browser can say what
   that is.

   `move` turns the same screen into the reschedule flow. The calendar, the
   timezone correction, the slot re-fetching and the taken-slot recovery are
   identical work; only the last step differs, because a guest moving a meeting
   has already told us who they are. A second copy of this picker would be a
   second place for a timezone bug to live.
   ───────────────────────────────────────────────────────────────────────────── */

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* The phone layout's breakpoint, the same 820px every `max-[820px]:` class in
   this file uses. Read in script only for the scroll below, which is the one
   behaviour CSS cannot express. */
const NARROW = "(max-width: 820px)";

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
  /** What this meeting asks, besides name, email and the note. */
  questions?: BookingQuestion[];
  /** How the meeting happens, and its detail: a number, an address, a note. */
  location?: string;
  locationDetail?: string;
  /** Above 1 makes each time a seat several guests can take. */
  capacity?: number;
  /** Seats already taken, keyed by the slot's ISO instant. */
  seats?: Record<string, number>;
  pageViewId: string | null;
  /** Present when this is an existing booking being moved, not a new one. */
  move?: { reference: string; currentStart: string };
  /** Present when the link belongs to a TEAM, and the host is decided by the
      rotation at booking time rather than being known now. */
  teamSlug?: string;
};

type SlotState = { openDates: Set<string>; times: string[] };

export function BookingFlow(props: FlowProps) {
  const router = useRouter();
  const toast = useToast();

  // The server rendered in the host's zone because it cannot know the guest's.
  // This reads the real one on the first client render, with no flash and no
  // hydration mismatch.
  const detected = useClientValue(detectTimezone, props.initial.timezone);
  /* The zone the guest chose from the picker, when they chose one. Kept apart
     from `detected` rather than copied into one state: the detected zone only
     exists after hydration, and seeding state from it would either mismatch
     the server render or need an effect to correct itself. Null means "follow
     the device", which is what almost every guest wants. */
  const [picked, setPicked] = useState<string | null>(null);
  const timezone = picked ?? detected;
  const [year, setYear] = useState(props.initial.year);
  const [month, setMonth] = useState(props.initial.month);
  const [selected, setSelected] = useState<PlainDate | null>(
    props.initial.day ? { year: props.initial.year, month: props.initial.month, day: props.initial.day } : null,
  );
  const [seats, setSeats] = useState<Record<string, number>>(props.seats ?? {});
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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  /* Extra people to invite. Empty until the guest asks for the field, so the
     form a guest who books alone sees is the form it always was. */
  const [guests, setGuests] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(false);

  const ticket = useRef(0);
  const timesRef = useRef<HTMLDivElement>(null);

  /* The app's own list, the one the host picked their zone from, so a guest
     and a host describe a zone in the same words. A device zone outside the
     list (there are about 400 IANA names, the list carries 94) is added at
     the top rather than snapped to a neighbour: the guest's own clock is the
     one choice that is certainly right, and it must stay selectable after
     they try another. */
  const zoneOptions = useMemo<TimezoneOption[]>(() => {
    const list = timezoneOptions();
    for (const zone of [detected, timezone]) {
      if (!list.some((o) => o.value === zone)) list.unshift({ value: zone, label: timezoneLabel(zone) });
    }
    return list;
  }, [detected, timezone]);

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
        if (props.teamSlug) params.set("team", props.teamSlug);
        if (day) params.set("day", String(day));

        const response = await fetch(`/api/slots?${params}`, { cache: "no-store" });
        if (!response.ok) throw new Error("slots");
        const json = (await response.json()) as {
          openDates: string[];
          times: string[];
          seats?: Record<string, number>;
        };
        if (mine !== ticket.current) return;
        setSlotState({ openDates: new Set(json.openDates), times: json.times });
        if (json.seats) setSeats(json.seats);
      } catch {
        if (mine === ticket.current) setSlotState({ openDates: new Set(), times: [] });
      } finally {
        if (mine === ticket.current) setLoading(false);
      }
    },
    [props.username, props.slug, props.teamSlug],
  );

  // Slots were computed in the host's zone; re-fetch them in the guest's the
  // moment we know it differs. This is a subscription to an external system,
  // the loading flag it raises is the fetch starting, not a derived value.
  // Keyed on the DETECTED zone only: a zone the guest picks is loaded by
  // pickZone with the month and day they are looking at, not the first
  // paint's.
  useEffect(() => {
    if (picked !== null || detected === props.initial.timezone) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(props.initial.year, props.initial.month, props.initial.day, detected);
    // Only ever runs for the first paint's values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detected]);

  const monthCells = buildMonth(year, month);
  const pastWeeks = weeksBefore(monthCells, year, month, todayIn(timezone));
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

    /* On a phone the times sit under a full-height calendar, so picking a day
       changed something the guest cannot see. Bring the list up to them. The
       section is always rendered (it holds the "pick a date" hint before a
       day is chosen) so there is something to scroll to before the times
       arrive; the skeleton fills it while they load. Instant for anyone who
       has asked their device for less motion. */
    if (typeof window !== "undefined" && window.matchMedia(NARROW).matches) {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() => {
        timesRef.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
      });
    }
  }

  /**
   * The guest choosing another zone.
   *
   * Same month, same day number, re-asked in the new zone: "the 19th" is a
   * calendar date, and a calendar date belongs to a zone, so the 19th in
   * Tokyo is a different set of instants from the 19th in Dhaka and has to
   * come from the server again rather than being re-labelled here. A time
   * already chosen is dropped for the same reason: it is still a real
   * instant, but it may now sit on another day than the one highlighted.
   *
   * Only the DISPLAY changes. Every slot is an absolute ISO instant, and that
   * instant is what /api/bookings receives, so the booking is the same meeting
   * whichever zone it was picked in. The zone travels with it only so the
   * guest's emails are written in the zone they read the page in.
   */
  function pickZone(zone: string) {
    if (zone === timezone) return;
    setPicked(zone === detected ? null : zone);
    setChosen(null);
    setSlotTaken(false);
    void load(year, month, selected?.day ?? null, zone);
  }

  async function move() {
    const target = props.move;
    if (!chosen || !target) return;

    setSubmitting(true);
    setBookingError(false);

    try {
      const response = await fetch("/api/bookings/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: target.reference, start: chosen, guestTimezone: timezone }),
      });

      if (response.status === 409) {
        setBookingError(true);
        setSubmitting(false);
        toast({ tone: "bad", title: "Could not move", text: "That time went while you were deciding." });
        return;
      }

      const json = (await response.json()) as { reference?: string; error?: string };
      if (!response.ok || !json.reference) {
        setSubmitting(false);
        toast({ tone: "bad", title: "Could not move", text: json.error ?? "Try again in a moment." });
        return;
      }

      // The confirmation screen reads the new time, and says so on arrival.
      router.push(`/booking/${json.reference}?moved=1`);
    } catch {
      setSubmitting(false);
      toast({ tone: "bad", title: "Could not move", text: "Check your connection and try again." });
    }
  }

  async function submit() {
    if (!chosen) return;
    const missing = (props.questions ?? []).filter((q) => q.required && !(answers[q.id] ?? "").trim());
    const extra = cleanGuests(guests);
    const badGuest = guests.some((g) => guestProblem(g, guestEmail) !== null);
    if (!guestName.trim() || !guestEmail.includes("@") || missing.length || badGuest) {
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
          team: props.teamSlug,
          username: props.username,
          slug: props.slug,
          start: chosen,
          guestName,
          guestEmail,
          guestNote,
          answers: (props.questions ?? []).map((q) => ({ id: q.id, value: answers[q.id] ?? "" })),
          guestTimezone: timezone,
          pageViewId: props.pageViewId ?? undefined,
          guests: extra.length ? extra : undefined,
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

  /* Before a booking exists there is no Meet link to name, so this reads as
     the KIND ("Google Meet") and the confirmation carries the actual link. */
  const locationLine =
    props.location === "phone"
      ? props.locationDetail
        ? `Phone: ${props.locationDetail}`
        : "Phone call"
      : props.location === "in_person"
        ? props.locationDetail || "In person"
        : props.location === "custom"
          ? props.locationDetail || "Details to follow"
          : "Google Meet";
  const locationIcon: IconName =
    props.location === "in_person" ? "globe" : props.location === "phone" ? "user" : "video";

  const capacity = props.capacity ?? 1;
  /* A group meeting is one seat per booking, counted against capacity, so a
     seat cannot bring five more people. The mutation refuses it too. */
  const canAddGuests = capacity <= 1;

  const chosenStart = chosen ? new Date(chosen) : null;
  const chosenEnd = chosenStart ? new Date(chosenStart.getTime() + props.durationMinutes * 60_000) : null;

  if (step === "details" && chosenStart && chosenEnd && selected && props.move) {
    const was = new Date(props.move.currentStart);
    return (
      <div className="m-auto flex w-full max-w-[520px] flex-col gap-[14px]">
        <div className="flex flex-col gap-[22px] rounded-[12px] border border-line bg-surface p-[30px] max-[820px]:p-[22px]">
          <div className="flex flex-col gap-[8px]">
            <h1 className="m-0 font-serif text-[28px] leading-[1.1] font-normal tracking-[-0.01em] text-ink">
              Move this meeting?
            </h1>
            <p className="m-0 text-[13.5px] leading-[1.55] text-ink-2">
              {firstName(props.hostName)} is told, both calendars are updated, and your Google Meet link stays
              the same.
            </p>
          </div>

          <div className="flex flex-col gap-[10px] rounded-[8px] border border-line bg-fill px-[14px] py-[13px]">
            <span className="text-[13.5px] font-semibold text-ink">
              {props.meetingName} · {props.durationMinutes} min
            </span>
            <div className="flex flex-col gap-[3px]">
              <Eyebrow size={10}>Was</Eyebrow>
              <span className="text-[12.5px] text-ink-3 line-through">
                {formatLongDate(was, timezone)} · {formatTime(was, timezone)}
              </span>
            </div>
            <div className="flex flex-col gap-[3px]">
              <Eyebrow size={10}>Now</Eyebrow>
              <span className="text-[13px] font-semibold text-ink">
                {formatPlainLongDate(selected, timezone)} · {formatTimeRange(chosenStart, chosenEnd, timezone)}
              </span>
            </div>
            <span className="text-[12px] text-ink-3">Times in {timezoneLabel(timezone)}</span>
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
                    setSlotTaken(true);
                    void load(selected.year, selected.month, selected.day, timezone);
                  }}
                >
                  Pick another time
                </Button>
              }
            >
              Someone booked it while you were deciding. Your meeting has not moved.
            </Callout>
          ) : null}

          <div className="flex flex-col gap-[10px]">
            <Button variant="accent" size={42} full busy={submitting} onClick={move}>
              {submitting ? "Moving…" : "Move meeting"}
            </Button>
            <Button
              variant="secondary"
              size={38}
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

  if (step === "details" && chosenStart && chosenEnd && selected) {
    const extra = cleanGuests(guests);
    return (
      <div className="m-auto flex w-full max-w-[520px] flex-col gap-[14px]">
        <div className="flex flex-col gap-[22px] rounded-[12px] border border-line bg-surface p-[30px] max-[820px]:p-[22px]">
          <div className="flex flex-col gap-[8px]">
            <h1 className="m-0 font-serif text-[28px] leading-[1.1] font-normal tracking-[-0.01em] text-ink">
              Confirm your details
            </h1>
            {/* Everything the guest is agreeing to, on the one screen where
                they agree to it. The page they came from carried the host,
                the place and the zone in its left column; this step replaces
                that page, so without them here a guest confirms a time
                without being shown whose meeting it is, where it happens, or
                which clock "9:00" was read on. */}
            <div className="flex flex-col gap-[11px] rounded-[8px] border border-line bg-fill px-[14px] py-[13px]">
              <div className="flex items-center gap-[10px]">
                <HostAvatar name={props.hostName} url={props.hostAvatarUrl} size={30} />
                <div className="flex min-w-0 flex-col gap-[1px]">
                  <span className="text-[13.5px] font-semibold text-ink">
                    {props.meetingName} · {props.durationMinutes} min
                  </span>
                  <span className="text-[12.5px] text-ink-2">with {props.hostName}</span>
                </div>
              </div>
              <div className="flex flex-col gap-[6px] border-t border-line pt-[10px]">
                <SummaryLine icon="calendar">
                  <span className="font-semibold text-ink">
                    {formatPlainLongDate(selected, timezone)} · {formatTimeRange(chosenStart, chosenEnd, timezone)}
                  </span>
                </SummaryLine>
                <SummaryLine icon="globe">{timezoneLabel(timezone)}</SummaryLine>
                <SummaryLine icon={locationIcon}>{locationLine}</SummaryLine>
              </div>
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

            {canAddGuests ? (
              <GuestsField
                guests={guests}
                onChange={setGuests}
                ownEmail={guestEmail}
                touched={touched}
              />
            ) : null}

            {(props.questions ?? []).map((q) => {
              const value = answers[q.id] ?? "";
              const missing = touched && q.required && !value.trim();
              return (
                <Field
                  key={q.id}
                  label={
                    q.required ? (
                      q.label
                    ) : (
                      <>
                        {q.label} <span className="font-normal text-ink-3">(optional)</span>
                      </>
                    )
                  }
                  htmlFor={`q-${q.id}`}
                  error={missing ? "This one is needed before you can book." : undefined}
                >
                  {q.kind === "long" ? (
                    <Textarea
                      id={`q-${q.id}`}
                      rows={3}
                      value={value}
                      invalid={missing}
                      maxLength={2000}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      id={`q-${q.id}`}
                      height={38}
                      value={value}
                      invalid={missing}
                      maxLength={2000}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    />
                  )}
                </Field>
              );
            })}

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
            {/* Said where the guest decides, not only in a policy they will
                not open: who receives what they typed, and what it is for.
                A new tab, because following it from here would otherwise
                throw away the form they just filled in. */}
            <Help className="text-center">
              Your name and email{extra.length ? ", and your guests' emails," : ""} go to{" "}
              {props.teamSlug ? props.hostName : firstName(props.hostName)} and are used for this booking&apos;s
              emails.{" "}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-ink-2">
                Privacy policy
              </Link>
            </Help>
            <Button
              variant="secondary"
              size={38}
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
            <HostAvatar name={props.hostName} url={props.hostAvatarUrl} size={38} />
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

          {/* Straight under the title, not pinned to the column's foot. This
              used to be `mt-auto`, which on a desktop pushed the facts a guest
              reads first (how long, where, in which zone) to the bottom of a
              column as tall as the calendar beside it, with an empty gap
              between them and the meeting they describe. */}
          <div className="flex flex-col gap-[10px] pt-[4px]">
            <div className="flex items-center gap-[10px]">
              <Icon name="clock" size={13} className="w-[15px] flex-none text-ink-3" />
              <span className="text-[13px] text-ink">{props.durationMinutes} minutes</span>
            </div>
            {capacity > 1 ? (
              <div className="flex items-center gap-[10px]">
                <Icon name="users" size={13} className="w-[15px] flex-none text-ink-3" />
                <span className="text-[13px] text-ink">Up to {capacity} guests together</span>
              </div>
            ) : null}
            <div className="flex items-start gap-[10px]">
              <Icon name={locationIcon} size={13} className="mt-[1px] w-[15px] flex-none text-ink-3" />
              <span className="text-[13px] leading-[1.45] text-ink">{locationLine}</span>
            </div>

            {/* A control, not a sentence. Detection is right for nearly
                everyone, but not for a guest booking from a work laptop set
                to head office, or planning a call for a trip, and "Times
                shown in GMT+06:00 Dhaka" with no way to change it left them
                doing the arithmetic in their head. */}
            <div className="flex flex-col gap-[6px] pt-[2px]">
              <span id="booking-tz-label" className="flex items-center gap-[10px] text-[12.5px] text-ink-2">
                <Icon name="globe" size={13} className="w-[15px] flex-none text-ink-3" />
                Times shown in
              </span>
              <MenuSelect
                size="sm"
                options={zoneOptions}
                value={timezone}
                onChange={pickZone}
                aria-labelledby="booking-tz-label"
                className="max-w-[300px]"
              />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px] p-[30px] max-[820px]:px-[22px] max-[820px]:py-[24px]">
          <div className="flex flex-col gap-[12px]">
            {/* Wraps rather than overflows: at 320px the eyebrow plus the
                month stepper is 9px wider than the card, and the "next month"
                arrow was the part that fell off. */}
            <div className="flex flex-wrap items-center justify-between gap-x-[12px] gap-y-[8px]">
              <Eyebrow size={10.5} className="whitespace-nowrap">
                Select a date
              </Eyebrow>
              <div className="flex items-center gap-[4px] max-[380px]:ml-auto">
                <MonthButton dir="prev" disabled={!canGoBack} onClick={() => goMonth(-1)} />
                <span className="min-w-[118px] text-center text-[13.5px] font-semibold text-ink max-[380px]:min-w-[96px]">
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
                /* Phones only: a week that is wholly behind us in this month
                   is a row of greyed-out numbers nobody can press, and it
                   pushes the times further down a screen that is already
                   short. Hidden by class rather than left out of the array so
                   the grid stays one 7-wide flow and every row keeps its
                   weekday columns. Desktop keeps the whole month, where the
                   familiar shape costs nothing. */
                const pastWeek = pastWeeks.has(Math.floor(i / 7));
                if (cell === null) {
                  return (
                    <span key={`e${i}`} aria-hidden="true" className={cx(pastWeek && "max-[820px]:hidden")} />
                  );
                }
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
                      pastWeek && "max-[820px]:hidden",
                      "flex h-[38px] items-center justify-center rounded-[6px] border font-sans text-[13px] font-medium",
                      "transition-[background-color,border-color] duration-[120ms]",
                      !open && "cursor-not-allowed border-transparent bg-transparent text-ink-3 opacity-45",
                      open && !isSelected && !isToday && "cursor-pointer border-line bg-surface text-ink hover:border-line-strong hover:bg-fill",
                      open && isToday && !isSelected && "cursor-pointer border-accent bg-surface font-semibold text-accent-ink",
                      isSelected && "cursor-pointer border-accent bg-accent font-semibold text-on-accent hover:bg-accent-2",
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

          {/* scroll-mt so the scroll in pickDate leaves a little air above the
              heading instead of pinning it to the very top edge. */}
          <div ref={timesRef} className="flex scroll-mt-[12px] flex-col gap-[11px] border-t border-line pt-[18px]">
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
              /* Grouped by the hour IN THE ZONE ON SCREEN, so "Morning" means
                 the guest's morning. A long day used to be one undivided wall
                 of thirty-odd buttons; three labelled runs let a guest go
                 straight to the part of the day they want. Empty groups are
                 left out rather than headed with nothing under them. */
              <div className="flex flex-col gap-[14px]">
                {groupByDayPart(slotState.times, timezone).map((group) => (
                  <section key={group.part} aria-label={`${group.part} times`} className="flex flex-col gap-[7px]">
                    <span className="text-[11.5px] font-semibold text-ink-3">{group.part}</span>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-[6px]">
                      {group.times.map((iso) => {
                        const isChosen = chosen === iso;
                        const left = capacity > 1 ? capacity - (seats[iso] ?? 0) : null;
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
                              "flex items-center justify-center rounded-[6px] border px-[10px] font-sans text-[13px] font-medium",
                              left === null ? "h-[38px]" : "h-[44px] flex-col gap-[1px]",
                              "cursor-pointer transition-[background-color,border-color] duration-[120ms]",
                              isChosen
                                ? "border-accent bg-accent font-semibold text-on-accent hover:bg-accent-2"
                                : "border-line-strong bg-surface text-ink hover:border-accent hover:bg-fill",
                            )}
                          >
                            {formatTime(new Date(iso), timezone)}
                            {/* Only when it is nearly gone. "6 seats left" on an
                                empty workshop is noise; "1 seat left" is the reason
                                somebody books now. */}
                            {left !== null && left <= 3 ? (
                              <span
                                className={cx("text-[10.5px] font-medium", isChosen ? "text-on-accent/80" : "text-ink-3")}
                              >
                                {left} left
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
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
        "tap-square inline-flex h-[28px] w-[28px] items-center justify-center rounded-[6px] border border-line bg-surface text-ink-2",
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

/** The host's photo, or their initials on the accent tint. */
function HostAvatar({ name, url, size }: { name: string; url?: string | null; size: 30 | 38 }) {
  const box = size === 38 ? "h-[38px] w-[38px] text-[13px]" : "h-[30px] w-[30px] text-[11.5px]";
  if (url) {
    return (
      // Plain <img>, as everywhere avatars appear: a Convex storage URL that
      // changes on every re-upload, at a size the optimiser has nothing to save.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        className={cx(box, "flex-none rounded-[8px] object-cover")}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cx(box, "inline-flex flex-none items-center justify-center rounded-[8px] bg-accent-soft font-bold text-accent-ink")}
    >
      {initials(name)}
    </span>
  );
}

function SummaryLine({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span className="flex items-start gap-[9px] text-[12.5px] leading-[1.45] text-ink-2">
      <Icon name={icon} size={12} className="mt-[2px] w-[14px] flex-none text-ink-3" />
      <span className="min-w-0">{children}</span>
    </span>
  );
}

/**
 * "Add guests": up to five more addresses that get the same invitation.
 *
 * Collapsed to one button until asked for. Most bookings are one person, and
 * five empty inputs would make every one of them look like a longer form.
 * Removing the last row folds it back to the button, so a guest who opened
 * it by mistake is not left with an empty field the form then complains
 * about.
 */
function GuestsField({
  guests,
  onChange,
  ownEmail,
  touched,
}: {
  guests: string[];
  onChange: (next: string[]) => void;
  ownEmail: string;
  touched: boolean;
}) {
  if (guests.length === 0) {
    return (
      <div className="flex">
        <Button variant="secondary" size={32} icon="user-plus" onClick={() => onChange([""])}>
          Add guests
        </Button>
      </div>
    );
  }

  return (
    <Field
      label={
        <>
          Guests <span className="font-normal text-ink-3">(optional)</span>
        </>
      }
      htmlFor="guest-extra-0"
      help={
        guests.length >= MAX_GUESTS
          ? `${MAX_GUESTS} guests is the most one booking can invite.`
          : "Each one gets the confirmation and the calendar invitation."
      }
    >
      <div className="flex flex-col gap-[8px]">
        {guests.map((value, i) => {
          const problem = touched ? guestProblem(value, ownEmail) : null;
          return (
            <div key={i} className="flex flex-col gap-[5px]">
              <div className="flex items-center gap-[6px]">
                <Input
                  id={`guest-extra-${i}`}
                  type="email"
                  height={38}
                  placeholder="colleague@company.com"
                  aria-label={`Guest ${i + 1} email`}
                  value={value}
                  invalid={problem !== null}
                  autoComplete="off"
                  maxLength={254}
                  onChange={(e) => onChange(guests.map((g, j) => (j === i ? e.target.value : g)))}
                />
                <button
                  type="button"
                  aria-label={`Remove guest ${i + 1}`}
                  title="Remove"
                  onClick={() => onChange(guests.filter((_, j) => j !== i))}
                  className="tap-square inline-flex h-[38px] w-[38px] flex-none cursor-pointer items-center justify-center rounded-[6px] border border-line bg-surface text-ink-3 hover:bg-fill hover:text-ink"
                >
                  <Icon name="xmark" size={11} />
                </button>
              </div>
              {problem ? (
                <span className="flex items-center gap-[6px] text-[12px] text-red">
                  <Icon name="triangle-exclamation" weight="solid" size={10} />
                  {problem}
                </span>
              ) : null}
            </div>
          );
        })}
        {guests.length < MAX_GUESTS ? (
          <div className="flex">
            <Button variant="ghost" size={30} icon="plus" iconSize={10} onClick={() => onChange([...guests, ""])}>
              Add another
            </Button>
          </div>
        ) : null}
      </div>
    </Field>
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
