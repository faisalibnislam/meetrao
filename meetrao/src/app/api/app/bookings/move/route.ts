import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { appError, appSession } from "@/lib/api/app-session";
import { moveAsHost } from "@/lib/booking/host-changes";

export const dynamic = "force-dynamic";

/* The date and minute-of-day in the HOST's zone, as the web form sends them;
   the instant is worked out on the server against the host's own timezone. */
const Body = z.object({
  id: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.number().int().min(0).max(1439),
});

/** POST /api/app/bookings/move, the iOS app moving one of the host's bookings. */
export async function POST(request: NextRequest) {
  const session = await appSession(request);
  if (session instanceof NextResponse) return session;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return appError(400, "Pick a date and a time.");

  const { id, date, time } = parsed.data;
  const result = await moveAsHost(session.convex, session.profile, id, date, time);
  if (result.error) return appError(409, result.error);
  return NextResponse.json({ calendarWarning: result.calendarWarning ?? null }, { headers: { "Cache-Control": "no-store" } });
}
