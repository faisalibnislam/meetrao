import { describe, expect, it } from "vitest";
import { TZDate } from "@date-fns/tz";
import {
  bookableDatesInMonth,
  computeSlots,
  expandAvailability,
  isSlotBookable,
  type AvailabilityRule,
  type ComputeSlotsInput,
} from "./slots";

/* The slot engine is the one piece where a bug silently offers times the host
   cannot make, so it is tested before any UI touches it. */

const NY = "America/New_York";
const LA = "America/Los_Angeles";
const IST = "Asia/Kolkata";

/** 09:00–12:00 on Mondays, host-local. */
const MON_MORNING: AvailabilityRule[] = [{ weekday: 1, startMinute: 540, endMinute: 720 }];

/** Mon 09:00–12:00 and 14:00–17:00 — the design's default Monday. */
const MON_SPLIT: AvailabilityRule[] = [
  { weekday: 1, startMinute: 540, endMinute: 720 },
  { weekday: 1, startMinute: 840, endMinute: 1020 },
];

const RULES = {
  durationMinutes: 30,
  bufferMinutes: 0,
  minimumNoticeMinutes: 0,
  bookingWindowDays: 30,
};

/** Host-local wall clock as an instant. */
function at(tz: string, y: number, m: number, d: number, hh: number, mm = 0): Date {
  return new Date(new TZDate(y, m - 1, d, hh, mm, tz).getTime());
}

/** Renders each slot as the host's wall clock, which is what the rules speak in. */
function hostClock(slots: Date[], tz = NY): string[] {
  return slots.map((s) =>
    new TZDate(s.getTime(), tz).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    }),
  );
}

function input(over: Partial<ComputeSlotsInput> = {}): ComputeSlotsInput {
  return {
    date: { year: 2026, month: 9, day: 7 }, // a Monday
    guestTimezone: NY,
    hostTimezone: NY,
    availability: MON_MORNING,
    rules: RULES,
    busy: [],
    now: at(NY, 2026, 9, 1, 9, 0),
    ...over,
  };
}

describe("computeSlots · availability", () => {
  it("steps by the meeting duration across one range", () => {
    expect(hostClock(computeSlots(input()))).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
    ]);
  });

  it("handles multiple ranges on one day", () => {
    const slots = computeSlots(input({ availability: MON_SPLIT }));
    expect(slots).toHaveLength(12);
    expect(hostClock(slots).at(0)).toBe("09:00");
    expect(hostClock(slots).at(5)).toBe("11:30");
    expect(hostClock(slots).at(6)).toBe("14:00");
    expect(hostClock(slots).at(-1)).toBe("16:30");
  });

  it("offers nothing on a day with no availability", () => {
    // 2026-09-06 is a Sunday; the rule is Monday-only.
    expect(computeSlots(input({ date: { year: 2026, month: 9, day: 6 } }))).toEqual([]);
  });

  it("never offers a slot that would run past the end of a range", () => {
    // 09:00–12:00 with a 45-minute meeting fits 09:00, 09:45, 10:30 — 11:15
    // would end at 12:00 exactly, so it fits too; 12:00 would not.
    const slots = computeSlots(
      input({ rules: { ...RULES, durationMinutes: 45 } }),
    );
    expect(hostClock(slots)).toEqual(["09:00", "09:45", "10:30", "11:15"]);
  });

  it("anchors each range to its own start rather than to midnight", () => {
    // A range starting at 09:20 offers 09:20, not 09:00 or 09:30.
    const slots = computeSlots(
      input({ availability: [{ weekday: 1, startMinute: 560, endMinute: 680 }] }),
    );
    expect(hostClock(slots)).toEqual(["09:20", "09:50", "10:20", "10:50"]);
  });
});

describe("computeSlots · rules", () => {
  it("minimum notice cuts the near end", () => {
    const slots = computeSlots(
      input({
        now: at(NY, 2026, 9, 7, 8, 0),
        rules: { ...RULES, minimumNoticeMinutes: 120 },
      }),
    );
    expect(hostClock(slots)).toEqual(["10:00", "10:30", "11:00", "11:30"]);
  });

  it("the booking window cuts the far end", () => {
    // Asking 14 days ahead with a 7-day window returns nothing.
    const slots = computeSlots(
      input({
        date: { year: 2026, month: 9, day: 21 },
        now: at(NY, 2026, 9, 7, 9, 0),
        rules: { ...RULES, bookingWindowDays: 7 },
      }),
    );
    expect(slots).toEqual([]);
  });

  it("a busy period removes exactly the slots it overlaps", () => {
    const slots = computeSlots(
      input({ busy: [{ start: at(NY, 2026, 9, 7, 10, 0), end: at(NY, 2026, 9, 7, 10, 30) }] }),
    );
    expect(hostClock(slots)).toEqual(["09:00", "09:30", "10:30", "11:00", "11:30"]);
  });

  it("buffer applies on both sides of a busy period", () => {
    const slots = computeSlots(
      input({
        rules: { ...RULES, bufferMinutes: 15 },
        busy: [{ start: at(NY, 2026, 9, 7, 10, 0), end: at(NY, 2026, 9, 7, 10, 30) }],
      }),
    );
    // 09:30 ends at 10:00 and 10:30 starts at 10:30 — both inside the 15-minute
    // shadow, so both go.
    expect(hostClock(slots)).toEqual(["09:00", "11:00", "11:30"]);
  });

  it("a back-to-back busy period with no buffer keeps the neighbours", () => {
    const slots = computeSlots(
      input({ busy: [{ start: at(NY, 2026, 9, 7, 9, 30), end: at(NY, 2026, 9, 7, 10, 0) }] }),
    );
    expect(hostClock(slots)).toEqual(["09:00", "10:00", "10:30", "11:00", "11:30"]);
  });
});

