import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { convexServes } from "@/lib/backend";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

/* The guest's own view of their booking, reached by reference. The reference is
   32 hex characters of CSPRNG and is the only credential the guest has — it
   opens exactly one booking and nothing else. */

export type GuestBooking = {
  reference: string;
  meetingName: string;
  durationMinutes: number;
  guestName: string;
  guestEmail: string;
  guestNote: string;
  guestTimezone: string | null;
  startsAt: string;
  endsAt: string;
  status: "confirmed" | "cancelled";
  meetUrl: string | null;
  hostName: string;
  hostUsername: string;
  hostTimezone: string;
};

type Row = {
  reference: string;
  meeting_name: string;
  duration_minutes: number;
  guest_name: string;
  guest_email: string;
  guest_note: string;
  guest_timezone: string | null;
  starts_at: string;
  ends_at: string;
  status: "confirmed" | "cancelled";
  meet_url: string | null;
  host_name: string;
  host_username: string;
  host_timezone: string;
};

async function fetchRow(reference: string): Promise<Row | null> {
  if (convexServes("publicBooking")) {
    const b = await convexAnonymous().query(api.publicBooking.getByReference, { reference });
    if (!b) return null;
    // The Convex query nests the host; the RPC returned it flattened.
    return {
      reference: b.reference,
      meeting_name: b.meeting_name,
      duration_minutes: b.duration_minutes,
      guest_name: b.guest_name,
      guest_email: b.guest_email,
      guest_note: b.guest_note,
      guest_timezone: b.guest_timezone,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      status: b.status,
      meet_url: b.meet_url,
      host_name: b.host?.full_name ?? "",
      host_username: b.host?.username ?? "",
      host_timezone: b.host?.timezone ?? "UTC",
    };
  }

  const { data } = await supabaseAdmin().rpc("get_booking_by_reference", { p_reference: reference });
  return ((Array.isArray(data) ? data[0] : data) as Row | undefined) ?? null;
}

export async function getBookingByReference(reference: string): Promise<GuestBooking | null> {
  const row = await fetchRow(reference);
  if (!row) return null;

  return {
    reference: row.reference,
    meetingName: row.meeting_name,
    durationMinutes: row.duration_minutes,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestNote: row.guest_note,
    guestTimezone: row.guest_timezone,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    meetUrl: row.meet_url,
    hostName: row.host_name || row.host_username,
    hostUsername: row.host_username,
    hostTimezone: row.host_timezone,
  };
}
