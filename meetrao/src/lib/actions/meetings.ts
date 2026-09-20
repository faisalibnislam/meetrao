"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";
import { slugify } from "@/lib/username";

export type MeetingResult = { error?: string; id?: string };

export type MeetingInput = {
  id?: string;
  name: string;
  description: string;
  duration: number;
  buffer: number;
  /** null = the host's default schedule. */
  scheduleId?: string | null;
  notice: number;
  window: number;
  active: boolean;
};

const DURATIONS = [15, 30, 45, 60];
const BUFFERS = [0, 5, 10, 15];
const NOTICES = [60, 120, 240, 720, 1440];
const WINDOWS = [7, 14, 30, 60];

/** Server-side checks; the form's own validation is a convenience. */
function invalid(input: MeetingInput): string | null {
  if (!input.name.trim()) return "Give the meeting a name guests will recognise.";
  if (!DURATIONS.includes(input.duration)) return "Pick one of the offered durations.";
  if (!BUFFERS.includes(input.buffer)) return "Pick a buffer from the list.";
  if (!NOTICES.includes(input.notice)) return "Pick a minimum notice from the list.";
  if (!WINDOWS.includes(input.window)) return "Pick a booking window from the list.";
  return null;
}

export async function saveMeeting(input: MeetingInput): Promise<MeetingResult> {
  const problem = invalid(input);
  if (problem) return { error: problem };

  const session = await requireSession();

  const payload = {
    name: input.name.trim(),
    description: input.description.trim(),
    duration_minutes: input.duration,
    buffer_minutes: input.buffer,
    schedule_id: input.scheduleId ?? null,
    minimum_notice_minutes: input.notice,
    booking_window_days: input.window,
    is_active: input.active,
  };
  try {
    const convex = await convexServer();
    if (input.id) {
      await convex.mutation(api.meetingTypes.update, { id: input.id, ...payload });
      revalidatePath("/meetings");
      return { id: input.id };
    }
    const created = await convex.mutation(api.meetingTypes.create, {
      ...payload,
      slug: await uniqueSlug(session.userId, payload.name),
    });
    revalidatePath("/meetings");
    return { id: created.id };
  } catch (cause) {
    return { error: convexMessage(cause, "That meeting could not be saved.") };
  }

}

/** The switch in the table. Toggling is its own action so it needs no form. */
export async function setMeetingActive(id: string, active: boolean): Promise<MeetingResult> {
  const session = await requireSession();
  try {
    const convex = await convexServer();
    await convex.mutation(api.meetingTypes.update, { id, is_active: active });
    revalidatePath("/meetings");
    revalidatePath("/dashboard");
    return { id };
  } catch (cause) {
    return { error: convexMessage(cause, "That meeting could not be updated.") };
  }

}

async function uniqueSlug(userId: string, name: string): Promise<string> {
  const base = slugify(name);
  const convex = await convexServer();
  const mine = await convex.query(api.meetingTypes.listOwn, {});
  const taken = new Set(mine.map((m) => m.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;

}
