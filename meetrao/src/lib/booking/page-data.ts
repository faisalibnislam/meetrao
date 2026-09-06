import "server-only";

import {
  buildSlotRules,
  getPublicHost,
  getPublicMeetingTypes,
  type PublicHost,
  type PublicMeetingType,
} from "./service";
import { slotsForDate } from "./slots";
import { addDaysToKey, dateKeyInZone } from "./time";
import type { BookingPageData, MonthPayload } from "@/components/booking/booking-flow";

/** The YYYY-MM values the guest can page through, inclusive. */
function monthsInWindow(from: Date, to: Date, zone: string): string[] {
  const months: string[] = [];
  let key = dateKeyInZone(from, zone).slice(0, 7);
  const last = dateKeyInZone(to, zone).slice(0, 7);

  // A booking window is capped at 365 days, so this cannot run away.
  for (let i = 0; i < 14; i++) {
    months.push(key);
    if (key === last) break;
    const [year, month] = key.split("-").map(Number);
    const next = new Date(Date.UTC(year, month, 1));
    key = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return months;
}

function slotsForMonth(
  month: string,
  rules: Parameters<typeof slotsForDate>[1],
  todayKey: string,
  hostTimezone: string,
): MonthPayload {
  const [year, monthNumber] = month.split("-").map(Number);
  const total = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  const days: Record<string, string[]> = {};
  let key = `${month}-01`;
  for (let i = 0; i < total; i++) {
    const slots = slotsForDate(key, rules);
    if (slots.length > 0) days[key] = slots.map((s) => s.toISOString());
    key = addDaysToKey(key, 1);
  }

  return { month, hostTimezone, todayKey, days };
}

export type BookingPageResult =
  | { kind: "page"; data: BookingPageData }
  /** More than one active meeting and no slug — the guest picks first. */
  | { kind: "choose"; host: PublicHost; types: PublicMeetingType[] }
  | { kind: "not_found" };

export async function loadBookingPage(
  username: string,
  slug?: string,
): Promise<BookingPageResult> {
  const host = await getPublicHost(username);
  if (!host) return { kind: "not_found" };

  const types = await getPublicMeetingTypes(username);
  if (types.length === 0) return { kind: "not_found" };

  if (!slug && types.length > 1) return { kind: "choose", host, types };

  const meetingType = slug ? types.find((t) => t.slug === slug) : types[0];
  if (!meetingType) return { kind: "not_found" };

  const now = new Date();
  const rules = await buildSlotRules(host, meetingType, now);

  const windowEnd = new Date(
    now.getTime() + meetingType.booking_window_days * 24 * 60 * 60_000,
  );
  const months = monthsInWindow(now, windowEnd, host.timezone);
  const todayKey = dateKeyInZone(now, host.timezone);

  return {
    kind: "page",
    data: {
      username: host.username,
      slug: meetingType.slug,
      hostName: host.full_name || host.username,
      hostJobTitle: host.job_title,
      hostAvatarUrl: host.avatar_url,
      meetingName: meetingType.name,
      meetingDescription: meetingType.description,
      durationMinutes: meetingType.duration_minutes,
      months,
      initialMonth: slotsForMonth(months[0], rules, todayKey, host.timezone),
    },
  };
}
