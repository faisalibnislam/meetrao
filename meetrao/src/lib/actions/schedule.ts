"use server";

import { revalidatePath } from "next/cache";
import { createEventForBooking } from "@/lib/google/calendar";
import { formatDuration, formatLongDate, formatTime } from "@/lib/booking/time";
import { timezoneLabel } from "@/lib/timezones";
import { zonedInstant } from "@/lib/booking/slots";
import { whereText } from "@/lib/locations";
import { requireOnboardedSession } from "@/lib/data/session";
import { sendBookingNewToGuest, sendBookingNewToHost, type BookingMail } from "@/lib/email/send";
import { convexServer } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";

/* ─────────────────────────────────────────────────────────────────────────────
   The other direction: the host picks the time and invites people.

   Everything else in the product runs guest-first, someone opens the link and
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
   `authenticated` (the guest door is `create_booking`, which is SECURITY
   DEFINER) and adding one would open a table that has stayed closed on
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

  let name = input.title.trim();
  let duration = Math.round(input.durationMinutes);
  let meetingTypeId: string | null = null;

  if (input.meetingTypeId) {
    const type = await (await convexServer()).query(api.meetingTypes.getOwn, {
      id: input.meetingTypeId,
    });
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

  let created: { id: string; reference: string };
  try {
    const convex = await convexServer();
    // One mutation writes the booking AND its invitees, so a clash cannot
    // leave a booking with half its guests attached.
    const row = await convex.mutation(api.bookings.createAsHost, {
      meetingTypeId,
      meetingName: name,
      durationMinutes: duration,
      guestName: guest.name || guest.email,
      guestEmail: guest.email,
      guestNote: input.note.trim(),
      startsAt: start.getTime(),
      bufferMinutes: 0,
      invitees: invitees.slice(1).map((i) => ({ name: i.name, email: i.email })),
    });
    created = { id: row.id, reference: row.reference };
  } catch (cause) {
    const message = convexMessage(cause, "That meeting could not be scheduled.");
    // "slot taken" is this path's equivalent of the exclusion constraint.
    return { error: /slot taken/i.test(message) ? "You already have a meeting then." : message };
  }

  /* The calendar write comes after the booking exists. If Google refuses, the
     meeting is still real and the host is told which part failed, rather than
     everyone losing an invitation that was already confirmed on screen. */
  let meetUrl = "";
  let calendarWarning: string | undefined;

  const event = await createEventForBooking(created.reference);
  if ("failure" in event) calendarWarning = event.failure;
  else meetUrl = event.meetUrl ?? "";

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
    // A meeting the host schedules themselves is a Meet, as it always was.
    where: whereText("google_meet", "", meetUrl || null),
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
