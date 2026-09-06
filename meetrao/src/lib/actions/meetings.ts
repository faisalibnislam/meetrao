"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MeetingFormInput = {
  name: string;
  description: string;
  durationMinutes: number;
  bufferMinutes: number;
  minimumNoticeMinutes: number;
  bookingWindowDays: number;
  isActive: boolean;
};

export type MeetingResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; message: string };

const DURATIONS = new Set([15, 30, 45, 60]);
const BUFFERS = new Set([0, 5, 10, 15]);
const NOTICES = new Set([60, 120, 240, 720, 1440]);
const WINDOWS = new Set([7, 14, 30, 60]);

/** Internal: a "use server" module may only export async functions. */
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
  return base || "meeting";
}

function validate(input: MeetingFormInput): string | null {
  if (!input.name.trim()) {
    return "Give the meeting a name guests will recognise.";
  }
  if (input.name.trim().length > 120) return "That name is too long.";
  if (!DURATIONS.has(input.durationMinutes)) return "Pick a duration.";
  if (!BUFFERS.has(input.bufferMinutes)) return "Pick a buffer.";
  if (!NOTICES.has(input.minimumNoticeMinutes)) return "Pick a minimum notice.";
  if (!WINDOWS.has(input.bookingWindowDays)) return "Pick a booking window.";
  return null;
}

/** Finds a slug free within this host's meetings, ignoring `exceptId`. */
async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
  exceptId?: string,
): Promise<string> {
  const base = slugify(name);

  const { data } = await supabase
    .from("meeting_types")
    .select("id, slug")
    .eq("user_id", userId);

  const taken = new Set(
    (data ?? []).filter((row) => row.id !== exceptId).map((row) => row.slug),
  );

  if (!taken.has(base)) return base;
  for (let n = 2; n < 500; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function createMeetingType(
  input: MeetingFormInput,
): Promise<MeetingResult> {
  const problem = validate(input);
  if (problem) return { ok: false, message: problem };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are signed out." };

  const slug = await uniqueSlug(supabase, user.id, input.name);

  const { data, error } = await supabase
    .from("meeting_types")
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      description: input.description.trim(),
      slug,
      duration_minutes: input.durationMinutes,
      buffer_minutes: input.bufferMinutes,
      minimum_notice_minutes: input.minimumNoticeMinutes,
      booking_window_days: input.bookingWindowDays,
      is_active: input.isActive,
    })
    .select("id, slug")
    .single();

  if (error || !data) {
    return { ok: false, message: "Could not create that meeting." };
  }

  refresh();
  return { ok: true, id: data.id, slug: data.slug };
}

export async function updateMeetingType(
  id: string,
  input: MeetingFormInput,
): Promise<MeetingResult> {
  const problem = validate(input);
  if (problem) return { ok: false, message: problem };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are signed out." };

  const slug = await uniqueSlug(supabase, user.id, input.name, id);

  // RLS scopes this to the caller's own rows; the explicit user_id filter is
  // belt and braces.
  const { data, error } = await supabase
    .from("meeting_types")
    .update({
      name: input.name.trim(),
      description: input.description.trim(),
      slug,
      duration_minutes: input.durationMinutes,
      buffer_minutes: input.bufferMinutes,
      minimum_notice_minutes: input.minimumNoticeMinutes,
      booking_window_days: input.bookingWindowDays,
      is_active: input.isActive,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, slug")
    .single();

  if (error || !data) return { ok: false, message: "Could not save that meeting." };

  refresh();
  return { ok: true, id: data.id, slug: data.slug };
}

export async function setMeetingTypeActive(
  id: string,
  isActive: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are signed out." };

  const { error } = await supabase
    .from("meeting_types")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, message: "Could not update that meeting." };

  refresh();
  return { ok: true };
}
