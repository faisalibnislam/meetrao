import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { hasServiceRole } from "@/lib/env";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchBusyIntervals,
} from "@/lib/google/calendar";
import {
  sendBookingCancelled,
  sendBookingNewGuest,
  sendBookingNewHost,
  type BookingEmailData,
  type HostEmailData,
} from "@/lib/email/messages";
import { bookingWindow, isSlotBookable, type SlotRules } from "./slots";
import type { Interval } from "./time";
import { formatLongDate, formatTimeRange } from "./time";

/* ── Types ───────────────────────────────────────────────────────────────── */

export type PublicHost = {
  id: string;
  username: string;
  full_name: string;
  job_title: string;
  timezone: string;
  avatar_url: string | null;
};

export type PublicMeetingType = {
  id: string;
  name: string;
  description: string;
  slug: string;
  duration_minutes: number;
  buffer_minutes: number;
  minimum_notice_minutes: number;
  booking_window_days: number;
  location: string;
};

export type BookingFailure =
  | "not_found"
  | "invalid_input"
  | "invalid_slot"
  | "slot_taken"
  | "error";

export type CreateBookingResult =
  | { ok: true; reference: string; meetUrl: string | null; calendarSynced: boolean }
  | { ok: false; code: BookingFailure; message: string };

/** Postgres exclusion_violation — raised by `bookings_no_overlap`. */
const EXCLUSION_VIOLATION = "23P01";

/* ── Public lookups ──────────────────────────────────────────────────────── */

export async function getPublicHost(username: string): Promise<PublicHost | null> {
  const supabase = createPublicClient();
  const { data } = await supabase.rpc("get_public_host", {
    p_username: username,
  });
  return (data?.[0] as PublicHost | undefined) ?? null;
}

export async function getPublicMeetingTypes(
  username: string,
): Promise<PublicMeetingType[]> {
  const supabase = createPublicClient();
  const { data } = await supabase.rpc("get_public_meeting_types", {
    p_username: username,
  });
  return (data as PublicMeetingType[] | null) ?? [];
}

/* ── Slot rules ──────────────────────────────────────────────────────────── */

/**
 * Assembles everything the slot engine needs for one host + meeting type:
 * their weekly hours, the meeting's own rules, and both sources of busy time
 * (bookings already in Meetrao, and whatever Google Calendar reports).
 */
export async function buildSlotRules(
  host: PublicHost,
  meetingType: PublicMeetingType,
  now: Date = new Date(),
): Promise<SlotRules> {
  const supabase = createPublicClient();

  const base: Omit<SlotRules, "rules" | "busy"> = {
    hostTimezone: host.timezone,
    durationMinutes: meetingType.duration_minutes,
    bufferMinutes: meetingType.buffer_minutes,
    minimumNoticeMinutes: meetingType.minimum_notice_minutes,
    bookingWindowDays: meetingType.booking_window_days,
    now,
  };

  const window = bookingWindow({ ...base, rules: [], busy: [] });

  const [availability, ownBookings, googleBusy] = await Promise.all([
    supabase.rpc("get_public_availability", { p_user_id: host.id }),
    supabase.rpc("get_busy_intervals", {
      p_user_id: host.id,
      p_from: now.toISOString(),
      p_to: window.end.toISOString(),
    }),
    // A missing or broken calendar connection must not take the booking page
    // down — the host simply is not conflict-checked, which the app warns about.
    fetchBusyIntervals(host.id, now, window.end).catch(() => [] as Interval[]),
  ]);

  const busy: Interval[] = [
    ...((ownBookings.data ?? []) as Array<{ starts_at: string; ends_at: string }>).map(
      (b) => ({ start: new Date(b.starts_at), end: new Date(b.ends_at) }),
    ),
    ...googleBusy,
  ];

  return {
    ...base,
    rules: (availability.data ?? []) as SlotRules["rules"],
    busy,
  };
}

/* ── Creating a booking ──────────────────────────────────────────────────── */

function looksLikeEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export async function createBooking(input: {
  username: string;
  slug?: string | null;
  startsAt: Date;
  guestName: string;
  guestEmail: string;
  guestNote?: string;
  guestTimezone?: string | null;
}): Promise<CreateBookingResult> {
  const guestName = input.guestName.trim();
  const guestEmail = input.guestEmail.trim().toLowerCase();

  if (!guestName) {
    return { ok: false, code: "invalid_input", message: "Enter your name." };
  }
  if (!looksLikeEmail(guestEmail)) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Enter an email we can send the confirmation to.",
    };
  }
  if (Number.isNaN(input.startsAt.getTime())) {
    return { ok: false, code: "invalid_input", message: "Pick a time." };
  }

  // Writing a booking is the one guest-facing path that needs the service
  // role. Fail with a clear message rather than an opaque 500.
  if (!hasServiceRole()) {
    return {
      ok: false,
      code: "error",
      message:
        "Bookings are not configured on this deployment yet. Set SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const host = await getPublicHost(input.username);
  if (!host) {
    return { ok: false, code: "not_found", message: "That booking page does not exist." };
  }

  const types = await getPublicMeetingTypes(input.username);
  const meetingType = input.slug
    ? types.find((t) => t.slug === input.slug)
    : types[0];

  if (!meetingType) {
    return {
      ok: false,
      code: "not_found",
      message: "That meeting is no longer bookable.",
    };
  }

  // Re-derive the slot list server-side. The client's list is always stale by
  // the time it posts, and a client can post anything at all.
  const rules = await buildSlotRules(host, meetingType);
  if (!isSlotBookable(input.startsAt, rules)) {
    return {
      ok: false,
      code: "invalid_slot",
      message: "That time is no longer available.",
    };
  }

  const endsAt = new Date(
    input.startsAt.getTime() + meetingType.duration_minutes * 60_000,
  );

  const admin = createAdminClient();
  const { data: booking, error } = await admin
    .from("bookings")
    .insert({
      host_id: host.id,
      meeting_type_id: meetingType.id,
      meeting_name: meetingType.name,
      duration_minutes: meetingType.duration_minutes,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_note: input.guestNote?.trim() ?? "",
      guest_timezone: input.guestTimezone ?? null,
      starts_at: input.startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select("id, reference")
    .single();

  if (error) {
    // The exclusion constraint fired: someone else won the race between our
    // slot check and this insert. This is THE double-booking guard.
    if (error.code === EXCLUSION_VIOLATION) {
      return {
        ok: false,
        code: "slot_taken",
        message: "That time was just booked by someone else.",
      };
    }
    return {
      ok: false,
      code: "error",
      message: "Something went wrong scheduling that meeting.",
    };
  }

  // The slot is now reserved. Adding the Google event is a best-effort follow-up:
  // if it fails, the booking still stands (the time is genuinely held) and the
  // host can see that the Meet link is missing, rather than the guest losing a
  // confirmed meeting to a transient Google error.
  let meetUrl: string | null = null;
  let calendarSynced = false;

  try {
    const event = await createCalendarEvent({
      userId: host.id,
      summary: `${meetingType.name} — ${guestName}`,
      description: [
        `Booked through Meetrao by ${guestName} (${guestEmail}).`,
        input.guestNote?.trim() ? `\nNote from the guest:\n${input.guestNote.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      start: input.startsAt,
      end: endsAt,
      timezone: host.timezone,
      guestName,
      guestEmail,
      requestId: booking.id,
    });

    meetUrl = event.meetUrl;
    calendarSynced = true;

    await admin
      .from("bookings")
      .update({ google_event_id: event.eventId, meet_url: event.meetUrl })
      .eq("id", booking.id);
  } catch (err) {
    console.error("[meetrao] calendar event creation failed", {
      bookingId: booking.id,
      error: err instanceof Error ? err.message : err,
    });
  }

  // Both confirmation emails. Best-effort like the calendar event above: the
  // booking is already made and must not be undone by a mail failure, so the
  // senders log rather than throw. The host copy honours "New booking"; the
  // guest copy is transactional and always sends.
  await notifyBookingCreated(host.id, {
    id: booking.id,
    reference: booking.reference,
    meetingName: meetingType.name,
    durationMinutes: meetingType.duration_minutes,
    guestName,
    guestEmail,
    guestNote: input.guestNote?.trim() ?? "",
    guestTimezone: input.guestTimezone ?? null,
    startsAt: input.startsAt,
    endsAt,
    meetUrl,
  });

  return { ok: true, reference: booking.reference, meetUrl, calendarSynced };
}

/* ── Reading and cancelling ──────────────────────────────────────────────── */

export type BookingDetail = {
  id: string;
  reference: string;
  meetingName: string;
  durationMinutes: number;
  guestName: string;
  guestEmail: string;
  guestNote: string;
  startsAt: Date;
  endsAt: Date;
  status: "confirmed" | "cancelled";
  meetUrl: string | null;
  hostName: string;
  hostTimezone: string;
  hostUsername: string;
};

/**
 * Guest-facing lookup. The reference is a 32-hex-character random value, so it
 * acts as a capability token for exactly one booking.
 */
export async function getBookingByReference(
  reference: string,
): Promise<BookingDetail | null> {
  if (!/^[0-9a-f]{32}$/.test(reference)) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select(
      "id, reference, meeting_name, duration_minutes, guest_name, guest_email, guest_note, starts_at, ends_at, status, meet_url, host_id",
    )
    .eq("reference", reference)
    .maybeSingle();

  if (!data) return null;

  const { data: host } = await admin
    .from("profiles")
    .select("full_name, timezone, username")
    .eq("id", data.host_id)
    .single();

  return {
    id: data.id,
    reference: data.reference,
    meetingName: data.meeting_name,
    durationMinutes: data.duration_minutes,
    guestName: data.guest_name,
    guestEmail: data.guest_email,
    guestNote: data.guest_note,
    startsAt: new Date(data.starts_at),
    endsAt: new Date(data.ends_at),
    status: data.status,
    meetUrl: data.meet_url,
    hostName: host?.full_name || host?.username || "your host",
    hostTimezone: host?.timezone ?? "UTC",
    hostUsername: host?.username ?? "",
  };
}

export async function cancelBooking(params: {
  bookingId: string;
  by: "host" | "guest";
  /** Required when `by` is "host" — must match the booking's host_id. */
  actorId?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select(
      "id, host_id, status, google_event_id, reference, meeting_name, duration_minutes, guest_name, guest_email, guest_note, guest_timezone, starts_at, ends_at, meet_url",
    )
    .eq("id", params.bookingId)
    .maybeSingle();

  if (!booking) return { ok: false, message: "That meeting no longer exists." };
  if (params.by === "host" && booking.host_id !== params.actorId) {
    return { ok: false, message: "That meeting belongs to someone else." };
  }
  if (booking.status === "cancelled") return { ok: true };

  const { error } = await admin
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: params.by,
    })
    .eq("id", booking.id);

  if (error) return { ok: false, message: "Could not cancel that meeting." };

  if (booking.google_event_id) {
    try {
      await deleteCalendarEvent(booking.host_id, booking.google_event_id);
    } catch (err) {
      // The booking is cancelled either way; a stale calendar entry is the
      // lesser problem and is safe to clean up manually.
      console.error("[meetrao] calendar event deletion failed", {
        bookingId: booking.id,
        error: err instanceof Error ? err.message : err,
      });
    }
  }

  // Both sides are told. The host copy honours "Booking cancelled"; the guest
  // copy is transactional — their meeting disappeared and they are owed the
  // news regardless of any preference.
  await notifyBookingCancelled(
    booking.host_id,
    {
      id: booking.id,
      reference: booking.reference,
      meetingName: booking.meeting_name,
      durationMinutes: booking.duration_minutes,
      guestName: booking.guest_name,
      guestEmail: booking.guest_email,
      guestNote: booking.guest_note,
      guestTimezone: booking.guest_timezone,
      startsAt: new Date(booking.starts_at),
      endsAt: new Date(booking.ends_at),
      meetUrl: booking.meet_url,
    },
    params.by,
  );

  return { ok: true };
}

/* ── Email notifications ─────────────────────────────────────────────────────
 *
 * Both helpers load the host once and hand off to the senders in
 * @/lib/email/messages, which own the preference gating. Host mail is gated
 * there; guest mail is transactional and is not.
 * ────────────────────────────────────────────────────────────────────────── */

async function loadHostForEmail(hostId: string): Promise<HostEmailData | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, email, username, timezone")
    .eq("id", hostId)
    .maybeSingle();

  if (!data || !data.email) return null;
  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    username: data.username,
    timezone: data.timezone,
  };
}

async function notifyBookingCreated(
  hostId: string,
  booking: BookingEmailData,
): Promise<void> {
  const host = await loadHostForEmail(hostId);
  if (!host) return;
  await Promise.allSettled([
    sendBookingNewHost(host, booking),
    sendBookingNewGuest(host, booking),
  ]);
}

async function notifyBookingCancelled(
  hostId: string,
  booking: BookingEmailData,
  by: "host" | "guest",
): Promise<void> {
  const host = await loadHostForEmail(hostId);
  if (!host) return;
  await sendBookingCancelled(host, booking, by);
}

/** "Monday, September 7 · 9:00 – 9:30 AM" */
export function describeBooking(
  startsAt: Date,
  endsAt: Date,
  timezone: string,
): string {
  return `${formatLongDate(startsAt, timezone)} · ${formatTimeRange(startsAt, endsAt, timezone)}`;
}
