"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { convexMessage } from "@/lib/convex/error";

/** Convex throws; these actions return `{ error }` so the form can show it. */
async function viaConvex<T>(work: (c: Awaited<ReturnType<typeof convexServer>>) => Promise<T>): Promise<{ value?: T; error?: string }> {
  try {
    return { value: await work(await convexServer()) };
  } catch (e) {
    return { error: convexMessage(e) };
  }
}
import { TIMEZONES } from "@/lib/timezones";

/* ─────────────────────────────────────────────────────────────────────────────
   Availability, per named schedule.

   A host has one or more schedules ("Working hours", "Client calls", whatever
   they name them) and each meeting type points at one, or at none, which means
   the default. Migration 0010 has the shape and the reasoning.

   Two invariants live here rather than in the UI, because the UI is not the
   boundary: a host always has at least one schedule, and exactly one of them is
   the default. The partial unique index in 0010 enforces the second; these
   actions are what keep it from ever being violated in the first place.
   ───────────────────────────────────────────────────────────────────────────── */

export type SaveResult = { error?: string };
export type ScheduleResult = { error?: string; id?: string };

type Rule = { weekday: number; start_minute: number; end_minute: number };
/** A range on ONE date, which has no weekday of its own. */
type Rule2 = { start_minute: number; end_minute: number };

const MAX_NAME = 60;

function valid(rules: Rule[]): string | null {
  for (const r of rules) {
    if (r.weekday < 0 || r.weekday > 6) return "That day is not a day of the week.";
    if (r.start_minute < 0 || r.end_minute > 1440) return "Hours have to sit inside a single day.";
    if (r.end_minute <= r.start_minute) return "Each range has to end after it starts.";
  }

  // Overlapping ranges on one day would offer the same slot twice.
  for (let d = 0; d <= 6; d++) {
    const day = rules.filter((r) => r.weekday === d).sort((a, b) => a.start_minute - b.start_minute);
    for (let i = 1; i < day.length; i++) {
      if (day[i].start_minute < day[i - 1].end_minute) return "Two ranges on the same day overlap.";
    }
  }
  return null;
}

function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_NAME);
}

/** Postgres 23505 is a unique violation; here it can only be the name index. */
function nameTaken(message: string): boolean {
  return message.includes("availability_schedules_name_unique") || message.includes("duplicate key");
}

/**
 * The whole week for ONE schedule is replaced in one pass. A partial save is
 * not a state a host should ever be able to see.
 *
 * The timezone still belongs to the profile rather than to a schedule. A host
 * has one timezone; giving each schedule its own would let two schedules
 * disagree about when 09:00 is, which is a bug, not a feature.
 */
export async function saveAvailability(input: {
  scheduleId: string;
  timezone: string;
  rules: Rule[];
}): Promise<SaveResult> {
  const session = await requireSession();

  if (!TIMEZONES.includes(input.timezone as (typeof TIMEZONES)[number])) {
    return { error: "Pick a timezone from the list." };
  }

  const problem = valid(input.rules);
  if (problem) return { error: problem };

  const r = await viaConvex((c) =>
    c.mutation(api.availability.saveWeek, {
      scheduleId: input.scheduleId,
      timezone: input.timezone,
      rules: input.rules,
    }),
  );
  if (r.error) return { error: r.error };
  revalidatePath("/availability");
  revalidatePath("/dashboard");
  return {};
}

/** A new schedule starts Monday–Friday 09:00–17:00 rather than empty. */
export async function createSchedule(input: { name: string; copyFrom?: string }): Promise<ScheduleResult> {
  const session = await requireSession();
  const name = cleanName(input.name);
  if (!name) return { error: "Give the schedule a name." };

  const r = await viaConvex((c) =>
    c.mutation(api.availability.createSchedule, { name, makeDefault: false, copyFrom: input.copyFrom }),
  );
  if (r.error) return { error: r.error };
  revalidatePath("/availability");
  return { id: r.value!.id };
}

export async function renameSchedule(input: { id: string; name: string }): Promise<SaveResult> {
  const session = await requireSession();
  const name = cleanName(input.name);
  if (!name) return { error: "Give the schedule a name." };

  const r = await viaConvex((c) => c.mutation(api.availability.renameSchedule, { scheduleId: input.id, name }));
  if (r.error) return { error: r.error };
  revalidatePath("/availability");
  revalidatePath("/meetings");
  return {};
}

/**
 * Deleting is the one destructive action here, so it refuses two cases outright:
 * the last remaining schedule, and the default. A host with no schedule has no
 * bookable hours at all, and the meeting types that pointed at the deleted one
 * fall back to the default, which has to still exist for that to mean
 * anything. The foreign key does the reassignment (`on delete set null`), the
 * UI says how many meetings will move before asking.
 */
export async function deleteSchedule(input: { id: string }): Promise<SaveResult> {
  const session = await requireSession();

  const r = await viaConvex((c) => c.mutation(api.availability.deleteSchedule, { scheduleId: input.id }));
  if (r.error) return { error: r.error };
  revalidatePath("/availability");
  revalidatePath("/meetings");
  return {};
}

/**
 * Exactly one default. The index in 0010 makes two impossible, so the old one
 * is cleared before the new one is set rather than after. The other order
 * fails on the constraint.
 */
export async function setDefaultSchedule(input: { id: string }): Promise<SaveResult> {
  const session = await requireSession();

  const r = await viaConvex((c) => c.mutation(api.availability.setDefaultSchedule, { scheduleId: input.id }));
  if (r.error) return { error: r.error };
  revalidatePath("/availability");
  revalidatePath("/meetings");
  return {};
}

/* ── time off ─────────────────────────────────────────────────────────────── */

export type TimeOffResult = { error?: string; id?: string };

/**
 * Closes one day, or gives it different hours.
 *
 * Validated here as well as in Convex for the reason every other action in
 * this file is: the form's checks are a convenience, and this is the boundary.
 * An empty `ranges` is the "away all day" case and is the common one. The
 * screen sends it whenever the host does not choose custom hours.
 */
export async function saveTimeOff(input: {
  scheduleId: string;
  date: string;
  ranges: Rule2[];
  note?: string;
}): Promise<TimeOffResult> {
  await requireSession();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Pick a date." };
  for (const r of input.ranges) {
    if (r.start_minute < 0 || r.end_minute > 1440) return { error: "Hours have to sit inside a single day." };
    if (r.end_minute <= r.start_minute) return { error: "Each range has to end after it starts." };
  }
  if ((input.note ?? "").length > 80) return { error: "Keep the note under 80 characters." };

  const { value, error } = await viaConvex((c) =>
    c.mutation(api.availability.saveOverride, {
      scheduleId: input.scheduleId,
      date: input.date,
      ranges: input.ranges,
      note: input.note ?? "",
    }),
  );
  if (error) return { error };

  revalidatePath("/availability");
  return { id: value };
}

/** Puts a day back on the weekly pattern. */
export async function deleteTimeOff(id: string): Promise<SaveResult> {
  await requireSession();
  const { error } = await viaConvex((c) => c.mutation(api.availability.deleteOverride, { id }));
  if (error) return { error };
  revalidatePath("/availability");
  return {};
}
