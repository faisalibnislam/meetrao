"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";
import { slugify } from "@/lib/username";
import { normaliseSlug, slugProblem, uniqueSlug as freeSlug } from "@/convex/lib/meetingSlugs";
import type { BookingQuestion } from "@/lib/types";
import { isLocationKind } from "@/lib/locations";
import { activeContext } from "@/lib/data/context";

export type MeetingResult = { error?: string; id?: string };

export type MeetingInput = {
  id?: string;
  name: string;
  /**
   * The last segment of the meeting's address. Absent or empty on a new
   * meeting means "build one from the name"; on an existing one, absent
   * means "leave it where it is". Moving it keeps the old link working:
   * Convex remembers it and the public page redirects (convex/lib/meetingSlugs.ts).
   */
  slug?: string;
  description: string;
  duration: number;
  buffer: number;
  /** null = the host's default schedule. */
  scheduleId?: string | null;
  notice: number;
  window: number;
  active: boolean;
  /** What the guest is asked besides name, email and the note. */
  questions?: BookingQuestion[];
  /** "google_meet" · "phone" · "in_person" · "custom". */
  location?: string;
  locationDetail?: string;
  /** 1 is one-to-one; above that, several guests share each slot. */
  capacity?: number;
};

/** The design's number, and a kindness: a booking form asking eight questions
    is one guests abandon. Convex enforces the same cap. */
const MAX_QUESTIONS = 5;

/* A range rather than the four presets. The editor offers 15, 30, 45 and 60
   and a typed custom length; Convex refuses anything outside the same 5 to
   480 whole minutes, this only says so before the round trip. */
const MIN_DURATION = 5;
const MAX_DURATION = 480;
const BUFFERS = [0, 5, 10, 15];
const NOTICES = [60, 120, 240, 720, 1440];
const WINDOWS = [7, 14, 30, 60];

/** Server-side checks; the form's own validation is a convenience. */
function invalid(input: MeetingInput): string | null {
  if (!input.name.trim()) return "Give the meeting a name guests will recognise.";
  if (!Number.isInteger(input.duration) || input.duration < MIN_DURATION || input.duration > MAX_DURATION)
    return `A meeting lasts a whole number of minutes, ${MIN_DURATION} to ${MAX_DURATION}.`;
  if (input.slug && slugProblem(input.slug)) return slugProblem(input.slug);
  if (!BUFFERS.includes(input.buffer)) return "Pick a buffer from the list.";
  if (!NOTICES.includes(input.notice)) return "Pick a minimum notice from the list.";
  if (!WINDOWS.includes(input.window)) return "Pick a booking window from the list.";

  const questions = (input.questions ?? []).filter((q) => q.label.trim());
  if (questions.length > MAX_QUESTIONS) return `A meeting can ask at most ${MAX_QUESTIONS} questions.`;
  for (const q of questions) {
    if (q.label.trim().length > 120) return "Keep each question under 120 characters.";
  }
  if (new Set(questions.map((q) => q.id)).size !== questions.length) return "Two questions share an id.";

  const capacity = input.capacity ?? 1;
  if (!Number.isInteger(capacity) || capacity < 1) return "Seats must be a whole number, 1 or more.";
  if (capacity > 100) return "A meeting can hold at most 100 guests.";

  if (input.location && !isLocationKind(input.location)) return "Pick one of the offered locations.";
  if ((input.locationDetail ?? "").length > 200) return "Keep the location under 200 characters.";
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
    capacity: input.capacity ?? 1,
    location: input.location ?? "google_meet",
    location_detail: (input.locationDetail ?? "").trim(),
    questions: (input.questions ?? [])
      .filter((q) => q.label.trim())
      .map((q) => ({ id: q.id, label: q.label.trim(), kind: q.kind, required: q.required })),
  };
  try {
    const convex = await convexServer();
    const slug = input.slug ? normaliseSlug(input.slug) : "";
    if (input.id) {
      await convex.mutation(api.meetingTypes.update, { id: input.id, ...payload, ...(slug ? { slug } : {}) });
      revalidatePath("/meetings");
      return { id: input.id };
    }
    /* Filed under whatever company the switcher is on, so a meeting made
       while working in Acme appears on Acme's domain and not on anybody's
       personal page. Convex re-checks the membership; this only decides which
       of the caller's own contexts was meant. */
    const context = await activeContext();
    const created = await convex.mutation(api.meetingTypes.create, {
      ...payload,
      company_id: context.companyId,
      slug: slug || (await uniqueSlug(session.userId, payload.name)),
    });
    revalidatePath("/meetings");
    return { id: created.id };
  } catch (cause) {
    return { error: convexMessage(cause, "That meeting could not be saved.") };
  }

}

/** The switch in the table. Toggling is its own action so it needs no form. */
export async function setMeetingActive(id: string, active: boolean): Promise<MeetingResult> {
  await requireSession();
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

/**
 * Delete a meeting.
 *
 * BOOKINGS ALREADY MADE SURVIVE. convex/meetingTypes.ts nulls their
 * `meeting_type_id` rather than deleting them: a booking is a record that two
 * people agreed on a time, and the host changing their mind about which link
 * it came from does not unmake that. Nobody is cancelled and no guest is
 * told, which is also why the dialog has to say so.
 */
export async function deleteMeeting(id: string): Promise<MeetingResult> {
  await requireSession();
  try {
    const convex = await convexServer();
    await convex.mutation(api.meetingTypes.remove, { id });
    revalidatePath("/meetings");
    revalidatePath("/dashboard");
    return { id };
  } catch (cause) {
    return { error: convexMessage(cause, "That meeting could not be deleted.") };
  }
}

/* Free against the host's other meetings' OLD links as well as their current
   ones. Picking a slug that one of them used to have would be refused by
   Convex, which protects the old link from opening a different meeting. */
async function uniqueSlug(userId: string, name: string): Promise<string> {
  void userId; // scoped by the caller's own identity inside listOwn
  const convex = await convexServer();
  const mine = await convex.query(api.meetingTypes.listOwn, {});
  return freeSlug(slugify(name), mine);
}
