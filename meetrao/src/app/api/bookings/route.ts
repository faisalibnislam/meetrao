import { NextResponse, type NextRequest } from "next/server";
import { createBooking } from "@/lib/booking/service";

export const dynamic = "force-dynamic";

type Payload = {
  username?: unknown;
  slug?: unknown;
  startsAt?: unknown;
  guestName?: unknown;
  guestEmail?: unknown;
  guestNote?: unknown;
  guestTimezone?: unknown;
};

const asString = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Creates a booking.
 *
 *   201 — booked
 *   409 — the slot was taken between the guest choosing it and submitting.
 *         The exclusion constraint on `bookings` is what detects this, so it
 *         holds even under genuinely concurrent requests.
 *   422 — the payload or the requested slot is not valid
 */
export async function POST(request: NextRequest) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ code: "invalid_input" }, { status: 400 });
  }

  const username = asString(payload.username).trim();
  const startsAtRaw = asString(payload.startsAt);
  if (!username || !startsAtRaw) {
    return NextResponse.json({ code: "invalid_input" }, { status: 400 });
  }

  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ code: "invalid_input" }, { status: 400 });
  }

  const result = await createBooking({
    username,
    slug: asString(payload.slug) || null,
    startsAt,
    guestName: asString(payload.guestName),
    guestEmail: asString(payload.guestEmail),
    guestNote: asString(payload.guestNote).slice(0, 2000),
    guestTimezone: asString(payload.guestTimezone) || null,
  });

  if (result.ok) {
    return NextResponse.json(
      {
        reference: result.reference,
        meetUrl: result.meetUrl,
        calendarSynced: result.calendarSynced,
      },
      { status: 201 },
    );
  }

  const status =
    result.code === "slot_taken"
      ? 409
      : result.code === "not_found"
        ? 404
        : 422;

  return NextResponse.json(
    { code: result.code, message: result.message },
    { status },
  );
}
