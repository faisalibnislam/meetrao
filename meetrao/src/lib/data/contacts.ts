import "server-only";

import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import type { Contact } from "@/lib/types";
import { activeContext } from "@/lib/data/context";
import { namedElsewhere } from "@/lib/data/elsewhere";
import type { Elsewhere } from "@/lib/elsewhere";

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
 * to remember to update it, a booking created, cancelled, rescheduled, or its
 * time passing, which nothing writes at all. Computing it on read cannot go
 * stale, and a host's booking list is small.
 */
type BookingRow = { id: string; guest_email: string; starts_at: string; status: string };
type InviteeRow = { email: string; booking_id: string };

/**
 * The list, plus where the contacts are when this workspace has none.
 *
 * A second entry point rather than a wider return on `listContacts`: other
 * callers have no use for this, and a field nobody reads is a field that
 * rots.
 */
export async function listContactsForScreen(
  userId: string,
  timeZone: string,
): Promise<{ contacts: ContactView[]; elsewhere: Elsewhere[] }> {
  const convex = await convexServer();
  const context = await activeContext();
  const r = await convex.query(api.contacts.listForScreen, { companyId: context.companyId });
  return {
    contacts: buildContacts(
      r.contacts as Contact[],
      r.bookings as BookingRow[],
      r.invitees as InviteeRow[],
      timeZone,
    ),
    elsewhere: await namedElsewhere(r.elsewhere, context),
  };
}

async function sources(
  userId: string,
): Promise<{ contactRows: Contact[]; bookingRows: BookingRow[]; inviteeRows: InviteeRow[] }> {
  void userId; // every read below is scoped by the caller's own identity
  const convex = await convexServer();
  /* The company in force, for the same reason the bookings screen takes
     one: an agency's point in scoping contacts is that one client's people
     stay out of another's list. */
  const context = await activeContext();
  const r = await convex.query(api.contacts.listForScreen, { companyId: context.companyId });
  return {
    contactRows: r.contacts as Contact[],
    bookingRows: r.bookings as BookingRow[],
    inviteeRows: r.invitees as InviteeRow[],
  };
}

/**
 * The view every contacts entry point returns, built from the three row sets.
 *
 * Extracted so the screen loader and the plain list share one path: two
 * copies of this would drift, and the "last seen" column is exactly the kind
 * of thing that drifts silently.
 */
function buildContacts(
  contactRows: Contact[],
  bookingRows: BookingRow[],
  inviteeRows: InviteeRow[],
  timeZone: string,
): ContactView[] {
  const bookings = bookingRows;
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
  for (const i of inviteeRows) {
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

  return contactRows.map((c) => {
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

export async function listContacts(userId: string, timeZone: string): Promise<ContactView[]> {
  const { contactRows, bookingRows, inviteeRows } = await sources(userId);
  return buildContacts(contactRows, bookingRows, inviteeRows, timeZone);
}