describe("computeSlots · timezones", () => {
  it("returns the host's hours converted into the guest's zone", () => {
    const slots = computeSlots(input({ guestTimezone: IST }));
    // 09:00 New York (EDT, UTC−4) is 18:30 in Kolkata (UTC+5:30).
    expect(hostClock(slots, IST).at(0)).toBe("18:30");
    expect(slots).toHaveLength(6);
  });

  it("finds host hours that land on the guest's next calendar date", () => {
    // 16:00–18:00 Los Angeles on Monday is 04:30–06:30 Tuesday in Kolkata.
    const monday16 = computeSlots(
      input({
        hostTimezone: LA,
        guestTimezone: IST,
        availability: [{ weekday: 1, startMinute: 960, endMinute: 1080 }],
        date: { year: 2026, month: 9, day: 8 }, // the guest's Tuesday
      }),
    );
    expect(hostClock(monday16, IST)).toEqual(["04:30", "05:00", "05:30", "06:00"]);
    expect(hostClock(monday16, LA)).toEqual(["16:00", "16:30", "17:00", "17:30"]);
  });

  it("a slot that crosses a DST boundary keeps its wall-clock time", () => {
    // US DST began on 8 March 2026. Both Mondays offer 09:00 host-local; only
    // the UTC offset moves, from −05:00 to −04:00.
    const now = at(NY, 2026, 3, 1, 9, 0);
    const before = computeSlots(input({ date: { year: 2026, month: 3, day: 2 }, now }));
    const after = computeSlots(input({ date: { year: 2026, month: 3, day: 9 }, now }));

    expect(hostClock(before).at(0)).toBe("09:00");
    expect(hostClock(after).at(0)).toBe("09:00");

    expect(before[0].toISOString()).toBe("2026-03-02T14:00:00.000Z");
    expect(after[0].toISOString()).toBe("2026-03-09T13:00:00.000Z");
  });

  it("does not shift when the guest's zone changes DST but the host's does not", () => {
    // Europe/London moved to BST on 29 March 2026; New York moved on 8 March.
    const slots = computeSlots(
      input({ date: { year: 2026, month: 3, day: 30 }, guestTimezone: "Europe/London", now: at(NY, 2026, 3, 1, 9, 0) }),
    );
    expect(hostClock(slots).at(0)).toBe("09:00");
    expect(hostClock(slots, "Europe/London").at(0)).toBe("14:00");
  });
});

describe("expandAvailability", () => {
  it("only returns ranges that overlap the window", () => {
    const ranges = expandAvailability(
      MON_SPLIT,
      NY,
      at(NY, 2026, 9, 7, 0, 0),
      at(NY, 2026, 9, 8, 0, 0),
    );
    expect(ranges).toHaveLength(2);
    expect(hostClock(ranges.map((r) => r.start))).toEqual(["09:00", "14:00"]);
  });

  it("returns nothing when the host has no weekly schedule at all", () => {
    expect(expandAvailability([], NY, at(NY, 2026, 9, 7, 0, 0), at(NY, 2026, 9, 8, 0, 0))).toEqual([]);
  });
});

describe("isSlotBookable", () => {
  const base = input();

  it("accepts a slot the engine offers", () => {
    expect(isSlotBookable({ ...base, start: at(NY, 2026, 9, 7, 10, 0) })).toBe(true);
  });

  it("rejects one that has since been taken", () => {
    expect(
      isSlotBookable({
        ...base,
        busy: [{ start: at(NY, 2026, 9, 7, 10, 0), end: at(NY, 2026, 9, 7, 10, 30) }],
        start: at(NY, 2026, 9, 7, 10, 0),
      }),
    ).toBe(false);
  });

  it("rejects a time that is not on the grid at all", () => {
    expect(isSlotBookable({ ...base, start: at(NY, 2026, 9, 7, 10, 7) })).toBe(false);
  });
});

describe("bookableDatesInMonth", () => {
  it("opens only the weekdays the host actually works", () => {
    const open = bookableDatesInMonth({
      ...input(),
      year: 2026,
      month: 9,
      now: at(NY, 2026, 9, 1, 9, 0),
    });
    // Mondays in September 2026: 7, 14, 21, 28.
    expect([...open].sort()).toEqual(["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"]);
  });

  it("respects the booking window when opening days", () => {
    const open = bookableDatesInMonth({
      ...input(),
      year: 2026,
      month: 9,
      now: at(NY, 2026, 9, 1, 9, 0),
      rules: { ...RULES, bookingWindowDays: 10 },
    });
    expect([...open].sort()).toEqual(["2026-09-07"]);
  });
});
