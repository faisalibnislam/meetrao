"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ChoiceChip, Field, Input, Switch, Textarea } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { GoogleG } from "@/components/ui/logo";
import { MenuSelect } from "@/components/ui/menu-select";
import { Modal } from "@/components/ui/modal";
import { Callout, PanelHeading } from "@/components/ui/panels";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { deleteMeeting, saveMeeting, type MeetingInput } from "@/lib/actions/meetings";
import type { BookingQuestion } from "@/lib/types";
import { LOCATION_OPTIONS } from "@/lib/locations";
import { slugify } from "@/lib/username";
import { cx } from "@/lib/cx";
import {
  clashMessage,
  normaliseSlug,
  sanitiseSlugInput,
  slugClash,
  slugProblem,
  uniqueSlug,
  type SlugHolder,
} from "@/convex/lib/meetingSlugs";

const DURATIONS = [15, 30, 45, 60];

/* The custom length's bounds, the same 5 to 480 whole minutes the action and
   Convex enforce. Step 5 only shapes the spinner; a typed 25 or 50 is fine. */
const MIN_DURATION = 5;
const MAX_DURATION = 480;

const BUFFERS = [
  { value: "0", label: "None" },
  { value: "5", label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "15", label: "15 minutes" },
];

const NOTICES = [
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
  { value: "240", label: "4 hours" },
  { value: "720", label: "12 hours" },
  { value: "1440", label: "24 hours" },
];

const WINDOWS = [
  { value: "7", label: "7 days ahead" },
  { value: "14", label: "14 days ahead" },
  { value: "30", label: "30 days ahead" },
  { value: "60", label: "60 days ahead" },
];

/** The host's named schedules, plus the "Default" entry that means null. */
export type ScheduleOption = { value: string; label: string };

/** Five, matching the cap the action and Convex both enforce. */
const MAX_QUESTIONS = 5;

const LEAVE_PROMPT = "You have unsaved changes to this meeting. Leave without saving?";

/** Whether a slug looks generated from this name: itself, or itself-2, -3... */
function derivedFrom(slug: string, name: string): boolean {
  const base = slugify(name);
  if (slug === base) return true;
  return slug.startsWith(`${base}-`) && /^\d+$/.test(slug.slice(base.length + 1));
}

