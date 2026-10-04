import { createHash } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSlotBookable } from "@/lib/booking/slots";
import { formatDuration, formatLongDate, formatTime, formatTimeRange } from "@/lib/booking/time";
import { getBusy, getMeetingAvailability, getMeetingOverrides, getPublicHost, getPublicMeeting } from "@/lib/data/public-booking";
import { noteWithAnswers } from "@/lib/email/booking-mail";
import { sendBookingNewToGuest, sendBookingNewToHost, type BookingMail } from "@/lib/email/send";
import { createEventForBooking } from "@/lib/google/calendar";
import { convexAnonymous } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";
import { timezoneLabel } from "@/lib/timezones";
import { whereText } from "@/lib/locations";
import { getPublicTeam } from "@/lib/data/team-booking";

/* ─────────────────────────────────────────────────────────────────────────────
   Booking creation. Public: the guest has no account.

   Two independent guards against double-booking, because this is the one place
   a race costs someone a meeting:

     1. The slot engine is re-run here against fresh availability and fresh busy
        periods, so a slot that went while the guest was filling in the form is
        caught before anything is written.
     2. `create_booking` re-checks inside its own transaction and the database
        carries an exclusion constraint, so two simultaneous submissions cannot
        both succeed whatever this code does.

   Either one returns 409, which the UI renders as "That time is no longer
   available … Nothing has been scheduled."
   ───────────────────────────────────────────────────────────────────────────── */

const Body = z.object({
  /** Present when the link is a team's; the host is chosen by the rotation. */
  team: z.string().min(1).optional(),
  username: z.string().min(1),
  slug: z.string().min(1),
  start: z.string().datetime(),
  guestName: z.string().trim().min(1, "Adam needs to know who he is meeting."),
  guestEmail: z.string().trim().email("Enter an email we can send the confirmation to."),
  guestNote: z.string().max(2000).optional().default(""),
  guestTimezone: z.string().optional(),
  /* Keyed by question id. The labels are read from the meeting inside Convex,
     so a request cannot invent a question it was never asked. */
  answers: z.array(z.object({ id: z.string().min(1), value: z.string().max(2000) })).max(5).optional(),
  pageViewId: z.string().uuid().optional(),
});

const DAY = 86_400_000;

/**
 * A booking on a team link.
 *
 * The rotation picks the host inside the mutation, so there is no host to
 * validate here and no second guard to run: the engine's re-check would need
 * a member, and choosing one in this layer is exactly the decision that has
 * to happen atomically with the insert. "Nobody free" comes back as the same
 * refusal a taken slot gives, and reaches the guest as the screen they
 * already know.
 */
