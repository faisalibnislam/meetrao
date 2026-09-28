import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { computeSlots, isSlotBookable, type ComputeSlotsInput } from "./slots";
import { TZDate } from "@date-fns/tz";

/* Moving a booking, guarded from two directions.

   The engine half is exercised directly; the rest is pinned by reading the
   source, in the style of admin-booking-link.test.ts — the two re-checks a
   move has to survive live in a route handler and a Convex mutation, neither
   of which this suite can execute.

   The defect each one prevents is named on the test. */

const ROOT = path.join(process.cwd());
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const NY = "America/New_York";
const at = (y: number, m: number, d: number, hh: number, mm = 0) =>
  new Date(new TZDate(y, m - 1, d, hh, mm, NY).getTime());

/** Monday 09:00–12:00, 30-minute meetings, no buffer or notice. */
function input(over: Partial<ComputeSlotsInput> = {}): ComputeSlotsInput {
  return {
    date: { year: 2026, month: 9, day: 7 },
    guestTimezone: NY,
    hostTimezone: NY,
    availability: [{ weekday: 1, startMinute: 540, endMinute: 720 }],
    rules: { durationMinutes: 30, bufferMinutes: 0, minimumNoticeMinutes: 0, bookingWindowDays: 30 },
    busy: [],
    now: at(2026, 9, 1, 9),
    ...over,
  };
}

describe("the slot a booking already holds", () => {
  /* The booking being moved is itself in `busy`. Left there, a guest trying to
     move 09:00 → 09:30 is told their own meeting is in the way, and with a
     buffer the times either side vanish too. Both the route handler and the
     page drop the booking's own interval before asking the engine. */
  const own = { start: at(2026, 9, 7, 9), end: at(2026, 9, 7, 9, 30) };

  it("blocks the neighbouring slot while it is counted as busy", () => {
    const withOwn = computeSlots(input({ busy: [own] })).map((d) => d.toISOString());
    expect(withOwn).not.toContain(at(2026, 9, 7, 9).toISOString());
  });

  it("frees its own time once dropped, which is what a move needs", () => {
    const without = computeSlots(input({ busy: [] })).map((d) => d.toISOString());
    expect(without).toContain(at(2026, 9, 7, 9).toISOString());
    expect(
      isSlotBookable({ ...input({ busy: [] }), start: at(2026, 9, 7, 9, 30) }),
      "the half hour after its own start should be offered",
    ).toBe(true);
  });

  it("still refuses somebody else's booking at the same time", () => {
    const theirs = { start: at(2026, 9, 7, 10), end: at(2026, 9, 7, 10, 30) };
    expect(isSlotBookable({ ...input({ busy: [theirs] }), start: at(2026, 9, 7, 10) })).toBe(false);
  });
});

describe("the move API keeps both guards", () => {
  const route = read("src/app/api/bookings/reschedule/route.ts");

  it("guards the guard", () => {
    expect(route, "the reschedule route has moved or been renamed").toContain("rescheduleByReference");
  });

  it("re-runs the slot engine before writing", () => {
    // Migration 0005 is what a missing re-check looks like: the engine filtered
    // the times on the way in, and anyone can POST this directly.
    expect(route).toContain("isSlotBookable");
    expect(route).toMatch(/status: 409/);
  });

  it("drops only the booking's own interval from busy", () => {
    // Filtering by start alone would also drop a different meeting that
    // happens to begin at the same moment.
    expect(route).toMatch(/b\.start\.getTime\(\) === ownStart && b\.end\.getTime\(\) === ownEnd/);
  });
});

describe("Convex re-checks a move for itself", () => {
  const publicBooking = read("convex/publicBooking.ts");
  const bookings = read("convex/bookings.ts");

  it("guards the guard", () => {
    expect(publicBooking).toContain("rescheduleByReference");
    expect(bookings).toContain("moveBooking");
  });

  it("re-applies notice, window and availability", () => {
    const move = publicBooking.slice(publicBooking.indexOf("rescheduleByReference"));
    expect(move).toContain("inside minimum notice");
    expect(move).toContain("beyond booking window");
    expect(move).toContain("outside availability");
  });

  it("ignores the booking itself in the overlap read, and nothing else", () => {
    // ignoreBookingId has existed since the port for exactly this caller. A
    // move that collided with its own row could never succeed.
    expect(bookings).toMatch(/ignoreBookingId:\s*b\.id/);
  });

  it("raises the revision, which the .ics sequence is read from", () => {
    // A calendar client that already holds the UID keeps the time it has
    // unless SEQUENCE rises.
    expect(bookings).toMatch(/revision:\s*\(b\.revision \?\? 0\) \+ 1/);
    expect(read("src/app/(public)/booking/[reference]/ics/route.ts")).toContain("SEQUENCE:${booking.revision}");
  });
});

describe("time off is enforced at the booking door too", () => {
  const publicBooking = read("convex/publicBooking.ts");

  it("guards the guard", () => {
    expect(publicBooking, "the shared availability check has moved").toContain("fitsAvailability");
  });

  /* The engine filters the times on the way in; Convex cannot import it, so
     the second implementation has to learn the same rules. Migration 0005
     exists because that check was once missing entirely — a date override
     that only the engine knew about would be the same hole, reopened. */
  it("both doors use the one check", () => {
    const uses = publicBooking.match(/await fitsAvailability\(/g) ?? [];
    expect(uses.length, "create and reschedule should both call it").toBe(2);
  });

  it("resolves the day in the host's zone and lets it replace the weekday", () => {
    const check = publicBooking.slice(publicBooking.indexOf("async function fitsAvailability"));
    expect(check).toContain("zonedDateKey");
    // The override's ranges are used INSTEAD of the weekday's rules.
    expect(check).toMatch(/onTheDay\s*\n?\s*\?/);
    expect(check).toContain("overridesForMeeting");
  });
});
