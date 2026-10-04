import "server-only";

import { bookableDatesInMonth, computeSlots } from "@/lib/booking/slots";
import { dateFormat } from "@/lib/intl";
import {
  getBusy,
  getMeetingAvailability,
  getMeetingOverrides,
  getPublicHost,
  getPublicMeeting,
  getSeatMap,
  meetingIsOnCompany,
  type PublicHost,
  type PublicMeeting,
} from "@/lib/data/public-booking";
import { convexAnonymous } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";

const DAY = 86_400_000;

export type BookingStart = {
  host: PublicHost;
  meeting: PublicMeeting;
  /** Seats taken per slot, for a meeting several guests share. */
  seats: Record<string, number>;
  /** The month the guest lands on, already worked out, so the first paint has times in it. */
  initial: {
    year: number;
    month: number;
    openDates: string[];
    day: number | null;
    times: string[];
    timezone: string;
  };
  pageViewId: string | null;
};

/**
 * Everything a booking page needs before its first paint, in TWO PHASES.
 *
 * The hosted page and the embed widget both start here, so they cannot offer
 * different times, and neither can drift back into a chain. Each read used to
 * be awaited after the last, up to nine round trips to a database in another
 * region before a guest saw a calendar.
 *
 * Phase one needs only the address. Phase two needs the host or the meeting
 * from phase one. Nothing in a phase waits on anything else in it.
 *
 * Null means there is no page here: an unknown host, a meeting that is off or
 * absent, or (with `companySlug`) a meeting that is not this company's.
 */
export async function bookingStart(
  username: string,
  slug: string,
  companySlug: string | null,
): Promise<BookingStart | null> {
  const [host, meeting, onCompany] = await Promise.all([
    getPublicHost(username),
    getPublicMeeting(username, slug),
    /* A company's address serves only that company's meetings. Without this,
       a guest who guessed a slug could reach a member's PERSONAL meeting
       through somebody else's branded address, which is the whole thing
       company scoping exists to prevent. */
    companySlug ? meetingIsOnCompany(username, slug, companySlug) : Promise.resolve(true),
  ]);
  if (!host || !meeting || !onCompany) return null;

  // The first paint is in the host's zone, because the server cannot know the
  // guest's. The client corrects it on mount.
  const now = new Date();
  const [year, month, day] = dateFormat("en-CA", {
    timeZone: host.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number);
  const windowStart = new Date(Date.UTC(year, month - 1, 1) - DAY);
  const windowEnd = new Date(Date.UTC(year, month, 1) + DAY);

  const [availability, overrides, { busy }, seats, pageViewId] = await Promise.all([
    getMeetingAvailability(meeting.id),
    getMeetingOverrides(meeting.id),
    // A workshop's own seats are not conflicts with themselves.
    getBusy(host.id, windowStart, windowEnd, meeting.capacity > 1 ? meeting.id : undefined),
    meeting.capacity > 1 ? getSeatMap(meeting.id, windowStart, windowEnd) : Promise.resolve({} as Record<string, number>),
    // An opening is what "Avg. Reply time" measures, opened to booked, so the
    // widget counts as one too.
    convexAnonymous().mutation(api.publicBooking.recordPageView, { hostId: host.id, meetingTypeId: meeting.id }),
  ]);

  const input = {
    guestTimezone: host.timezone,
    hostTimezone: host.timezone,
    availability,
    overrides,
    rules: meeting.rules,
    busy,
    now,
  };
  const openDates = [...bookableDatesInMonth({ ...input, year, month })];

  // Land on the first bookable day rather than an empty "pick a date" panel.
  const firstOpen = openDates
    .map((key) => Number(key.slice(8)))
    .filter((d) => d >= day)
    .sort((a, b) => a - b)[0];

  const times = (firstOpen ? computeSlots({ ...input, date: { year, month, day: firstOpen } }) : [])
    .map((d) => d.toISOString())
    // A full slot is not on offer, however free the host's calendar looks.
    .filter((iso) => meeting.capacity <= 1 || (seats[iso] ?? 0) < meeting.capacity);

  return {
    host,
    meeting,
    seats,
    initial: { year, month, openDates, day: firstOpen ?? null, times, timezone: host.timezone },
    pageViewId: typeof pageViewId === "string" ? pageViewId : null,
  };
}