export function MeetingForm({
  initial,
  schedules = [],
  pro = false,
  linkPrefix,
  siblings = [],
  google = { connected: true, needsReconnect: false },
  previewHref = null,
}: {
  initial: MeetingInput;
  schedules?: ScheduleOption[];
  /** Group sessions are Pro; the server enforces it either way. */
  pro?: boolean;
  /**
   * Everything in the meeting's address before its slug, as guests see it:
   * "meetrao.com/faisal/" for a personal meeting, the company's address for
   * a company's. Shown in front of the Link field so the host edits the part
   * that is theirs to edit and can see the rest.
   */
  linkPrefix: string;
  /**
   * Every meeting the host has, with their current and old links, so the
   * Link field can say "taken" before Save rather than after it. Convex
   * checks again; this is the courtesy, not the rule.
   */
  siblings?: SlugHolder[];
  /**
   * The host's Google Calendar connection. A Meet link is minted through it,
   * so a Google Meet meeting without one is booked with no link at all.
   */
  google?: { connected: boolean; needsReconnect: boolean };
  /** The saved meeting's public page, for the Preview link. Null when new. */
  previewHref?: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState(false);
  const [saving, startSave] = useTransition();

  const set = <K extends keyof MeetingInput>(key: K, value: MeetingInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const questions = form.questions ?? [];
  const locationKind = form.location ?? "google_meet";
  const capacity = form.capacity ?? 1;
  const capacityInvalid = touched && capacity > 1 && (!Number.isInteger(capacity) || capacity < 2 || capacity > 100);

  function addQuestion() {
    // crypto.randomUUID is the id an answer is matched back by, so it has to
    // outlive any edit to the label.
    const next: BookingQuestion = {
      id: crypto.randomUUID(),
      label: "",
      kind: "short",
      required: false,
    };
    set("questions", [...questions, next]);
  }

  function editQuestion(id: string, patch: Partial<BookingQuestion>) {
    set(
      "questions",
      questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    );
  }

  function setQuestions(next: BookingQuestion[]) {
    set("questions", next);
  }

  const nameInvalid = touched && !form.name.trim();
  const editing = Boolean(initial.id);
  /* Deleting lives here rather than on the list. Four text actions in a row
     pushed that column past the viewport, and this is where the rest of the
     destructive-ish settings for one meeting already are. */
  const [confirming, setConfirming] = useState(false);
  const [removing, startRemove] = useTransition();

  /* ── the link ───────────────────────────────────────────────────────────
     A NEW meeting's link follows its name until the host types in the Link
     field: nothing has been shared yet, so there is nothing to break, and a
     slug that silently stayed "meeting" while the name became "Intro call"
     is the defect this field exists to fix.

     AN EXISTING meeting's link never moves on its own. Its address is in
     signatures and calendars, so a rename only OFFERS the new slug, inline,
     and the host decides. Even then the old link keeps working: Convex
     remembers it and the public page redirects (convex/lib/meetingSlugs.ts). */
  const [slugTouched, setSlugTouched] = useState(false);
  const [declined, setDeclined] = useState<string | null>(null);
  const selfId = initial.id ?? null;
  const fromName = form.name.trim() ? uniqueSlug(slugify(form.name), siblings, selfId) : "";
  const slug = editing || slugTouched ? (form.slug ?? "") : fromName;
  const slugError = (() => {
    if (!editing && !slugTouched && !slug) return null; // nothing typed yet
    const shape = slugProblem(slug);
    if (shape) return shape;
    const clash = slugClash(slug, siblings, selfId);
    return clash ? clashMessage(clash) : null;
  })();
  const slugMoved = editing && normaliseSlug(slug) !== (initial.slug ?? "");

  /* The offer. Only after the NAME has changed in this visit, and only when
     the link is still the one it was (untouched, or still derived from the
     old name), so a host who deliberately chose /book-me is not nagged
     about it every time they fix a typo. "Keep" silences it for that one
     suggestion; typing a different name brings a fresh one. */
  const offer =
    editing &&
    fromName &&
    form.name.trim() !== initial.name.trim() &&
    fromName !== normaliseSlug(slug) &&
    fromName !== declined &&
    (!slugTouched || (slug === initial.slug && derivedFrom(initial.slug ?? "", initial.name)))
      ? fromName
      : null;

  function editSlug(raw: string) {
    setSlugTouched(true);
    set("slug", sanitiseSlugInput(raw));
  }

  /* ── duration ───────────────────────────────────────────────────────────
     The four presets cover most meetings and stay one tap. "Custom" opens a
     minutes field for the rest: a 20-minute check-in, a 90-minute workshop.
     A meeting saved at a non-preset length opens with Custom already on, or
     the chips would show nothing selected and look broken. */
  const [customDuration, setCustomDuration] = useState(!DURATIONS.includes(initial.duration));
  const [durationText, setDurationText] = useState(String(initial.duration));
  const durationInvalid =
    customDuration &&
    (!Number.isInteger(form.duration) || form.duration < MIN_DURATION || form.duration > MAX_DURATION);

  /* ── unsaved changes ────────────────────────────────────────────────────
     The form is long enough that leaving it by accident is easy: a sidebar
     link, the breadcrumb, a closed tab. Compared as data rather than tracked
     per keystroke, so typing something and deleting it again is not
     "unsaved". The new meeting's derived slug is not compared: it follows the
     name, which is compared already. */
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
  /* Set just before this screen navigates away on purpose (after a save, or a
     confirmed Cancel) so the guard does not ask about a departure the host
     already chose. */
  const leaving = useRef(false);

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (leaving.current) return;
      e.preventDefault();
      // Older engines show the prompt only when returnValue is set.
      e.returnValue = "";
    };

    /* IN-APP LINKS. The App Router has no "before navigate" event, and
       beforeunload never fires for a client-side transition, so a click on
       any same-site link is caught here first. Capture phase on the document
       runs before React's own listener on the root, which is where <Link>
       starts its navigation; stopping the event there stops the transition.
       New-tab clicks, downloads and in-page anchors are left alone, since
       none of them leaves this form. */
    const onClick = (e: MouseEvent) => {
      if (leaving.current || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const to = new URL(anchor.href, window.location.href);
      const here = window.location;
      if (to.origin === here.origin && to.pathname === here.pathname && to.search === here.search) return;
      if (window.confirm(LEAVE_PROMPT)) {
        leaving.current = true;
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  function cancel() {
    if (dirty && !window.confirm(LEAVE_PROMPT)) return;
    leaving.current = true;
    router.push("/meetings");
  }

  /* Back here after connecting, which is the screen the host was on. */
  const returnTo = editing ? `/meetings/${initial.id}/edit` : "/meetings/new";
  const googleMissing = !google.connected || google.needsReconnect;

  return (
    <div className="flex w-full max-w-[600px] flex-col">
      <section className="flex flex-col gap-[14px] border-b border-line pb-[20px]">
        <PanelHeading title="Meeting details" subtitle="What guests see when they open your booking link." />

        <Field
          label="Name"
          htmlFor="meeting-name"
          error={nameInvalid ? "Give the meeting a name guests will recognise." : undefined}
        >
          <Input
            id="meeting-name"
            height={36}
            value={form.name}
            invalid={nameInvalid}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>

        <div className="flex min-w-0 flex-col gap-[6px]">
          <label htmlFor="meeting-slug" className="text-[12.5px] font-semibold text-ink">
            Link
          </label>
          {/* The prefix is part of the address, shown, not typed: the host's
              username or the company's address is set elsewhere and changing
              it here would be a surprise for every other meeting. It may be
              long on a company, so it gives way first and keeps a title. */}
          <div
            className={cx(
              "box-border flex h-[36px] w-full min-w-0 items-center rounded-[6px] border bg-surface",
              "transition-[border-color,box-shadow] duration-[120ms] focus-within:border-accent focus-within:shadow-[var(--ring)]",
              slugError ? "border-red" : "border-line-strong",
            )}
          >
            <span
              aria-hidden="true"
              title={linkPrefix}
              className="max-w-[60%] flex-none overflow-hidden pl-[12px] text-[13px] text-ellipsis whitespace-nowrap text-ink-3"
            >
              {linkPrefix}
            </span>
            <input
              id="meeting-slug"
              type="text"
              value={slug}
              placeholder="intro-call"
              onChange={(e) => editSlug(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="none"
              maxLength={80}
              aria-invalid={slugError ? true : undefined}
              aria-describedby="meeting-slug-note"
              className="h-full min-w-0 flex-1 border-0 bg-transparent py-0 pr-[12px] pl-[1px] font-sans text-[13.5px] font-medium text-ink outline-none"
            />
          </div>
          <div id="meeting-slug-note" className="flex flex-col gap-[6px]">
            {slugError ? (
              <span className="text-[12px] leading-[1.5] text-red">{slugError}</span>
            ) : slugMoved ? (
              <span className="text-[12px] leading-[1.5] text-ink-3">
                The old link, {linkPrefix}
                {initial.slug}, will keep working and send guests here.
              </span>
            ) : !editing && !slugTouched ? (
              <span className="text-[12px] leading-[1.5] text-ink-3">Made from the name. Edit it if you like.</span>
            ) : null}
            {offer ? (
              <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[4px] text-[12px] leading-[1.5] text-ink-2">
                <span>The link still reflects the old name.</span>
                <button
                  type="button"
                  onClick={() => {
                    setSlugTouched(true);
                    set("slug", offer);
                  }}
                  className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[12px] font-semibold text-accent-ink underline underline-offset-2"
                >
                  Update link to /{offer}
                </button>
                <button
                  type="button"
                  onClick={() => setDeclined(offer)}
                  className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[12px] font-medium text-ink-3 hover:text-ink"
                >
                  Keep current link
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <Field label="Description" htmlFor="meeting-description">
          <Textarea
            id="meeting-description"
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-[7px]">
          <span className="text-[12.5px] font-semibold text-ink">Duration</span>
          <div className="flex flex-wrap gap-[6px]">
            {DURATIONS.map((d) => (
              <ChoiceChip
                key={d}
                selected={!customDuration && form.duration === d}
                onClick={() => {
                  setCustomDuration(false);
                  setDurationText(String(d));
                  set("duration", d);
                }}
              >
                {d} min
              </ChoiceChip>
            ))}
            <ChoiceChip selected={customDuration} onClick={() => setCustomDuration(true)}>
              Custom
            </ChoiceChip>
          </div>
          {customDuration ? (
            <Field
              htmlFor="meeting-duration"
              error={durationInvalid ? `Between ${MIN_DURATION} and ${MAX_DURATION} whole minutes.` : undefined}
            >
              <div className="flex items-center gap-[8px]">
                <Input
                  id="meeting-duration"
                  aria-label="Duration in minutes"
                  type="number"
                  inputMode="numeric"
                  min={MIN_DURATION}
                  max={MAX_DURATION}
                  step={5}
                  height={36}
                  className="max-w-[110px]"
                  value={durationText}
                  invalid={durationInvalid}
                  onChange={(e) => {
                    setDurationText(e.target.value);
                    set("duration", e.target.value === "" ? NaN : Number(e.target.value));
                  }}
                />
                <span className="text-[13px] text-ink-2">minutes</span>
              </div>
            </Field>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-[11px] border-b border-line py-[20px]">
        <PanelHeading title="Location" subtitle="Where this one happens. Guests are told on the booking page." />

        <div className="flex flex-wrap gap-[8px]">
          {/* The shared chip, as Duration and Seats above and below use. This
              was a local copy with a pale selected state, so one form showed
              two different looks for the same "this one is chosen". */}
          {LOCATION_OPTIONS.map((o) => (
            <ChoiceChip key={o.value} selected={locationKind === o.value} onClick={() => set("location", o.value)}>
              {o.label}
            </ChoiceChip>
          ))}
        </div>

        {/* A MEET LINK NEEDS GOOGLE. The link on every booking is minted
            through the host's Google Calendar, so without a connection the
            meeting is booked with nowhere to meet, and the guest finds out at
            the start time. Said here, where the choice is made, with the way
            to fix it beside it, rather than silently accepted. */}
        {locationKind === "google_meet" && googleMissing ? (
          <Callout
            tone="amber"
            action={
              <ButtonLink
                variant="amber"
                size={28}
                href={`/api/google/connect?next=${encodeURIComponent(returnTo)}`}
              >
                <GoogleG size={13} />
                {google.needsReconnect ? "Reconnect" : "Connect"}
              </ButtonLink>
            }
          >
            <strong className="font-semibold">
              {google.needsReconnect ? "Google Calendar needs reconnecting." : "Google Calendar isn’t connected."}
            </strong>{" "}
            Until it is, bookings of this meeting get no Meet link. Connect it, or pick another location.
          </Callout>
        ) : locationKind === "google_meet" ? (
          <div className="flex gap-[11px] rounded-[8px] border border-line bg-fill px-[14px] py-[12px]">
            <Icon name="circle-info" weight="solid" size={11} className="mt-[3px] flex-none text-accent-ink" />
            <span className="text-[12.5px] leading-[1.6] text-ink-2">
              Meetrao creates one calendar event and invites your guest to it, so the meeting, the description
              and the Meet link land on both calendars. Changes and cancellations update both sides.
            </span>
          </div>
        ) : (
          <Field
            label={
              locationKind === "phone" ? "Number or arrangement" : locationKind === "in_person" ? "Address" : "Details"
            }
            htmlFor="meeting-location-detail"
            help={LOCATION_OPTIONS.find((o) => o.value === locationKind)?.hint}
          >
            <Input
              id="meeting-location-detail"
              height={36}
              maxLength={200}
              placeholder={
                locationKind === "phone"
                  ? "+880 1XXX-XXXXXX, or “I’ll call you”"
                  : locationKind === "in_person"
                    ? "12 Example Road, Cumilla"
                    : "Your Zoom link, or what guests should do"
              }
              value={form.locationDetail ?? ""}
              onChange={(e) => set("locationDetail", e.target.value)}
            />
          </Field>
        )}

        {locationKind !== "google_meet" ? (
          <div className="flex gap-[11px] rounded-[8px] border border-line bg-fill px-[14px] py-[12px]">
            <Icon name="circle-info" weight="solid" size={11} className="mt-[3px] flex-none text-ink-3" />
            <span className="text-[12.5px] leading-[1.6] text-ink-2">
              No Meet link is created. The booking still lands on both calendars, carrying this as its location.
            </span>
          </div>
        ) : null}
      </section>

      {/* ── seats ────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-[12px] border-b border-line py-[20px]">
        <PanelHeading
          title="Seats"
          subtitle="One guest at a time, or several sharing the same slot, a class, a workshop, an office hour."
        />

        <div className="flex flex-wrap gap-[8px]">
          <ChoiceChip selected={capacity === 1} onClick={() => set("capacity", 1)}>
            One at a time
          </ChoiceChip>
          {pro ? (
            <ChoiceChip selected={capacity > 1} onClick={() => set("capacity", capacity > 1 ? capacity : 8)}>
              Several together
            </ChoiceChip>
          ) : null}
        </div>

        {pro ? null : (
          <Callout tone="accent" title="Sessions several guests share are part of Pro">
            A class, a workshop, an office hour, one slot, several seats.{" "}
            <Link href="/settings/billing" className="font-semibold">
              See Pro, $30 a year
            </Link>
            .
          </Callout>
        )}

        {capacity > 1 ? (
          <Field
            label="Guests per slot"
            htmlFor="meeting-capacity"
            help="Each guest books their own seat. The slot closes when the last one goes."
            error={capacityInvalid ? "Between 2 and 100." : undefined}
          >
            <Input
              id="meeting-capacity"
              type="number"
              min={2}
              max={100}
              height={36}
              className="max-w-[140px]"
              value={String(capacity)}
              invalid={capacityInvalid}
              onChange={(e) => set("capacity", Number(e.target.value))}
            />
          </Field>
        ) : null}

        {capacity > 1 ? (
          <div className="flex gap-[11px] rounded-[8px] border border-line bg-fill px-[14px] py-[12px]">
            <Icon name="circle-info" weight="solid" size={11} className="mt-[3px] flex-none text-ink-3" />
            <span className="text-[12.5px] leading-[1.6] text-ink-2">
              Everyone booked into a slot shares one calendar event and one Meet link, so your own calendar
              shows the session once rather than once per guest.
            </span>
          </div>
        ) : null}
      </section>

      {/* ── questions ────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-[12px] border-b border-line py-[20px]">
        <PanelHeading
          title="Questions"
          subtitle="Asked on the booking form, after name and email. The note field is always there."
        />

        {questions.length ? (
          <div className="flex flex-col gap-[10px]">
            {questions.map((q, i) => (
              <div key={q.id} className="flex flex-col gap-[9px] rounded-[8px] border border-line bg-fill px-[13px] py-[11px]">
                <div className="flex flex-wrap items-center gap-[9px]">
                  <Input
                    aria-label={`Question ${i + 1}`}
                    height={34}
                    maxLength={120}
                    placeholder="What would you like to cover?"
                    value={q.label}
                    className="min-w-[180px] flex-1"
                    onChange={(e) => editQuestion(q.id, { label: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size={28}
                    className="text-red hover:text-red"
                    onClick={() => setQuestions(questions.filter((x) => x.id !== q.id))}
                  >
                    Remove
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-[14px]">
                  <div className="flex min-w-[150px] flex-1 flex-col gap-[6px]">
                    <span className="text-[12px] font-semibold text-ink">Answer</span>
                    <MenuSelect
                      size="sm"
                      aria-label={`Answer length for question ${i + 1}`}
                      options={[
                        { value: "short", label: "One line" },
                        { value: "long", label: "A paragraph" },
                      ]}
                      value={q.kind}
                      onChange={(v) => editQuestion(q.id, { kind: v as "short" | "long" })}
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-[8px] text-[12.5px] text-ink">
                    <Switch
                      checked={q.required}
                      label={`Question ${i + 1} is required`}
                      onChange={(next) => editQuestion(q.id, { required: next })}
                    />
                    Required
                  </label>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-[4px] rounded-[6px] border border-dashed border-line-strong px-[14px] py-[15px]">
            <span className="text-[13px] font-semibold text-ink">No questions</span>
            <span className="text-[12px] leading-[1.5] text-ink-3">
              Guests give a name, an email and an optional note. Ask more only if you will read it.
            </span>
          </div>
        )}

        {questions.length < MAX_QUESTIONS ? (
          <div>
            <Button variant="secondary" size={30} icon="plus" onClick={addQuestion}>
              Add question
            </Button>
          </div>
        ) : (
          <span className="text-[12px] text-ink-3">Five is the most a booking form should ask.</span>
        )}
      </section>

      <section className="flex flex-col gap-[14px] py-[20px]">
        <PanelHeading title="Booking rules" subtitle="How close to the hour and how far ahead guests can book." />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(164px,1fr))] gap-[13px]">
          <div className="flex flex-col gap-[6px]">
            <span className="text-[12.5px] font-semibold text-ink">Buffer between meetings</span>
            <MenuSelect
              aria-label="Buffer between meetings"
              options={BUFFERS}
              value={String(form.buffer)}
              onChange={(v) => set("buffer", Number(v))}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <span className="text-[12.5px] font-semibold text-ink">Minimum notice</span>
            <MenuSelect
              aria-label="Minimum notice"
              options={NOTICES}
              value={String(form.notice)}
              onChange={(v) => set("notice", Number(v))}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <span className="text-[12.5px] font-semibold text-ink">Availability</span>
            <MenuSelect
              aria-label="Availability schedule"
              options={schedules}
              value={form.scheduleId ?? ""}
              onChange={(v) => set("scheduleId", v || null)}
            />
          </div>

          {/* No min-width of its own, like its three siblings: a 190px floor
              inside a 164px grid track broke out of it and panned the page on
              a phone. */}
          <div className="flex flex-col gap-[6px]">
            <span className="text-[12.5px] font-semibold text-ink">Booking window</span>
            <MenuSelect
              aria-label="Booking window"
              options={WINDOWS}
              value={String(form.window)}
              onChange={(v) => set("window", Number(v))}
            />
          </div>
        </div>

        <div className="flex items-center gap-[14px] rounded-[8px] border border-line bg-surface px-[14px] py-[12px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="text-[13.5px] font-semibold text-ink">Active</span>
            <span className="text-[12.5px] text-ink-3">Guests can book this meeting from your link.</span>
          </div>
          <Switch checked={form.active} onChange={(v) => set("active", v)} label="Meeting is bookable" />
        </div>
      </section>

      {/* STICKY AT THE BOTTOM OF THE SCROLL AREA. Save used to be the last
          thing on a long form, so changing the name at the top meant
          scrolling past every section to keep it. Pinned to the bottom of
          the app body's scrollport, it is always one move away and never
          covers the field being edited; at the end of the form it settles
          into its own place above the page's bottom padding. The ground
          colour and top rule keep the fields scrolling under it legible. */}
      <div className="sticky bottom-0 z-20 flex flex-wrap items-center gap-[10px] border-t border-line bg-ground py-[12px]">
        <Button
          variant="accent"
          size={36}
          busy={saving}
          onClick={() =>
            startSave(async () => {
              if (!form.name.trim() || slugError || durationInvalid || capacityInvalid) {
                setTouched(true);
                if (slugError || durationInvalid) {
                  toast({ tone: "bad", title: "Check the form", text: slugError ?? "The duration is out of range." });
                }
                return;
              }
              /* A new meeting sends the slug it showed, so what was on screen
                 is what gets saved; an existing one sends its field as is. */
              const result = await saveMeeting({ ...form, slug: slug || undefined });
              if (result.error) {
                toast({ tone: "bad", title: "Could not save", text: result.error });
                return;
              }
              leaving.current = true;
              toast({ tone: "ok", title: editing ? "Meeting saved" : "Meeting created", text: form.name });
              router.push("/meetings");
              router.refresh();
            })
          }
        >
          {saving ? "Saving…" : editing ? "Save changes" : "Create meeting"}
        </Button>
        <Button variant="ghost" size={36} onClick={cancel}>
          Cancel
        </Button>
        {dirty ? <span className="text-[12px] text-ink-3">Unsaved changes</span> : null}

        <div className="ml-auto flex flex-wrap items-center gap-[6px]">
          {/* The SAVED page, which is what guests see; unsaved edits are not
              on it until Save. Not offered while the meeting is switched off,
              because its page is a 404 then. */}
          {previewHref && initial.active ? (
            <Button
              variant="ghost"
              size={36}
              title="Opens the saved booking page in a new tab"
              onClick={() => window.open(previewHref, "_blank", "noopener,noreferrer")}
            >
              Preview
            </Button>
          ) : null}

          {/* Pushed to the far end, away from Save. Ghost rather than red: the
              weight belongs in the dialog, not in a button somebody passes on
              the way to saving. */}
          {editing ? (
            <Button
              variant="ghost"
              size={36}
              className="hover:bg-red-soft hover:text-red"
              disabled={removing}
              onClick={() => setConfirming(true)}
            >
              Delete meeting
            </Button>
          ) : null}
        </div>
      </div>

      {/* Names the meeting, because "Delete this meeting?" is a dialog people
          confirm without reading. */}
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete ${initial.name || "this meeting"}?`}
        subtitle="The link stops working and the meeting goes from your list. Bookings already made stay where they are and keep their times: nobody is cancelled and no guest is told."
        primary={{
          label: "Delete",
          variant: "danger",
          busy: removing,
          onClick: () =>
            startRemove(async () => {
              const result = await deleteMeeting(initial.id as string);
              if (result.error) {
                toast({ tone: "bad", title: "Could not delete", text: result.error });
                return;
              }
              leaving.current = true;
              setConfirming(false);
              toast({ tone: "neutral", title: "Meeting deleted", text: initial.name });
              router.push("/meetings");
              router.refresh();
            }),
        }}
        secondary={{ label: "Keep it", onClick: () => setConfirming(false) }}
      />
    </div>
  );
}
