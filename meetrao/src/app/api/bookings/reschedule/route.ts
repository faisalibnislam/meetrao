import { createHash } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSlotBookable } from "@/lib/booking/slots";
import { getBusy, getMeetingAvailability, getPublicHost, getPublicMeetings } from "@/lib/data/public-booking";
import { getBookingByReference } from "@/lib/data/guest-booking";
import { rescheduleMail, type MailableBooking } from "@/lib/email/booking-mail";
import { sendRescheduled } from "@/lib/email/send";
import { updateEventForBooking } from "@/lib/google/calendar";
import { convexAnonymous } from "@/lib/convex/server";
import { convexMessage } from "@/lib/convex/error";
import { api } from "@/convex/_generated/api";

/* ─────────────────────────────────────────────────────────────────────────────
   Moving a booking. Public: the guest has no account, only their reference.

   The same two independent guards the creation route carries, for the same
   reason — the slot engine re-run here against fresh availability and busy
   periods, and Convex re-checking inside its own serializable mutation. The
   only difference is that a booking may not collide with the slot it is
   currently sitting in, which `ignoreBookingId` handles one layer down.

   What this route does NOT do is cancel and rebook. The booking keeps its id,
   its reference and its calendar event: a guest who moved a meeting did not
   ask for a cancellation notice, and recreating the event would mint a new
   Meet link that contradicts every copy of the old one.
   ───────────────────────────────────────────────────────────────────────────── */

const Body = z.object({
  reference: z.string().trim().min(1),
  start: z.string().datetime(),
  guestTimezone: z.string().optional(),
});

const DAY = 86_400_000;

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  }

  const input = parsed.data;
  const start = new Date(input.start);

  const booking = await getBookingByReference(input.reference);
  if (!booking) return NextResponse.json({ error: "Unknown booking." }, { status: 404 });
  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "This meeting has been cancelled." }, { status: 409 });
  }
  if (!booking.meetingSlug) {
    return NextResponse.json({ error: "This meeting can no longer be moved online." }, { status: 409 });
  }

  const host = await getPublicHost(booking.hostUsername);
  if (!host) return NextResponse.json({ error: "Unknown host." }, { status: 404 });

  const meeting = (await getPublicMeetings(booking.hostUsername)).find((m) => m.slug === booking.meetingSlug);
  if (!meeting) return NextResponse.json({ error: "This meeting can no longer be moved online." }, { status: 409 });

  const availability = await getMeetingAvailability(meeting.id);
  const { busy } = await getBusy(host.id, new Date(start.getTime() - DAY), new Date(start.getTime() + DAY));

  const guestTimezone = input.guestTimezone || booking.guestTimezone || host.timezone;

  /* The booking's own slot is busy with itself. Dropping it from `busy` is
     what lets a guest move a 30-minute meeting 15 minutes later rather than
     being told their own meeting is in the way. Convex applies the same rule
     through `ignoreBookingId`. */
  const ownStart = new Date(booking.startsAt).getTime();
  const ownEnd = new Date(booking.endsAt).getTime();
  const others = busy.filter((b) => !(b.start.getTime() === ownStart && b.end.getTime() === ownEnd));

  const free = isSlotBookable({
    start,
    guestTimezone,
    hostTimezone: host.timezone,
    availability,
    rules: meeting.rules,
    busy: others,
    now: new Date(),
  });
  if (!free) return NextResponse.json({ error: "slot-taken" }, { status: 409 });

  type MovedRow = { reference: string; id: string; starts_at: string; ends_at: string; old_starts_at: string };
  let row: MovedRow;

  try {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const callerKey = forwarded
      ? createHash("sha256").update(`${forwarded}:${booking.hostUsername}`).digest("hex").slice(0, 32)
      : undefined;

    row = (await convexAnonymous().mutation(api.publicBooking.rescheduleByReference, {
      reference: booking.reference,
      startsAt: start.getTime(),
      callerKey,
    })) as MovedRow;
  } catch (cause) {
    const message = convexMessage(cause, "That meeting could not be moved.");
    if (/slot taken|outside availability|minimum notice|booking window|already at that time/i.test(message)) {
      return NextResponse.json({ error: "slot-taken" }, { status: 409 });
    }
    if (/unknown booking|unknown host/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (/too many|try again shortly|moved several times/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 429 });
    }
    if (/cancelled|no longer be moved/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }

  /* The calendar write comes after the move, exactly as creation's comes after
     the insert: if Google refuses, the meeting has still moved and the guest
     is not sent back to a time nobody holds any more. */
  let calendarWarning: string | null = null;
  const event = await updateEventForBooking(row.reference);
  if ("failure" in event) calendarWarning = event.failure;

  const hostProfile = await convexAnonymous().query(api.publicBooking.hostForRescheduleMail, {
    reference: row.reference,
  });

  if (hostProfile) {
    const moved: MailableBooking = {
      id: row.id,
      reference: row.reference,
      meeting_name: booking.meetingName,
      duration_minutes: booking.durationMinutes,
      guest_name: booking.guestName,
      guest_email: booking.guestEmail,
      guest_note: booking.guestNote,
      guest_timezone: guestTimezone,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      meet_url: "meetUrl" in event ? event.meetUrl : booking.meetUrl,
    };

    const mail = rescheduleMail(moved, hostProfile, "guest", row.old_starts_at);
    // Mail must never keep a guest waiting on a confirmation screen.
    await Promise.allSettled([
      hostProfile.email ? sendRescheduled(mail, "host", hostProfile) : Promise.resolve(),
      sendRescheduled(mail, "guest", null),
    ]);
  }

  return NextResponse.json({ reference: row.reference, calendarWarning });
}
