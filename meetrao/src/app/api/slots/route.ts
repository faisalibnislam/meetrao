import { NextResponse, type NextRequest } from "next/server";
import { bookableDatesInMonth, computeSlots, dateKey, type PlainDate } from "@/lib/booking/slots";
import { getBusy, getPublicAvailability, getPublicHost, getPublicMeetings } from "@/lib/data/public-booking";

/* The slot query the booking page calls. Public, because the guest has no
   session — and read-only, so it exposes availability and nothing else about
   the host's calendar. */

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export async function GET(request: NextRequest) {
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

  const host = await getPublicHost(username);
  if (!host) return NextResponse.json({ error: "Unknown host." }, { status: 404 });

  const meeting = (await getPublicMeetings(username)).find((m) => m.slug === slug);
  if (!meeting) return NextResponse.json({ error: "Unknown meeting." }, { status: 404 });

  const availability = await getPublicAvailability(host.id);

  // A month, with a day either side so a guest-local day that straddles two
  // host-local days is still covered.
  const from = new Date(Date.UTC(year, month - 1, 1) - DAY);
  const to = new Date(Date.UTC(year, month, 1) + DAY);
  const { busy, calendarChecked } = await getBusy(host.id, from, to);

  const shared = {
    guestTimezone: timezone,
    hostTimezone: host.timezone,
    availability,
    rules: meeting.rules,
    busy,
    now: new Date(),
  };

  const openDates = [...bookableDatesInMonth({ ...shared, year, month })];

  const times = day
    ? computeSlots({ ...shared, date: { year, month, day } as PlainDate }).map((d) => d.toISOString())
    : [];

  return NextResponse.json(
    { openDates, times, selected: day ? dateKey({ year, month, day }) : null, calendarChecked },
    { headers: { "Cache-Control": "no-store" } },
  );
}
