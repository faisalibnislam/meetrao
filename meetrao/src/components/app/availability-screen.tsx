"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { MenuSelect } from "@/components/ui/menu-select";
import { Modal } from "@/components/ui/modal";
import { Callout } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { AvailabilityEditor } from "./availability-editor";
import { daysToRules, type Day, type ScheduleView } from "@/lib/availability";
import {
  createSchedule,
  deleteSchedule,
  renameSchedule,
  saveAvailability,
  setDefaultSchedule,
} from "@/lib/actions/availability";
import type { TimezoneOption } from "@/lib/timezones";
import { cx } from "@/lib/cx";

/* ─────────────────────────────────────────────────────────────────────────────
   Availability, with named schedules.

   A host keeps as many weekly patterns as they need — "Working hours", "Client
   calls", "Weekend slots" — and each meeting type points at one. This screen is
   where the patterns are made; the picker on the meeting form is where they are
   assigned.

   Edits are held per schedule and saved together. Switching schedules with
   unsaved work does not discard it and does not block: the chip carries a dot,
   and Save writes every schedule that has changed. Losing a half-finished week
   because you clicked the wrong tab is the failure mode this avoids.
   ───────────────────────────────────────────────────────────────────────────── */

type Dialog =
  | { kind: "new" }
  | { kind: "rename"; id: string; name: string }
  | { kind: "duplicate"; id: string; name: string }
  | { kind: "delete"; id: string }
  | null;

