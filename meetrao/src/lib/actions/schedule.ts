"use server";

import { revalidatePath } from "next/cache";
import { CalendarError, createBookingEvent } from "@/lib/google/calendar";
import { formatDuration, formatLongDate, formatTime } from "@/lib/booking/time";
import { timezoneLabel } from "@/lib/timezones";
import { zonedInstant } from "@/lib/booking/slots";
import { requireOnboardedSession } from "@/lib/data/session";
import { sendBookingNewToGuest, sendBookingNewToHost, type BookingMail } from "@/lib/email/send";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* ─────────────────────────────────────────────────────────────────────────────
   The other direction: the host picks the time and invites people.

   Everything else in the product runs guest-first — someone opens the link and
   books a slot the engine offered them. This is the inverse, and the rules are
   deliberately different:

     · The host's own availability does not apply. A host scheduling a meeting
       themselves has already decided they are free; refusing because it is
       Saturday would be the tool arguing with its owner.
     · A clash with an existing confirmed booking still refuses. That is not a
       preference, it is double-booking, and the exclusion constraint on
       `bookings` catches it whatever the app believes.
     · The first invitee is the guest of record, so the confirmation email, the
       .ics, the guest cancellation page and the admin console all keep working
       on a row shaped exactly as before.

   Inserted through the service role: `bookings` has no INSERT policy for
   `authenticated` — the guest door is `create_booking`, which is SECURITY
   DEFINER — and adding one would open a table that has stayed closed on
   purpose. requireOnboardedSession() is the gate, and host_id is taken from
   the session rather than from the request.
   ───────────────────────────────────────────────────────────────────────────── */

export type ScheduleResult = {
  error?: string;
  reference?: string;
  /** Set when the booking exists but Google would not take the event. */
  calendarWarning?: string;
};

export type ScheduleInput = {
  /** A meeting type to inherit name and duration from, or null for a one-off. */
  meetingTypeId: string | null;
  /** Used when meetingTypeId is null. */
  title: string;
  durationMinutes: number;
  /** Host-local wall clock. */
  date: string; // YYYY-MM-DD
  time: number; // minutes into the day
  invitees: { name: string; email: string }[];
  note: string;
};

const MAX_INVITEES = 20;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function normalise(invitees: { name: string; email: string }[]) {
  const seen = new Set<string>();
  const out: { name: string; email: string }[] = [];

  for (const raw of invitees) {
    const email = raw.email.trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL.test(email)) return { error: `${raw.email.trim()} is not an email address.` };
    // Case-insensitive, because Ada@x.com and ada@x.com are one person and two
    // invitations.
    if (seen.has(email)) continue;
    seen.add(email);
    out.push({ name: raw.name.trim(), email });
  }

  if (!out.length) return { error: "Invite at least one person." };
  if (out.length > MAX_INVITEES) return { error: `That is more than ${MAX_INVITEES} invitees.` };
  return { invitees: out };
}

export async function scheduleMeeting(input: ScheduleInput): Promise<ScheduleResult> {
  const { userId, profile } = await requireOnboardedSession();

  const cleaned = normalise(input.invitees);
  if (cleaned.error) return { error: cleaned.error };
  const invitees = cleaned.invitees!;

  const admin = supabaseAdmin();

  let name = input.title.trim();
  let duration = Math.round(input.durationMinutes);
  let meetingTypeId: string | null = null;

  if (input.meetingTypeId) {
    const { data: type } = await admin
      .from("meeting_types")
      .select("id, name, duration_minutes")
      .eq("id", input.meetingTypeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!type) return { error: "That meeting type is gone. Pick another." };
    name = type.name;
    duration = type.duration_minutes;
    meetingTypeId = type.id;
  }

  if (!name) return { error: "Give the meeting a name." };
  if (!Number.isFinite(duration) || duration < 5 || duration > 480) {
    return { error: "Duration has to be between 5 and 480 minutes." };
  }

  const [year, month, day] = input.date.split("-").map(Number);
  if (!year || !month || !day) return { error: "Pick a date." };
  if (!Number.isInteger(input.time) || input.time < 0 || input.time > 1439) return { error: "Pick a time." };

  const start = zonedInstant({ year, month, day }, input.time, profile.timezone);
  const end = new Date(start.getTime() + duration * 60_000);
  if (start.getTime() < Date.now()) return { error: "That time has already passed." };

  const guest = invitees[0];

  const { data: created, error } = await admin
    .from("bookings")
    .insert({
      host_id: userId,
      meeting_type_id: meetingTypeId,
      meeting_name: name,
      duration_minutes: duration,
      guest_name: guest.name || guest.email,
      guest_email: guest.email,
      guest_note: input.note.trim(),
      guest_timezone: profile.timezone,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      host_created: true,
    })
    .select("id, reference")
    .single();

  if (error) {
    // 23P01 is the exclusion constraint: something else already owns this slot.
    const clash = error.code === "23P01" || error.message.includes("bookings_no_overlap");
    return { error: clash ? "You already have a meeting then." : error.message };
  }

  if (invitees.length > 1) {
    await admin
      .from("booking_invitees")
      .insert(invitees.map((i) => ({ booking_id: created.id, name: i.name, email: i.email })));
  }

  /* The calendar write comes after the booking exists. If Google refuses, the
     meeting is still real and the host is told which part failed — rather than
     everyone losing an invitation that was already confirmed on screen. */
  let meetUrl = "";
  let calendarWarning: string | undefined;

  try {
    const event = await createBookingEvent({
      userId,
      summary: name,
      description: input.note.trim() ? `Scheduled through Meetrao.\n\n${input.note.trim()}` : "Scheduled through Meetrao.",
      start,
      end,
      timeZone: profile.timezone,
      attendees: invitees.map((i) => ({ email: i.email, name: i.name })),
    });
    meetUrl = event.meetUrl ?? "";
    await admin
      .from("bookings")
      .update({ google_event_id: event.eventId, meet_url: event.meetUrl })
      .eq("id", created.id);
  } catch (cause) {
    calendarWarning = cause instanceof CalendarError ? cause.kind : "api-unavailable";
  }

  const zone = profile.timezone;
  const base: Omit<BookingMail, "guestName" | "guestEmail"> = {
    bookingId: created.id,
    reference: created.reference,
    meetingName: name,
    guestNote: input.note.trim(),
    hostName: profile.full_name || profile.username,
    hostEmail: profile.email,
    startLong: formatLongDate(start, zone),
    startShort: `${formatLongDate(start, zone)} at ${formatTime(start, zone)}`,
    hostTimezoneLabel: timezoneLabel(zone),
    guestTimezoneLabel: timezoneLabel(zone),
    durationLabel: formatDuration(duration),
    meetUrl,
  };

  // One confirmation each. Every invitee is a guest of this meeting, so each
  // gets the guest email rather than one of them getting it and the rest
  // finding out from the calendar invitation.
  await Promise.all([
    sendBookingNewToHost({ ...base, guestName: guest.name || guest.email, guestEmail: guest.email }, profile),
    ...invitees.map((i) =>
      sendBookingNewToGuest({ ...base, guestName: i.name || i.email, guestEmail: i.email }),
    ),
  ]);

  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  return { reference: created.reference, calendarWarning };
}
