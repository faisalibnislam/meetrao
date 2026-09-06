"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { Field, Input, Textarea, FieldError } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { MenuSelect } from "@/components/ui/menu-select";
import { useToast } from "@/components/ui/toast";
import {
  createMeetingType,
  updateMeetingType,
  type MeetingFormInput,
} from "@/lib/actions/meetings";

export const DURATION_CHOICES = [15, 30, 45, 60] as const;

export const BUFFER_OPTIONS = [
  { value: "0", label: "None" },
  { value: "5", label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "15", label: "15 minutes" },
];

export const NOTICE_OPTIONS = [
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
  { value: "240", label: "4 hours" },
  { value: "720", label: "12 hours" },
  { value: "1440", label: "24 hours" },
];

export const WINDOW_OPTIONS = [
  { value: "7", label: "7 days ahead" },
  { value: "14", label: "14 days ahead" },
  { value: "30", label: "30 days ahead" },
  { value: "60", label: "60 days ahead" },
];

export const DURATION_SELECT_OPTIONS = DURATION_CHOICES.map((d) => ({
  value: String(d),
  label: `${d} minutes`,
}));

export function DurationChips({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Duration"
      className="flex flex-wrap gap-[6px]"
    >
      {DURATION_CHOICES.map((minutes) => {
        const on = value === minutes;
        return (
          <button
            key={minutes}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(minutes)}
            className={cn(
              "inline-flex h-[32px] cursor-pointer items-center rounded-[6px] border px-[13px] text-[13px]",
              "transition-[background-color,border-color] duration-[120ms]",
              on
                ? "border-accent bg-accent font-semibold text-white"
                : "border-line-strong bg-surface font-medium text-ink",
            )}
          >
            {minutes} min
          </button>
        );
      })}
    </div>
  );
}

/** The locked Google Meet row — "Only option in this release". */
export function LocationRow({ note }: { note?: string }) {
  return (
    <div className="flex h-[36px] items-center gap-[9px] rounded-[6px] border border-line bg-fill px-[12px]">
      <Icon name="video" size={13} className="text-ink-2" />
      <span className="text-[13.5px] text-ink">Google Meet</span>
      {note ? (
        <span className="ml-auto text-[12px] text-ink-3">{note}</span>
      ) : null}
    </div>
  );
}

export type MeetingFormValues = MeetingFormInput;

export function defaultMeetingValues(
  defaults: { durationMinutes: number; minimumNoticeMinutes: number },
): MeetingFormValues {
  return {
    name: "",
    description: "",
    durationMinutes: defaults.durationMinutes,
    bufferMinutes: 0,
    minimumNoticeMinutes: defaults.minimumNoticeMinutes,
    bookingWindowDays: 30,
    isActive: true,
  };
}

/** Create / edit meeting. `meetingId` switches it into edit mode. */
export function MeetingForm({
  meetingId,
  initial,
}: {
  meetingId?: string;
  initial: MeetingFormValues;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [values, setValues] = useState<MeetingFormValues>(initial);
  const [touched, setTouched] = useState(false);
  const [pending, startTransition] = useTransition();

  const nameInvalid = touched && !values.name.trim();
  const set = <K extends keyof MeetingFormValues>(
    key: K,
    value: MeetingFormValues[K],
  ) => setValues((v) => ({ ...v, [key]: value }));

  function submit() {
    if (!values.name.trim()) {
      setTouched(true);
      return;
    }
    startTransition(async () => {
      const result = meetingId
        ? await updateMeetingType(meetingId, values)
        : await createMeetingType(values);

      if (!result.ok) {
        notify("bad", "Could not save", result.message);
        return;
      }
      notify(
        "ok",
        meetingId ? "Meeting saved" : "Meeting created",
        values.name.trim(),
      );
      router.push("/meetings");
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col">
      <section className="flex flex-col gap-[14px] border-b border-line pb-[20px]">
        <div className="flex flex-col gap-[2px]">
          <h2 className="m-0 text-[14.5px] font-semibold text-ink">
            Meeting details
          </h2>
          <p className="m-0 text-[12.5px] text-ink-3">
            What guests see when they open your booking link.
          </p>
        </div>

        <label className="flex flex-col gap-[6px]">
          <span className="text-[12.5px] font-semibold text-ink">Name</span>
          <Input
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            invalid={nameInvalid}
            placeholder="30 Minute Consultation"
          />
          {nameInvalid ? (
            <FieldError>
              Give the meeting a name guests will recognise.
            </FieldError>
          ) : null}
        </label>

        <Field label="Description">
          <Textarea
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="A quick conversation to discuss your project."
          />
        </Field>

        <div className="flex flex-col gap-[7px]">
          <span className="text-[12.5px] font-semibold text-ink">Duration</span>
          <DurationChips
            value={values.durationMinutes}
            onChange={(v) => set("durationMinutes", v)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-[11px] border-b border-line py-[20px]">
        <div className="flex flex-col gap-[2px]">
          <h2 className="m-0 text-[14.5px] font-semibold text-ink">Location</h2>
          <p className="m-0 text-[12.5px] text-ink-3">
            Every booking gets its own Google Meet link.
          </p>
        </div>
        <LocationRow />
      </section>

      <section className="flex flex-col gap-[14px] border-b border-line py-[20px]">
        <div className="flex flex-col gap-[2px]">
          <h2 className="m-0 text-[14.5px] font-semibold text-ink">
            Booking rules
          </h2>
          <p className="m-0 text-[12.5px] text-ink-3">
            How close to the hour and how far ahead guests can book.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(164px,1fr))] gap-[13px]">
          <div className="flex flex-col gap-[6px]">
            <span className="text-[12.5px] font-semibold text-ink">
              Buffer between meetings
            </span>
            <MenuSelect
              label="Buffer between meetings"
              options={BUFFER_OPTIONS}
              value={String(values.bufferMinutes)}
              onChange={(v) => set("bufferMinutes", Number(v))}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <span className="text-[12.5px] font-semibold text-ink">
              Minimum notice
            </span>
            <MenuSelect
              label="Minimum notice"
              options={NOTICE_OPTIONS}
              value={String(values.minimumNoticeMinutes)}
              onChange={(v) => set("minimumNoticeMinutes", Number(v))}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <span className="text-[12.5px] font-semibold text-ink">
              Booking window
            </span>
            <MenuSelect
              label="Booking window"
              options={WINDOW_OPTIONS}
              value={String(values.bookingWindowDays)}
              onChange={(v) => set("bookingWindowDays", Number(v))}
            />
          </div>
        </div>

        <div className="flex items-center gap-[14px] rounded-[8px] border border-line bg-surface px-[14px] py-[12px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="text-[13.5px] font-semibold text-ink">Active</span>
            <span className="text-[12.5px] text-ink-3">
              Guests can book this meeting from your link.
            </span>
          </div>
          <Switch
            label="Active"
            checked={values.isActive}
            onChange={(v) => set("isActive", v)}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-[10px] pt-[18px]">
        <Button size="xl" loading={pending} onClick={submit}>
          {meetingId ? "Save changes" : "Create meeting"}
        </Button>
        <Button
          size="xl"
          variant="ghost"
          onClick={() => router.push("/meetings")}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
