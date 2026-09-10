import "server-only";

import { supabaseServer } from "@/lib/supabase/server";
import type { Contact } from "@/lib/types";

export type ContactView = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  source: Contact["source"];
  /** Host-local short dates, or null when there is nothing to show. */
  lastMeeting: string | null;
  nextMeeting: string | null;
  lastMeetingAt: string | null;
  nextMeetingAt: string | null;
  meetings: number;
};

/**
 * Every contact, with the meeting dates read off the bookings rather than
 * stored on the row.
 *
 * Denormalising last/next onto `contacts` would mean four more places that have
 * to remember to update it — a booking created, cancelled, rescheduled, or its
 * time passing, which nothing writes at all. Computing it on read cannot go
 * stale, and a host's booking list is small.
 */
export async function listContacts(userId: string, timeZone: string): Promise<ContactView[]> {
  const supabase = await supabaseServer();

  const [{ data: contactRows }, { data: bookingRows }, { data: inviteeRows }] = await Promise.all([
    supabase.from("contacts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("id, guest_email, starts_at, status")
      .eq("host_id", userId),
    supabase.from("booking_invitees").select("email, booking_id"),
  ]);

  const bookings = (bookingRows ?? []) as { id: string; guest_email: string; starts_at: string; status: string }[];
  const confirmed = bookings.filter((b) => b.status === "confirmed");

  // A booking reaches a contact two ways: they are the guest of record, or they
  // are one of the extra invitees on a meeting the host scheduled. Missing the
  // second would show "no meetings" beside someone the host met last week.
  const byBooking = new Map(confirmed.map((b) => [b.id, b]));
  const byEmail = new Map<string, string[]>();

  const add = (email: string, at: string) => {
    const key = email.toLowerCase();
    const list = byEmail.get(key);
    if (list) list.push(at);
    else byEmail.set(key, [at]);
  };

  for (const b of confirmed) add(b.guest_email, b.starts_at);
  for (const i of (inviteeRows ?? []) as { email: string; booking_id: string }[]) {
    const b = byBooking.get(i.booking_id);
    if (b && b.guest_email.toLowerCase() !== i.email.toLowerCase()) add(i.email, b.starts_at);
  }

  const short = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const now = Date.now();

  return ((contactRows ?? []) as Contact[]).map((c) => {
    const times = (byEmail.get(c.email.toLowerCase()) ?? []).map((t) => new Date(t)).sort((a, b) => +a - +b);
    const past = times.filter((t) => +t <= now);
    const future = times.filter((t) => +t > now);
    const last = past.at(-1) ?? null;
    const next = future.at(0) ?? null;

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      notes: c.notes,
      source: c.source,
      lastMeeting: last ? short.format(last) : null,
      nextMeeting: next ? short.format(next) : null,
      lastMeetingAt: last?.toISOString() ?? null,
      nextMeetingAt: next?.toISOString() ?? null,
      meetings: times.length,
    };
  });
}
