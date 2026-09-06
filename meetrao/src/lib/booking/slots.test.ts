import { describe, expect, it } from "vitest";
import {
  bookingWindow,
  isSlotBookable,
  openDatesInWindow,
  slotsForDate,
  labelToMinutes,
  minutesToLabel,
  type SlotRules,
} from "./slots";
import { dateKeyInZone, formatTimeRange, weekdayInZone } from "./time";

/** Mon–Fri 09:00–17:00 in the host's zone. */
const NINE_TO_FIVE = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  start_minute: 9 * 60,
  end_minute: 17 * 60,
}));

function rules(over: Partial<SlotRules> = {}): SlotRules {
  return {
    hostTimezone: "Asia/Dhaka",
    rules: NINE_TO_FIVE,
    durationMinutes: 30,
    bufferMinutes: 0,
    minimumNoticeMinutes: 60,
    bookingWindowDays: 30,
    busy: [],
    // Sunday 2026-09-06, 00:00 Dhaka — far enough from any test day that
    // minimum notice never interferes unless a test asks it to.
    now: new Date("2026-09-05T18:00:00Z"),
    ...over,
  };
}

const label = (d: Date, zone = "Asia/Dhaka") =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

describe("slotsForDate", () => {
  it("fills a working day on the half hour", () => {
    // 2026-09-07 is a Monday.
    const slots = slotsForDate("2026-09-07", rules());
    expect(weekdayInZone("2026-09-07", "Asia/Dhaka")).toBe(1);
    // 09:00 through 16:30 inclusive = 16 slots.
    expect(slots).toHaveLength(16);
    expect(label(slots[0])).toBe("09:00");
    expect(label(slots.at(-1)!)).toBe("16:30");
  });

  it("returns nothing on a day with no rule", () => {
    // 2026-09-06 is a Sunday.
    expect(slotsForDate("2026-09-06", rules())).toHaveLength(0);
  });

  it("never starts a meeting that would run past the range end", () => {
    const slots = slotsForDate(
      "2026-09-07",
      rules({ durationMinutes: 60 }),
    );
    // A 60-minute meeting cannot start at 16:30.
    expect(label(slots.at(-1)!)).toBe("16:00");
  });

  it("supports two ranges on one day", () => {
    const split = slotsForDate(
      "2026-09-07",
      rules({
        rules: [
          { weekday: 1, start_minute: 9 * 60, end_minute: 12 * 60 },
          { weekday: 1, start_minute: 14 * 60, end_minute: 17 * 60 },
        ],
      }),
    );
    const times = split.map((d) => label(d));
    expect(times).toContain("11:30");
    expect(times).not.toContain("12:00");
    expect(times).not.toContain("13:30");
    expect(times).toContain("14:00");
    expect(split).toHaveLength(12);
  });
});

describe("busy time and buffers", () => {
  const busyTenToTenThirty = [
    {
      start: new Date("2026-09-07T04:00:00Z"), // 10:00 Dhaka
      end: new Date("2026-09-07T04:30:00Z"), // 10:30 Dhaka
    },
  ];

  it("removes exactly the overlapping slot when there is no buffer", () => {
    const times = slotsForDate(
      "2026-09-07",
      rules({ busy: busyTenToTenThirty }),
    ).map((d) => label(d));

    expect(times).not.toContain("10:00");
    expect(times).toContain("09:30"); // ends at 10:00 — adjacent, not overlapping
    expect(times).toContain("10:30"); // starts as the busy block ends
  });

  it("widens the blocked span by the buffer on both sides", () => {
    const times = slotsForDate(
      "2026-09-07",
      rules({ busy: busyTenToTenThirty, bufferMinutes: 15 }),
    ).map((d) => label(d));

    // Busy becomes 09:45–10:45, so 09:30, 10:00 and 10:30 all collide.
    expect(times).not.toContain("09:30");
    expect(times).not.toContain("10:00");
    expect(times).not.toContain("10:30");
    expect(times).toContain("09:00");
    expect(times).toContain("11:00");
  });
});

