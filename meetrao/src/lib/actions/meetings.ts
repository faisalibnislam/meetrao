"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { supabaseServer } from "@/lib/supabase/server";
import { slugify } from "@/lib/username";

export type MeetingResult = { error?: string; id?: string };

export type MeetingInput = {
  id?: string;
  name: string;
  description: string;
  duration: number;
  buffer: number;
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
  const supabase = await supabaseServer();

  const payload = {
    name: input.name.trim(),
    description: input.description.trim(),
    duration_minutes: input.duration,
    buffer_minutes: input.buffer,
    minimum_notice_minutes: input.notice,
    booking_window_days: input.window,
    is_active: input.active,
  };

  if (input.id) {
    const { error } = await supabase
      .from("meeting_types")
      .update(payload)
      .eq("id", input.id)
      .eq("user_id", session.userId);
    if (error) return { error: error.message };

    revalidatePath("/meetings");
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("meeting_types")
    .insert({ ...payload, user_id: session.userId, slug: await uniqueSlug(session.userId, payload.name) })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/meetings");
  return { id: data.id as string };
}

/** The switch in the table. Toggling is its own action so it needs no form. */
export async function setMeetingActive(id: string, active: boolean): Promise<MeetingResult> {
  const session = await requireSession();
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("meeting_types")
    .update({ is_active: active })
    .eq("id", id)
    .eq("user_id", session.userId);

  if (error) return { error: error.message };

  revalidatePath("/meetings");
  revalidatePath("/dashboard");
  return { id };
}

async function uniqueSlug(userId: string, name: string): Promise<string> {
  const supabase = await supabaseServer();
  const base = slugify(name);

  const { data } = await supabase.from("meeting_types").select("slug").eq("user_id", userId);
  const taken = new Set((data ?? []).map((r) => r.slug as string));

  if (!taken.has(base)) return base;
  for (let n = 2; n < 200; n++) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}
