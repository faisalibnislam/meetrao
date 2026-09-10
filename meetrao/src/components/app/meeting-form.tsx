"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceChip, Field, Input, Switch, Textarea } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { MenuSelect } from "@/components/ui/menu-select";
import { PanelHeading } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { saveMeeting, type MeetingInput } from "@/lib/actions/meetings";

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

export function MeetingForm({
  initial,
  schedules = [],
}: {
  initial: MeetingInput;
  schedules?: ScheduleOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState(false);
  const [saving, startSave] = useTransition();

  const set = <K extends keyof MeetingInput>(key: K, value: MeetingInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

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
        <PanelHeading title="Location" subtitle="Every booking gets its own Google Meet link, on both calendars." />

        <div className="flex h-[36px] items-center gap-[9px] rounded-[6px] border border-line bg-fill px-[12px]">
          <Icon name="video" size={13} className="text-ink-2" />
          <span className="text-[13.5px] text-ink">Google Meet</span>
        </div>

        <div className="flex gap-[11px] rounded-[8px] border border-line bg-fill px-[14px] py-[12px]">
          <Icon name="circle-info" weight="solid" size={11} className="mt-[3px] flex-none text-accent" />
          <span className="text-[12.5px] leading-[1.6] text-ink-2">
            Meetrao creates one calendar event and invites your guest to it, so the meeting, the description and
            the Meet link land on both calendars. Changes and cancellations update both sides.
          </span>
        </div>
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
