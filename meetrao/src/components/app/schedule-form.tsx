"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceChip, Field, Input, Textarea } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { MenuSelect } from "@/components/ui/menu-select";
import { Callout, PanelHeading } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { scheduleMeeting } from "@/lib/actions/schedule";

/* ─────────────────────────────────────────────────────────────────────────────
   Scheduling a meeting the other way round.

   The booking link answers "when are you free?". This answers "be here, then".
   The host picks the time and invites whoever should come.

   Three shapes of decision, in the order a host makes them: what the meeting
   is, when it happens, and who is coming. The invitee list is the part that is
   genuinely new, so it gets room: one row per person, name optional, the first
   one required, and a running count so a long list is still legible.
   ───────────────────────────────────────────────────────────────────────────── */

const DURATIONS = [15, 30, 45, 60, 90];
const ONE_OFF = "";

type Invitee = { name: string; email: string };

export function ScheduleForm({
  meetingTypes,
  timeOptions,
  timezoneLabel,
  today,
}: {
  meetingTypes: { value: string; label: string }[];
  timeOptions: { value: string; label: string }[];
  timezoneLabel: string;
  /** The host's today, so the date field cannot start in the past. */
  today: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, startSave] = useTransition();

  const [meetingTypeId, setMeetingTypeId] = useState(meetingTypes[1]?.value ?? ONE_OFF);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("540");
  const [invitees, setInvitees] = useState<Invitee[]>([{ name: "", email: "" }]);
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);

  const oneOff = meetingTypeId === ONE_OFF;
  const titleInvalid = touched && oneOff && !title.trim();
  const noInvitee = touched && !invitees.some((i) => i.email.trim());
  const filled = invitees.filter((i) => i.email.trim()).length;

  function setInvitee(index: number, patch: Partial<Invitee>) {
    setInvitees((list) => list.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function submit() {
    setTouched(true);
    if ((oneOff && !title.trim()) || !invitees.some((i) => i.email.trim())) return;

    startSave(async () => {
      const result = await scheduleMeeting({
        meetingTypeId: oneOff ? null : meetingTypeId,
        title,
        durationMinutes: duration,
        date,
        time: Number(time),
        invitees: invitees.filter((i) => i.email.trim()),
        note,
      });

      if (result.error) {
        toast({ tone: "bad", title: "Could not schedule", text: result.error });
        return;
      }

      toast({
        tone: result.calendarWarning ? "warn" : "ok",
        title: result.calendarWarning ? "Scheduled, without the calendar" : "Meeting scheduled",
        text: result.calendarWarning
          ? "Invitations were emailed, but Google Calendar did not take the event."
          : `${filled} ${filled === 1 ? "person has" : "people have"} been invited.`,
      });
      router.push("/bookings");
      router.refresh();
    });
  }

  return (
    <div className="flex w-full max-w-[600px] flex-col">
      <section className="flex flex-col gap-[14px] border-b border-line pb-[20px]">
        <PanelHeading title="What" subtitle="Reuse a meeting type, or set this one up on its own." />

        <Field label="Meeting" htmlFor="schedule-type">
          <MenuSelect
            id="schedule-type"
            options={meetingTypes}
            value={meetingTypeId}
            onChange={setMeetingTypeId}
          />
        </Field>

        {oneOff ? (
          <>
            <Field
              label="Title"
              htmlFor="schedule-title"
              error={titleInvalid ? "Give the meeting a name your invitees will recognise." : undefined}
            >
              <Input
                id="schedule-title"
                height={36}
                value={title}
                invalid={titleInvalid}
                placeholder="Quarterly review"
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            <div className="flex flex-col gap-[6px]">
              <span className="text-[12.5px] font-semibold text-ink">Duration</span>
              <div className="flex flex-wrap gap-[8px]">
                {DURATIONS.map((d) => (
                  <ChoiceChip key={d} selected={duration === d} onClick={() => setDuration(d)}>
                    {d} min
                  </ChoiceChip>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </section>

      <section className="flex flex-col gap-[14px] border-b border-line py-[20px]">
        <PanelHeading title="When" subtitle={`Your time, ${timezoneLabel}.`} />

        <div className="flex flex-wrap gap-[12px]">
          <Field label="Date" htmlFor="schedule-date" className="min-w-[190px] flex-1">
            <Input
              id="schedule-date"
              type="date"
              height={36}
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <div className="flex min-w-[190px] flex-1 flex-col gap-[6px]">
            <span className="text-[12.5px] font-semibold text-ink">Start</span>
            <MenuSelect aria-label="Start time" options={timeOptions} value={time} onChange={setTime} />
          </div>
        </div>

        <Callout tone="info">
          Your availability does not apply here. You have already decided you are free. A clash with an
          existing booking is still refused.
        </Callout>
      </section>

      <section className="flex flex-col gap-[14px] border-b border-line py-[20px]">
        <PanelHeading
          title="Who"
          subtitle="Everyone here gets the invitation, the calendar event and the Meet link."
        />

        <div className="flex flex-col gap-[8px]">
          {invitees.map((row, i) => (
            <div key={i} className="flex flex-wrap items-end gap-[8px]">
              <Field
                label={i === 0 ? "Name" : undefined}
                htmlFor={`invitee-name-${i}`}
                className="min-w-[150px] flex-1"
              >
                <Input
                  id={`invitee-name-${i}`}
                  height={36}
                  value={row.name}
                  placeholder="Optional"
                  onChange={(e) => setInvitee(i, { name: e.target.value })}
                />
              </Field>
              <Field
                label={i === 0 ? "Email" : undefined}
                htmlFor={`invitee-email-${i}`}
                className="min-w-[190px] flex-[1.4]"
              >
                <Input
                  id={`invitee-email-${i}`}
                  type="email"
                  height={36}
                  value={row.email}
                  invalid={noInvitee && i === 0}
                  placeholder="name@company.com"
                  onChange={(e) => setInvitee(i, { email: e.target.value })}
                />
              </Field>
              <button
                type="button"
                aria-label={`Remove invitee ${i + 1}`}
                disabled={invitees.length === 1}
                onClick={() => setInvitees((list) => list.filter((_, x) => x !== i))}
                className="mb-[1px] inline-flex h-[36px] w-[36px] flex-none cursor-pointer items-center justify-center rounded-[6px] border border-line-strong bg-surface text-ink-3 hover:bg-fill hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Icon name="xmark" size={11} />
              </button>
            </div>
          ))}
        </div>

        {noInvitee ? (
          <span className="text-[12px] text-red">Invite at least one person.</span>
        ) : null}

        <div className="flex flex-wrap items-center gap-[12px]">
          <Button
            variant="secondary"
            size={30}
            icon="user-plus"
            onClick={() => setInvitees((list) => [...list, { name: "", email: "" }])}
          >
            Add another
          </Button>
          <span className="text-[12.5px] text-ink-3">
            {filled === 0 ? "Nobody invited yet" : `${filled} invited`}
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-[14px] py-[20px]">
        <Field label="Note" htmlFor="schedule-note" help="Included in the invitation and on the calendar event.">
          <Textarea
            id="schedule-note"
            rows={3}
            value={note}
            placeholder="Anything they should know or bring."
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-[12px]">
          <Button variant="accent" size={38} busy={saving} onClick={submit}>
            {saving ? "Scheduling…" : "Schedule and invite"}
          </Button>
          <Button variant="ghost" size={38} onClick={() => router.push("/bookings")}>
            Cancel
          </Button>
        </div>
      </section>
    </div>
  );
}
