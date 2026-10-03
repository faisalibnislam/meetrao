"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceChip, Field, Input, Switch, Textarea } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { MenuSelect } from "@/components/ui/menu-select";
import { Callout, PanelHeading } from "@/components/ui/panels";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { saveMeeting, type MeetingInput } from "@/lib/actions/meetings";
import type { BookingQuestion } from "@/lib/types";
import { LOCATION_OPTIONS } from "@/lib/locations";
import { cx } from "@/lib/cx";

const DURATIONS = [15, 30, 45, 60];

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

export function MeetingForm({
  initial,
  schedules = [],
  pro = false,
}: {
  initial: MeetingInput;
  schedules?: ScheduleOption[];
  /** Group sessions are Pro; the server enforces it either way. */
  pro?: boolean;
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

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col">
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
              <ChoiceChip key={d} selected={form.duration === d} onClick={() => set("duration", d)}>
                {d} min
              </ChoiceChip>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-[11px] border-b border-line py-[20px]">
        <PanelHeading title="Location" subtitle="Where this one happens. Guests are told on the booking page." />

        <div className="flex flex-wrap gap-[8px]">
          {LOCATION_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={locationKind === o.value}
              onClick={() => set("location", o.value)}
              className={cx(
                "inline-flex h-[32px] cursor-pointer items-center rounded-[6px] border px-[12px] text-[12.5px]",
                "transition-[background-color,border-color] duration-[120ms] ease-[ease]",
                locationKind === o.value
                  ? "border-accent bg-accent-soft font-semibold text-accent-ink"
                  : "border-line-strong bg-surface font-medium text-ink hover:bg-fill",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        {locationKind === "google_meet" ? (
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

      <section className="flex flex-col gap-[14px] border-b border-line py-[20px]">
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

          <div className="flex min-w-[190px] flex-1 flex-col gap-[6px]">
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

      <div className="flex flex-wrap items-center gap-[10px] pt-[18px]">
        <Button
          variant="accent"
          size={36}
          busy={saving}
          onClick={() =>
            startSave(async () => {
              if (!form.name.trim()) {
                setTouched(true);
                return;
              }
              const result = await saveMeeting(form);
              if (result.error) {
                toast({ tone: "bad", title: "Could not save", text: result.error });
                return;
              }
              toast({ tone: "ok", title: editing ? "Meeting saved" : "Meeting created", text: form.name });
              router.push("/meetings");
              router.refresh();
            })
          }
        >
          {saving ? "Saving…" : editing ? "Save changes" : "Create meeting"}
        </Button>
        <Button variant="ghost" size={36} onClick={() => router.push("/meetings")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
