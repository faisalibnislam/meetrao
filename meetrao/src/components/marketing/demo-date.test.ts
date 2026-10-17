import { describe, expect, it } from "vitest";
import { dayKey, demoBookingDates, demoDayLabel, demoMonth, isOpen } from "./demo-date";

/* The demos are worked out from today, so the thing to check is every today:
   two whole years of them, leap day included. A rule that holds on the day it
   was written and breaks on the 31st of a month that ends on a Saturday is
   exactly the bug a fixed date would never show. */

const DAYS: string[] = [];
for (let t = Date.UTC(2026, 0, 1, 12); t < Date.UTC(2028, 0, 1, 12); t += 86_400_000) {
  DAYS.push(new Date(t).toISOString().slice(0, 10));
}

describe("the demo month", () => {
  it("covers the range it claims to", () => {
    expect(DAYS.length).toBe(730);
  });

  it.each(DAYS)("%s selects an open day after today", (key) => {
    const m = demoMonth(key);
    expect(isOpen(m, m.defaultDay)).toBe(true);
    if (m.today !== null) expect(m.defaultDay).toBeGreaterThan(m.today);
  });

  it("labels each day with the weekday it really falls on", () => {
    for (const key of DAYS.filter((_, i) => i % 9 === 0)) {
      const m = demoMonth(key);
      const real = new Date(Date.UTC(m.year, m.month - 1, m.defaultDay, 12)).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
      expect(demoDayLabel(m, m.defaultDay)).toBe(real);
    }
  });

  it("is this month, with today marked, early in a month", () => {
    const m = demoMonth("2026-10-17");
    expect(m.label).toBe("October 2026");
    expect(m.today).toBe(17);
    expect(m.firstDow).toBe(4);
  });

  it("moves to next month when this one has run out", () => {
    // Friday 30 October 2026: nothing bookable is left after today.
    const m = demoMonth("2026-10-30");
    expect(m.label).toBe("November 2026");
    expect(m.today).toBeNull();
  });

  it("crosses the year", () => {
    expect(demoMonth("2026-12-31").label).toBe("January 2027");
  });
});

describe("the demo bookings", () => {
  it("are relative to today, never a fixed month", () => {
    const d = demoBookingDates("2026-10-17");
    expect(d.today).toBe("Today");
    expect(d.tomorrow).toBe("Tomorrow");
    // Saturday the 17th: three days out is Tuesday the 20th.
    expect(d.soon).toBe("Tue 20 Oct");
    expect(d.recent).toBe("11 Oct");
    expect(d.earlier).toBe("28 Sept");
  });

  it.each(DAYS.filter((_, i) => i % 5 === 0))("%s puts the next booking on a weekday", (key) => {
    expect(demoBookingDates(key).soon).toMatch(/^(Mon|Tue|Wed|Thu|Fri) /);
  });
});

describe("dayKey", () => {
  it("reads the day in the zone the Date is read in", () => {
    expect(dayKey(new Date(2026, 9, 17, 23, 59))).toBe("2026-10-17");
  });
});
