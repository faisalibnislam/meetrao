import { createHash } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSlotBookable } from "@/lib/booking/slots";
import { formatDuration, formatLongDate, formatTime, formatTimeRange } from "@/lib/booking/time";
import { getBusy, getMeetingAvailability, getMeetingOverrides, getPublicHost, getPublicMeetings } from "@/lib/data/public-booking";
import { sendBookingNewToGuest, sendBookingNewToHost, type BookingMail } from "@/lib/email/send";
import { createEventForBooking } from "@/lib/google/calendar";
import { convexAnonymous } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";
import { timezoneLabel } from "@/lib/timezones";

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
  username: z.string().min(1),
  slug: z.string().min(1),
  start: z.string().datetime(),
  guestName: z.string().trim().min(1, "Adam needs to know who he is meeting."),
  guestEmail: z.string().trim().email("Enter an email we can send the confirmation to."),
  guestNote: z.string().max(2000).optional().default(""),
  guestTimezone: z.string().optional(),
  pageViewId: z.string().uuid().optional(),
});

const DAY = 86_400_000;

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  }

  const input = parsed.data;
  const start = new Date(input.start);

  const host = await getPublicHost(input.username);
  if (!host) return NextResponse.json({ error: "Unknown host." }, { status: 404 });

  const meeting = (await getPublicMeetings(input.username)).find((m) => m.slug === input.slug);
  if (!meeting) return NextResponse.json({ error: "Unknown meeting." }, { status: 404 });

  const availability = await getMeetingAvailability(meeting.id);
  const overrides = await getMeetingOverrides(meeting.id);
  const { busy } = await getBusy(host.id, new Date(start.getTime() - DAY), new Date(start.getTime() + DAY));

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
      guestTimezone,
      pageViewId: input.pageViewId ?? null,
      callerKey,
    })) as CreatedRow;
  } catch (cause) {
    // These are create_booking's own refusals, carried across as messages.
    const message = convexMessage(cause, "That booking could not be made.");
    if (/slot taken|outside availability|minimum notice|booking window/i.test(message)) {
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
     is still real — the host is told, rather than the guest losing a meeting
     they were told they had. */
  let meetUrl: string | null = null;
  let calendarWarning: string | null = null;

  const event = await createEventForBooking(row.reference);
  if ("failure" in event) calendarWarning = event.failure;
  else meetUrl = event.meetUrl;

  /* Just enough of the host to address the confirmation email, keyed by the
     booking's own reference. */
  const hostProfile = await convexAnonymous().query(api.publicBooking.hostForBookingMail, {
    reference: row.reference,
  });

  const mail: BookingMail = {
    bookingId: row.id,
    reference: row.reference,
    meetingName: row.meeting_name,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestNote: input.guestNote ?? "",
    hostName: hostProfile?.full_name || host.fullName || host.username,
    hostEmail: hostProfile?.email ?? "",
    startLong: `${formatLongDate(start, host.timezone)} · ${formatTimeRange(start, end, host.timezone)}`,
    startShort: `${formatLongDate(start, guestTimezone)} at ${formatTime(start, guestTimezone)}`,
    hostTimezoneLabel: timezoneLabel(host.timezone),
    guestTimezoneLabel: timezoneLabel(guestTimezone),
    durationLabel: formatDuration(row.duration),
    meetUrl: meetUrl ?? "",
  };

  // Mail must never keep a guest waiting on a confirmation screen.
  await Promise.allSettled([
    hostProfile?.email ? sendBookingNewToHost(mail, hostProfile) : Promise.resolve(),
    sendBookingNewToGuest(mail),
  ]);

  return NextResponse.json({ reference: row.reference, calendarWarning });
}