export function AvailabilityScreen({
  initialSchedules,
  initialTimezone,
  timezones,
}: {
  initialSchedules: ScheduleView[];
  initialTimezone: string;
  timezones: TimezoneOption[];
}) {
  const toast = useToast();
  const [schedules, setSchedules] = useState(initialSchedules);
  const [activeId, setActiveId] = useState(initialSchedules[0]?.id ?? "");
  const [timezone, setTimezone] = useState(initialTimezone);
  const [dirty, setDirty] = useState<string[]>([]);
  const [tzDirty, setTzDirty] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [draftName, setDraftName] = useState("");
  const [saving, startSave] = useTransition();
  const [busy, startBusy] = useTransition();

  const active = schedules.find((s) => s.id === activeId) ?? schedules[0];
  const unsaved = dirty.length > 0 || tzDirty;

  function markDirty(id: string) {
    setDirty((d) => (d.includes(id) ? d : [...d, id]));
  }

  function setDays(id: string, days: Day[]) {
    setSchedules((list) => list.map((s) => (s.id === id ? { ...s, days } : s)));
    markDirty(id);
  }

  /** Saves every schedule that changed, not just the one on screen. */
  function save() {
    startSave(async () => {
      const ids = dirty.length ? dirty : active ? [active.id] : [];
      for (const id of ids) {
        const schedule = schedules.find((s) => s.id === id);
        if (!schedule) continue;
        const result = await saveAvailability({
          scheduleId: id,
          timezone,
          rules: daysToRules(schedule.days),
        });
        if (result.error) {
          toast({ tone: "bad", title: `Could not save ${schedule.name}`, text: result.error });
          return;
        }
      }
      setDirty([]);
      setTzDirty(false);
      toast({
        tone: "ok",
        title: ids.length > 1 ? `${ids.length} schedules saved` : "Availability saved",
        text: "Guests see these hours from now on.",
      });
    });
  }

  function runDialog() {
    const d = dialog;
    if (!d) return;

    startBusy(async () => {
      if (d.kind === "new" || d.kind === "duplicate") {
        const result = await createSchedule({
          name: draftName,
          copyFrom: d.kind === "duplicate" ? d.id : undefined,
        });
        if (result.error) return toast({ tone: "bad", title: "Could not create", text: result.error });
        toast({ tone: "ok", title: "Schedule created", text: "Assign it to a meeting to put it to work." });
      }

      if (d.kind === "rename") {
        const result = await renameSchedule({ id: d.id, name: draftName });
        if (result.error) return toast({ tone: "bad", title: "Could not rename", text: result.error });
        toast({ tone: "ok", title: "Renamed" });
      }

      if (d.kind === "delete") {
        const result = await deleteSchedule({ id: d.id });
        if (result.error) return toast({ tone: "bad", title: "Could not delete", text: result.error });
        toast({ tone: "ok", title: "Schedule deleted", text: "Its meetings moved to your default." });
      }

      setDialog(null);
      // The server action revalidates; a reload is what makes the new list,
      // the new default and the reassigned meetings all correct at once.
      window.location.reload();
    });
  }

  function makeDefault(id: string) {
    startBusy(async () => {
      const result = await setDefaultSchedule({ id });
      if (result.error) return toast({ tone: "bad", title: "Could not change the default", text: result.error });
      toast({ tone: "ok", title: "Default changed", text: "Meetings without a schedule of their own follow it." });
      window.location.reload();
    });
  }

  if (!active) {
    return (
      <Callout tone="amber" title="No schedule yet">
        Reload the page and one will be created for you.
      </Callout>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[660px] flex-col gap-[18px]">
      <div className="flex flex-wrap items-end gap-[16px] border-b border-line pb-[18px]">
        <div className="flex min-w-[220px] flex-1 flex-col gap-[6px]">
          <span className="text-[12.5px] font-semibold text-ink">Timezone</span>
          <MenuSelect
            searchable
            aria-label="Timezone"
            options={timezones}
            value={timezone}
            onChange={(v) => {
              setTimezone(v);
              setTzDirty(true);
            }}
          />
        </div>
        <p className="m-0 min-w-[200px] flex-1 text-[12.5px] leading-[1.5] text-pretty text-ink-3">
          One timezone for every schedule — guests always see these hours converted into their own.
        </p>
      </div>

      {/* ── the schedules ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-[10px]">
        <span className="text-[12.5px] font-semibold text-ink">Schedules</span>
        <div className="flex flex-wrap gap-[8px]">
          {schedules.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              aria-pressed={s.id === active.id}
              className={cx(
                "inline-flex h-[32px] cursor-pointer items-center gap-[8px] rounded-[6px] border px-[12px] text-[13px]",
                "transition-[background-color,border-color] duration-[120ms] ease-[ease]",
                s.id === active.id
                  ? "border-accent bg-accent font-semibold text-white"
                  : "border-line-strong bg-surface font-medium text-ink hover:bg-fill",
              )}
            >
              {s.name}
              {s.isDefault ? (
                <span className={cx("text-[10.5px] font-semibold uppercase tracking-[0.06em]",
                  s.id === active.id ? "text-white/75" : "text-ink-3")}>
                  Default
                </span>
              ) : null}
              {dirty.includes(s.id) ? (
                <span
                  aria-label="Unsaved changes"
                  className={cx("h-[5px] w-[5px] flex-none rounded-full", s.id === active.id ? "bg-white" : "bg-amber")}
                />
              ) : null}
            </button>
          ))}
          <Button
            variant="secondary"
            size={32}
            icon="plus"
            onClick={() => {
              setDraftName("");
              setDialog({ kind: "new" });
            }}
          >
            New schedule
          </Button>
        </div>
      </div>

      {/* ── the active schedule ────────────────────────────────────────── */}
      <div className="flex flex-col gap-[12px] rounded-[8px] border border-line bg-surface px-[16px] py-[14px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <div className="flex min-w-0 flex-col gap-[3px]">
            <span className="flex items-center gap-[8px] text-[14px] font-semibold text-ink">
              {active.name}
              {active.isDefault ? <Badge tone="ok" dot={false}>Default</Badge> : null}
            </span>
            <span className="text-[12px] leading-[1.5] text-ink-3">
              {active.usedBy.length
                ? `Used by ${active.usedBy.join(", ")}`
                : "No meetings use this yet — pick it on a meeting to put it to work."}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-[6px]">
            <Button variant="ghost" size={28} onClick={() => { setDraftName(active.name); setDialog({ kind: "rename", id: active.id, name: active.name }); }}>
              Rename
            </Button>
            <Button variant="ghost" size={28} onClick={() => { setDraftName(`${active.name} copy`); setDialog({ kind: "duplicate", id: active.id, name: active.name }); }}>
              Duplicate
            </Button>
            {!active.isDefault ? (
              <Button variant="ghost" size={28} busy={busy} onClick={() => makeDefault(active.id)}>
                Make default
              </Button>
            ) : null}
            {!active.isDefault && schedules.length > 1 ? (
              <Button variant="ghost" size={28} className="text-red hover:text-red" onClick={() => setDialog({ kind: "delete", id: active.id })}>
                Delete
              </Button>
            ) : null}
          </div>
        </div>

        <AvailabilityEditor days={active.days} onChange={(next) => setDays(active.id, next)} />
      </div>

      <div className="flex flex-wrap items-center gap-[12px]">
        <Button variant="accent" size={36} busy={saving} onClick={save}>
          {saving ? "Saving…" : "Save availability"}
        </Button>
        <span
          role="status"
          aria-live="polite"
          className={cx("inline-flex items-center gap-[7px] text-[12.5px]", unsaved ? "text-ink-3" : "text-accent")}
        >
          {unsaved
            ? dirty.length > 1
              ? `Unsaved changes in ${dirty.length} schedules`
              : "Unsaved changes"
            : "All changes saved"}
        </span>
      </div>

      <Modal
        open={dialog?.kind === "new" || dialog?.kind === "duplicate" || dialog?.kind === "rename"}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "rename" ? "Rename schedule" : dialog?.kind === "duplicate" ? "Duplicate schedule" : "New schedule"}
        subtitle={
          dialog?.kind === "duplicate"
            ? "Starts with the same hours as the one you copied."
            : dialog?.kind === "rename"
              ? undefined
              : "Starts Monday to Friday, 09:00 to 17:00. Change it to suit."
        }
        primary={{ label: dialog?.kind === "rename" ? "Rename" : "Create", onClick: runDialog, busy }}
        secondary={{ label: "Cancel", onClick: () => setDialog(null) }}
      >
        <Field label="Name" htmlFor="schedule-name">
          <Input
            id="schedule-name"
            height={36}
            value={draftName}
            maxLength={60}
            autoFocus
            placeholder="Client calls"
            onChange={(e) => setDraftName(e.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={dialog?.kind === "delete"}
        onClose={() => setDialog(null)}
        title="Delete this schedule?"
        subtitle="The hours go; the meetings do not."
        primary={{ label: "Delete schedule", onClick: runDialog, variant: "danger", busy }}
        secondary={{ label: "Keep it", onClick: () => setDialog(null) }}
      >
        <div className="flex items-start gap-[9px] text-[13px] leading-[1.55] text-ink-2">
          <Icon name="circle-info" weight="solid" size={13} className="mt-[2px] flex-none text-accent" />
          <span>
            {active.usedBy.length
              ? `${active.usedBy.length} meeting${active.usedBy.length === 1 ? "" : "s"} — ${active.usedBy.join(", ")} — will move to your default schedule.`
              : "No meetings use this schedule, so nothing else changes."}
          </span>
        </div>
      </Modal>
    </div>
  );
}
