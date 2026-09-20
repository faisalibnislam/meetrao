import { createHash } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSlotBookable } from "@/lib/booking/slots";
import { formatDuration, formatLongDate, formatTime, formatTimeRange } from "@/lib/booking/time";
import { getBusy, getMeetingAvailability, getPublicHost, getPublicMeetings } from "@/lib/data/public-booking";
import { sendBookingNewToGuest, sendBookingNewToHost, type BookingMail } from "@/lib/email/send";
import { CalendarError, createBookingEvent } from "@/lib/google/calendar";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { convexServes } from "@/lib/backend";
import { convexAnonymous } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";
import { timezoneLabel } from "@/lib/timezones";
import type { Profile } from "@/lib/types";

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
  const { busy } = await getBusy(host.id, new Date(start.getTime() - DAY), new Date(start.getTime() + DAY));

  const guestTimezone = input.guestTimezone || host.timezone;

  const stillFree = isSlotBookable({
    start,
    guestTimezone,
    hostTimezone: host.timezone,
    availability,
    rules: meeting.rules,
    busy,
    now: new Date(),
  });

  if (!stillFree) {
    return NextResponse.json({ error: "slot-taken" }, { status: 409 });
  }

  const admin = supabaseAdmin();

  type CreatedRow = {
    reference: string;
    id: string;
    starts_at: string;
    ends_at: string;
    meeting_name: string;
    duration: number;
  };
  let row: CreatedRow;

  if (convexServes("publicBooking")) {
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
  } else {
    const { data, error } = await admin.rpc("create_booking", {
      p_username: input.username,
      p_slug: input.slug,
      p_starts_at: start.toISOString(),
      p_guest_name: input.guestName,
      p_guest_email: input.guestEmail,
      p_guest_note: input.guestNote ?? "",
      p_guest_timezone: guestTimezone,
      p_page_view_id: input.pageViewId ?? null,
    });

    if (error) {
      // MR409 is the function's own "this slot is gone" signal.
      const status = error.code === "MR409" ? 409 : error.code === "MR404" ? 404 : 500;
      return NextResponse.json({ error: status === 409 ? "slot-taken" : error.message }, { status });
    }

    row = (Array.isArray(data) ? data[0] : data) as CreatedRow;
  }

  const end = new Date(row.ends_at);

  /* The calendar write comes after the booking exists. If it fails the booking
     is still real — the host is told, rather than the guest losing a meeting
     they were told they had. */
  let meetUrl: string | null = null;
  let calendarWarning: string | null = null;

  try {
    const event = await createBookingEvent({
      userId: host.id,
      summary: `${row.meeting_name} — ${input.guestName}`,
      description: input.guestNote
        ? `Booked through Meetrao.\n\nNote from ${input.guestName}:\n${input.guestNote}`
        : "Booked through Meetrao.",
      start,
      end,
      timeZone: host.timezone,
      attendees: [{ email: input.guestEmail, name: input.guestName }],
    });

    meetUrl = event.meetUrl;
    if (convexServes("publicBooking")) {
      await convexAnonymous().mutation(api.bookings.attachGoogleEventByReference, {
        reference: row.reference,
        googleEventId: event.eventId,
        meetUrl: event.meetUrl,
      });
    } else {
      await admin
        .from("bookings")
        .update({ google_event_id: event.eventId, meet_url: event.meetUrl })
        .eq("id", row.id);
    }
  } catch (cause) {
    calendarWarning = cause instanceof CalendarError ? cause.kind : "api-unavailable";
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, username, email, notify_new_booking")
    .eq("id", host.id)
    .maybeSingle();

  const hostProfile = profile as Pick<Profile, "full_name" | "username" | "email" | "notify_new_booking"> | null;

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
