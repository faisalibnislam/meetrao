import { NextResponse, type NextRequest } from "next/server";
import {
  buildSlotRules,
  getPublicHost,
  getPublicMeetingTypes,
} from "@/lib/booking/service";
import { slotsForDate } from "@/lib/booking/slots";
import { addDaysToKey, dateKeyInZone } from "@/lib/booking/time";

export const dynamic = "force-dynamic";

/**
 * Every bookable instant in one month, keyed by the host's calendar day.
 *
 * The client only ever receives ISO instants — it formats them in the guest's
 * own timezone. Which instants exist is decided here and nowhere else.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const username = params.get("username");
  const slug = params.get("slug");
  const month = params.get("month"); // YYYY-MM

  if (!username || !month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const host = await getPublicHost(username);
  if (!host) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const types = await getPublicMeetingTypes(username);
  const meetingType = slug ? types.find((t) => t.slug === slug) : types[0];
  if (!meetingType) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const now = new Date();
  const rules = await buildSlotRules(host, meetingType, now);

  // Walk the requested month day by day, in the host's zone.
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  const days: Record<string, string[]> = {};
  let key = `${month}-01`;
  for (let i = 0; i < daysInMonth; i++) {
    const slots = slotsForDate(key, rules);
    if (slots.length > 0) days[key] = slots.map((s) => s.toISOString());
    key = addDaysToKey(key, 1);
  }

  return NextResponse.json(
    {
      month,
      hostTimezone: host.timezone,
      todayKey: dateKeyInZone(now, host.timezone),
      days,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