describe("minimum notice and booking window", () => {
  it("hides slots that start sooner than the notice period", () => {
    // 09:50 Dhaka on the Monday, with 60 minutes' notice.
    const now = new Date("2026-09-07T03:50:00Z");
    const times = slotsForDate(
      "2026-09-07",
      rules({ now, minimumNoticeMinutes: 60 }),
    ).map((d) => label(d));

    expect(times).not.toContain("10:00");
    expect(times).not.toContain("10:30"); // 10:50 is the earliest permitted
    expect(times).toContain("11:00");
  });

  it("closes the calendar at the end of the booking window", () => {
    const r = rules({ bookingWindowDays: 7 });
    const open = openDatesInWindow(r);
    const lastKey = dateKeyInZone(bookingWindow(r).end, r.hostTimezone);

    expect(open.has("2026-09-07")).toBe(true);
    // A weekday well beyond the window is closed.
    expect(open.has("2026-10-05")).toBe(false);
    for (const key of open) expect(key <= lastKey).toBe(true);
  });

  it("marks weekends closed and weekdays open", () => {
    const open = openDatesInWindow(rules());
    expect(open.has("2026-09-06")).toBe(false); // Sunday
    expect(open.has("2026-09-12")).toBe(false); // Saturday
    expect(open.has("2026-09-11")).toBe(true); // Friday
  });
});

describe("isSlotBookable", () => {
  it("accepts an instant the generator produced", () => {
    const r = rules();
    const slot = slotsForDate("2026-09-07", r)[3];
    expect(isSlotBookable(slot, r)).toBe(true);
  });

  it("rejects an off-grid instant", () => {
    const r = rules();
    const offGrid = new Date(
      slotsForDate("2026-09-07", r)[0].getTime() + 7 * 60_000,
    );
    expect(isSlotBookable(offGrid, r)).toBe(false);
  });

  it("rejects a slot that has since been taken", () => {
    const r = rules();
    const slot = slotsForDate("2026-09-07", r)[0];
    const taken = rules({
      busy: [
        {
          start: slot,
          end: new Date(slot.getTime() + 30 * 60_000),
        },
      ],
    });
    expect(isSlotBookable(slot, taken)).toBe(false);
  });

  it("rejects a slot outside the host's working days", () => {
    const r = rules();
    const sundayNine = new Date("2026-09-06T03:00:00Z");
    expect(isSlotBookable(sundayNine, r)).toBe(false);
  });
});

describe("daylight saving", () => {
  // 2026-03-08 is the US spring-forward date: 02:00 EST jumps to 03:00 EDT.
  const nyRules = rules({
    hostTimezone: "America/New_York",
    now: new Date("2026-03-01T12:00:00Z"),
    rules: [{ weekday: 0, start_minute: 0, end_minute: 6 * 60 }], // Sunday 00:00–06:00
  });

  it("skips the hour that does not exist locally", () => {
    const slots = slotsForDate("2026-03-08", nyRules);
    const local = slots.map((d) => label(d, "America/New_York"));

    // 02:00 and 02:30 do not exist on this date.
    expect(local).toContain("01:30");
    expect(local).not.toContain("02:00");
    expect(local).not.toContain("02:30");
    expect(local).toContain("03:00");

    // Every emitted slot is distinct and strictly increasing.
    const times = slots.map((d) => d.getTime());
    expect(new Set(times).size).toBe(times.length);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("keeps a fall-back day's slots distinct", () => {
    // 2026-11-01: 02:00 EDT falls back to 01:00 EST, so 01:00–02:00 repeats.
    const slots = slotsForDate("2026-11-01", nyRules);
    const times = slots.map((d) => d.getTime());
    expect(new Set(times).size).toBe(times.length);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe("time labels", () => {
  it("round-trips minutes and labels", () => {
    for (const m of [0, 9 * 60, 12 * 60, 13 * 60 + 30, 23 * 60 + 30]) {
      expect(labelToMinutes(minutesToLabel(m))).toBe(m);
    }
    expect(minutesToLabel(9 * 60)).toBe("09:00 AM");
    expect(minutesToLabel(12 * 60)).toBe("12:00 PM");
    expect(minutesToLabel(0)).toBe("12:00 AM");
  });

  it("drops the repeated meridiem in a range", () => {
    const start = new Date("2026-09-07T09:00:00Z");
    expect(
      formatTimeRange(start, new Date("2026-09-07T09:30:00Z"), "UTC"),
    ).toBe("9:00 – 9:30 AM");
    // Crossing noon keeps both.
    expect(
      formatTimeRange(
        new Date("2026-09-07T11:30:00Z"),
        new Date("2026-09-07T12:30:00Z"),
        "UTC",
      ),
    ).toBe("11:30 AM – 12:30 PM");
  });
});
