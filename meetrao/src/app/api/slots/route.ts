import { NextResponse, type NextRequest } from "next/server";
import { bookableDatesInMonth, computeSlots, dateKey, type PlainDate } from "@/lib/booking/slots";
import { getPublicTeam, getTeamBusy, getTeamHours, teamOpenDates, teamSlotsForDay } from "@/lib/data/team-booking";
import { getBusy, getMeetingAvailability, getMeetingOverrides, getSeatMap, getPublicHost, getPublicMeeting } from "@/lib/data/public-booking";

/* The slot query the booking page calls. Public, because the guest has no
   session, and read-only, so it exposes availability and nothing else about
   the host's calendar. */

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

/**
 * The same answer for a team link: the union of its members' times.
 *
 * Kept beside the solo path rather than in it, because almost nothing is
 * shared. A team has no single host, no seat map and no meeting of its own
 * to look up by username.
 */
async function teamSlots(request: NextRequest, teamSlug: string) {
  const params = request.nextUrl.searchParams;
  const slug = params.get("slug") ?? "";
  const year = Number(params.get("year"));
  const month = Number(params.get("month"));
  const day = params.get("day") ? Number(params.get("day")) : null;
  const timezone = params.get("tz") || "UTC";

  const team = await getPublicTeam(teamSlug);
  const meeting = team?.meetings.find((m) => m.slug === slug);
  if (!team || !meeting) return NextResponse.json({ error: "Unknown meeting." }, { status: 404 });

  const hours = await getTeamHours(team.slug, meeting.id);
  if (hours.length === 0) return NextResponse.json({ openDates: [], times: [], calendarChecked: false });

  const from = new Date(Date.UTC(year, month - 1, 1) - DAY);
  const to = new Date(Date.UTC(year, month, 1) + DAY);
  const busy = await getTeamBusy(hours, from, to);

  const now = new Date();
  const openDates = teamOpenDates({ hours, busy, meeting, year, month, guestTimezone: timezone, now });
  const times = day
    ? teamSlotsForDay({ hours, busy, meeting, date: { year, month, day }, guestTimezone: timezone, now })
    : [];

  return NextResponse.json(
    { openDates, times, selected: day ? dateKey({ year, month, day }) : null, calendarChecked: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  const teamSlug = request.nextUrl.searchParams.get("team");
  if (teamSlug) return teamSlots(request, teamSlug);

  const q = request.nextUrl.searchParams;
  const username = q.get("username");
  const slug = q.get("slug");
  const year = Number(q.get("year"));
  const month = Number(q.get("month"));
  const day = q.get("day") ? Number(q.get("day")) : null;
  const timezone = q.get("tz") || "UTC";

  if (!username || !slug || !Number.isInteger(year) || !Number.isInteger(month)) {
    return NextResponse.json({ error: "Missing query." }, { status: 400 });
  }

  /* Two phases rather than a chain of six round trips. This runs every time a
     guest picks a date or changes month, so each trip was a pause between a
     click and the times appearing. Nothing within a phase depends on anything
     else in it. */
  const [host, meeting] = await Promise.all([getPublicHost(username), getPublicMeeting(username, slug)]);
  if (!host) return NextResponse.json({ error: "Unknown host." }, { status: 404 });
  if (!meeting) return NextResponse.json({ error: "Unknown meeting." }, { status: 404 });

  // A month, with a day either side so a guest-local day that straddles two
  // host-local days is still covered.
  const from = new Date(Date.UTC(year, month - 1, 1) - DAY);
  const to = new Date(Date.UTC(year, month, 1) + DAY);

  const [availability, overrides, { busy, calendarChecked }, seats] = await Promise.all([
    // Per meeting, not per host: two meetings can sit on different schedules.
    getMeetingAvailability(meeting.id),
    getMeetingOverrides(meeting.id),
    getBusy(host.id, from, to, meeting.capacity > 1 ? meeting.id : undefined),
    meeting.capacity > 1 ? getSeatMap(meeting.id, from, to) : Promise.resolve({} as Record<string, number>),
  ]);

  const shared = {
    guestTimezone: timezone,
    hostTimezone: host.timezone,
    availability,
    overrides,
    rules: meeting.rules,
    busy,
    now: new Date(),
  };

  const openDates = [...bookableDatesInMonth({ ...shared, year, month })];

  const times = (day ? computeSlots({ ...shared, date: { year, month, day } as PlainDate }) : [])
    .map((d) => d.toISOString())
    // A full slot is not on offer, however free the host's calendar looks.
    .filter((iso) => meeting.capacity <= 1 || (seats[iso] ?? 0) < meeting.capacity);

  return NextResponse.json(
    { openDates, times, seats, selected: day ? dateKey({ year, month, day }) : null, calendarChecked },
    { headers: { "Cache-Control": "no-store" } },
  );
}