async function bookTeam(request: NextRequest, input: z.infer<typeof Body>, start: Date) {
  const team = await getPublicTeam(input.team as string);
  const meeting = team?.meetings.find((m) => m.slug === input.slug);
  if (!team || !meeting) return NextResponse.json({ error: "Unknown meeting." }, { status: 404 });

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const callerKey = forwarded
    ? createHash("sha256").update(`${forwarded}:${team.slug}`).digest("hex").slice(0, 32)
    : undefined;

  type TeamRow = {
    reference: string;
    id: string;
    starts_at: string;
    ends_at: string;
    meeting_name: string;
    duration: number;
    host_id: string;
    answers: { label: string; value: string }[];
  };

  let row: TeamRow;
  try {
    row = (await convexAnonymous().mutation(api.publicBooking.createTeamBooking, {
      teamSlug: team.slug,
      slug: meeting.slug,
      startsAt: start.getTime(),
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestNote: input.guestNote ?? "",
      guestTimezone: input.guestTimezone ?? null,
      answers: input.answers ?? [],
      callerKey,
    })) as TeamRow;
  } catch (cause) {
    const message = convexMessage(cause, "That booking could not be made.");
    if (/slot taken|no seats left|outside availability|minimum notice|booking window/i.test(message)) {
      return NextResponse.json({ error: "slot-taken" }, { status: 409 });
    }
    if (/unknown host|unknown meeting/i.test(message)) return NextResponse.json({ error: message }, { status: 404 });
    if (/too many|try again shortly/i.test(message)) return NextResponse.json({ error: message }, { status: 429 });
    return NextResponse.json({ error: message }, { status: 500 });
  }

  let meetUrl: string | null = null;
  let calendarWarning: string | null = null;
  /* The assigned member is the host of this booking, so the confirmation is
     addressed from them by name. A guest who booked "the sales team" still
     needs to know who is turning up. Fetched alongside the calendar event
     rather than after it: the two are independent and the event is the slow
     one. */
  const [event, hostProfile] = await Promise.all([
    createEventForBooking(row.reference),
    convexAnonymous().query(api.publicBooking.hostForBookingMail, { reference: row.reference }),
  ]);
  if ("failure" in event) calendarWarning = event.failure;
  else meetUrl = event.meetUrl;
  const end = new Date(row.ends_at);
  const guestTimezone = input.guestTimezone || team.members[0]?.timezone || "UTC";
  const hostTimezone = team.members.find((m) => m.id === row.host_id)?.timezone ?? guestTimezone;

  const mail: BookingMail = {
    bookingId: row.id,
    reference: row.reference,
    meetingName: row.meeting_name,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestNote: noteWithAnswers(input.guestNote ?? "", row.answers ?? []),
    hostName: hostProfile?.full_name || team.name,
    hostEmail: hostProfile?.email ?? "",
    startLong: `${formatLongDate(start, hostTimezone)} · ${formatTimeRange(start, end, hostTimezone)}`,
    startShort: `${formatLongDate(start, guestTimezone)} at ${formatTime(start, guestTimezone)}`,
    hostTimezoneLabel: timezoneLabel(hostTimezone),
    guestTimezoneLabel: timezoneLabel(guestTimezone),
    durationLabel: formatDuration(row.duration),
    meetUrl: meetUrl ?? "",
    where: whereText(meeting.location, meeting.locationDetail, meetUrl),
  };

  await Promise.allSettled([
    hostProfile?.email ? sendBookingNewToHost(mail, hostProfile) : Promise.resolve(),
    sendBookingNewToGuest(mail),
  ]);

  return NextResponse.json({ reference: row.reference, calendarWarning });
}

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  }

  const input = parsed.data;
  const start = new Date(input.start);

  if (input.team) return bookTeam(request, input, start);

  /* Two phases, not a chain: this is the wait between a guest pressing
     Confirm and seeing that it worked, and every read here was its own
     sequential round trip. Nothing in a phase depends on anything else in
     it. The re-check of the slot below is unchanged, and still runs on
     fresh reads made for this request. */
  const [host, meeting] = await Promise.all([
    getPublicHost(input.username),
    getPublicMeeting(input.username, input.slug),
  ]);
  if (!host) return NextResponse.json({ error: "Unknown host." }, { status: 404 });
  if (!meeting) return NextResponse.json({ error: "Unknown meeting." }, { status: 404 });

  const [availability, overrides, { busy }] = await Promise.all([
    getMeetingAvailability(meeting.id),
    getMeetingOverrides(meeting.id),
    getBusy(
      host.id,
      new Date(start.getTime() - DAY),
      new Date(start.getTime() + DAY),
      meeting.capacity > 1 ? meeting.id : undefined,
    ),
  ]);

  const guestTimezone = input.guestTimezone || host.timezone;

  const stillFree = isSlotBookable({
    start,
    guestTimezone,
    hostTimezone: host.timezone,
    availability,
    overrides,
    rules: meeting.rules,
    busy,
    now: new Date(),
  });

  if (!stillFree) {
    return NextResponse.json({ error: "slot-taken" }, { status: 409 });
  }

  type CreatedRow = {
    reference: string;
    id: string;
    starts_at: string;
    ends_at: string;
    meeting_name: string;
    duration: number;
    answers: { label: string; value: string }[];
  };
  let row: CreatedRow;

  try {
    // The rate limiter cannot see the caller's address from inside Convex, so
    // the coarse key is derived here, where the request is. Hashed rather
    // than stored raw: a rate-limit row should not become an IP log.
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const callerKey = forwarded
      ? createHash("sha256").update(`${forwarded}:${input.username}`).digest("hex").slice(0, 32)
      : undefined;

    row = (await convexAnonymous().mutation(api.publicBooking.createBooking, {
      username: input.username,
      slug: input.slug,
      startsAt: start.getTime(),
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestNote: input.guestNote ?? "",
      answers: input.answers ?? [],
      guestTimezone,
      pageViewId: input.pageViewId ?? null,
      callerKey,
    })) as CreatedRow;
  } catch (cause) {
    // These are create_booking's own refusals, carried across as messages.
    const message = convexMessage(cause, "That booking could not be made.");
    if (/slot taken|no seats left|outside availability|minimum notice|booking window/i.test(message)) {
      return NextResponse.json({ error: "slot-taken" }, { status: 409 });
    }
    if (/unknown host|unknown meeting/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (/too many|try again shortly/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const end = new Date(row.ends_at);

  /* The calendar write comes after the booking exists. If it fails the booking
     is still real. The host is told, rather than the guest losing a meeting
     they were told they had. */
  let meetUrl: string | null = null;
  let calendarWarning: string | null = null;

  /* The calendar event and the host's mail details are independent, and the
     event is the slow one (it goes out to Google), so neither waits for the
     other. The host's details are just enough to address the confirmation
     email, keyed by the booking's own reference. */
  const [event, hostProfile] = await Promise.all([
    createEventForBooking(row.reference),
    convexAnonymous().query(api.publicBooking.hostForBookingMail, { reference: row.reference }),
  ]);
  if ("failure" in event) calendarWarning = event.failure;
  else meetUrl = event.meetUrl;

  const mail: BookingMail = {
    bookingId: row.id,
    reference: row.reference,
    meetingName: row.meeting_name,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestNote: noteWithAnswers(input.guestNote ?? "", row.answers ?? []),
    hostName: hostProfile?.full_name || host.fullName || host.username,
    hostEmail: hostProfile?.email ?? "",
    startLong: `${formatLongDate(start, host.timezone)} · ${formatTimeRange(start, end, host.timezone)}`,
    startShort: `${formatLongDate(start, guestTimezone)} at ${formatTime(start, guestTimezone)}`,
    hostTimezoneLabel: timezoneLabel(host.timezone),
    guestTimezoneLabel: timezoneLabel(guestTimezone),
    durationLabel: formatDuration(row.duration),
    meetUrl: meetUrl ?? "",
    where: whereText(meeting.location, meeting.locationDetail, meetUrl),
  };

  // Mail must never keep a guest waiting on a confirmation screen.
  await Promise.allSettled([
    hostProfile?.email ? sendBookingNewToHost(mail, hostProfile) : Promise.resolve(),
    sendBookingNewToGuest(mail),
  ]);

  return NextResponse.json({ reference: row.reference, calendarWarning });
}
