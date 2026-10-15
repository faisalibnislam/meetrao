import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { appError, appSession } from "@/lib/api/app-session";
import { cancelAsHost } from "@/lib/booking/host-changes";

export const dynamic = "force-dynamic";

const Body = z.object({ id: z.string().min(1).max(100) });

/** POST /api/app/bookings/cancel, the iOS app cancelling one of the host's bookings. */
export async function POST(request: NextRequest) {
  const session = await appSession(request);
  if (session instanceof NextResponse) return session;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return appError(400, "Which booking?");

  const result = await cancelAsHost(session.convex, session.profile, parsed.data.id);
  if (result.error) return appError(409, result.error);
  return NextResponse.json({ calendarWarning: result.calendarWarning ?? null }, { headers: { "Cache-Control": "no-store" } });
}
