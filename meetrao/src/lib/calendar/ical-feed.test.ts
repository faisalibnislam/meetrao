import { describe, expect, it } from "vitest";
import {
  busyFromIcs, FeedParseError, maskFeedUrl, mergeIntervals, normalizeFeedUrl, wallClockToEpoch,
} from "@/convex/lib/icalFeed";

/* The parser behind the calendar feed: what counts as busy, in which zone. */

const NY_TZ = [
  "BEGIN:VTIMEZONE",
  "TZID:America/New_York",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function cal(...events: string[][]): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//test//EN", ...NY_TZ, ...events.flat(), "END:VCALENDAR"].join("\r\n");
}

function event(uid: string, ...lines: string[]): string[] {
  return ["BEGIN:VEVENT", `UID:${uid}`, "DTSTAMP:20261101T000000Z", "SUMMARY:Secret title", ...lines, "END:VEVENT"];
}

const utc = (s: string) => Date.parse(s);
const WINDOW = { from: utc("2026-12-01T00:00:00Z"), to: utc("2027-01-01T00:00:00Z") };

describe("busyFromIcs", () => {
  it("reads a UTC event and keeps only its times", () => {
    const busy = busyFromIcs(
      cal(event("a", "DTSTART:20261202T150000Z", "DTEND:20261202T160000Z", "DESCRIPTION:private", "LOCATION:home")),
      WINDOW,
      "UTC",
    );
    expect(busy).toEqual([{ start: utc("2026-12-02T15:00:00Z"), end: utc("2026-12-02T16:00:00Z") }]);
    expect(Object.keys(busy[0]).sort()).toEqual(["end", "start"]);
  });

  it("honours a TZID defined in the feed", () => {
    const busy = busyFromIcs(
      cal(event("b", "DTSTART;TZID=America/New_York:20261202T090000", "DTEND;TZID=America/New_York:20261202T100000")),
      WINDOW,
      "UTC",
    );
    expect(busy[0]).toEqual({ start: utc("2026-12-02T14:00:00Z"), end: utc("2026-12-02T15:00:00Z") });
  });

  it("uses an IANA TZID the feed never defined", () => {
    const text = [
      "BEGIN:VCALENDAR", "VERSION:2.0",
      ...event("c", "DTSTART;TZID=Europe/Berlin:20261202T090000", "DTEND;TZID=Europe/Berlin:20261202T100000"),
      "END:VCALENDAR",
    ].join("\r\n");
    expect(busyFromIcs(text, WINDOW, "UTC")[0].start).toBe(utc("2026-12-02T08:00:00Z"));
  });

  it("reads floating times and all-day events in the host's zone", () => {
    const busy = busyFromIcs(
      cal(
        event("d", "DTSTART:20261203T090000", "DTEND:20261203T093000"),
        event("e", "DTSTART;VALUE=DATE:20261205", "DTEND;VALUE=DATE:20261206"),
      ),
      WINDOW,
      "Asia/Dhaka",
    );
    expect(busy).toEqual([
      { start: utc("2026-12-03T03:00:00Z"), end: utc("2026-12-03T03:30:00Z") },
      { start: utc("2026-12-04T18:00:00Z"), end: utc("2026-12-05T18:00:00Z") },
    ]);
  });

  it("skips events marked free or cancelled", () => {
    const busy = busyFromIcs(
      cal(
        event("f", "DTSTART:20261202T150000Z", "DTEND:20261202T160000Z", "TRANSP:TRANSPARENT"),
        event("g", "DTSTART:20261203T150000Z", "DTEND:20261203T160000Z", "STATUS:CANCELLED"),
      ),
      WINDOW,
      "UTC",
    );
    expect(busy).toEqual([]);
  });

  it("expands RRULE, drops EXDATEs and applies moved and cancelled occurrences", () => {
    const busy = busyFromIcs(
      cal(
        event(
          "weekly",
          "DTSTART;TZID=America/New_York:20261201T100000",
          "DTEND;TZID=America/New_York:20261201T110000",
          "RRULE:FREQ=WEEKLY;COUNT=5",
          "EXDATE;TZID=America/New_York:20261208T100000",
        ),
        // The 15th moved to the afternoon.
        event(
          "weekly",
          "RECURRENCE-ID;TZID=America/New_York:20261215T100000",
          "DTSTART;TZID=America/New_York:20261215T140000",
          "DTEND;TZID=America/New_York:20261215T150000",
        ),
        // The 22nd cancelled.
        event(
          "weekly",
          "RECURRENCE-ID;TZID=America/New_York:20261222T100000",
          "DTSTART;TZID=America/New_York:20261222T100000",
          "DTEND;TZID=America/New_York:20261222T110000",
          "STATUS:CANCELLED",
        ),
      ),
      WINDOW,
      "UTC",
    );
    expect(busy).toEqual([
      { start: utc("2026-12-01T15:00:00Z"), end: utc("2026-12-01T16:00:00Z") },
      { start: utc("2026-12-15T19:00:00Z"), end: utc("2026-12-15T20:00:00Z") },
      { start: utc("2026-12-29T15:00:00Z"), end: utc("2026-12-29T16:00:00Z") },
    ]);
  });

  it("stops an endless rule at the window", () => {
    const busy = busyFromIcs(
      cal(event("daily", "DTSTART:20200101T120000Z", "DTEND:20200101T123000Z", "RRULE:FREQ=DAILY")),
      { from: utc("2026-12-01T00:00:00Z"), to: utc("2026-12-04T00:00:00Z") },
      "UTC",
    );
    expect(busy.map((b) => new Date(b.start).toISOString())).toEqual([
      "2026-12-01T12:00:00.000Z", "2026-12-02T12:00:00.000Z", "2026-12-03T12:00:00.000Z",
    ]);
  });

  it("refuses something that is not a calendar", () => {
    expect(() => busyFromIcs("<html>Sign in</html>", WINDOW, "UTC")).toThrow(FeedParseError);
  });
});

describe("mergeIntervals", () => {
  it("joins overlapping and touching blocks", () => {
    expect(mergeIntervals([{ start: 5, end: 7 }, { start: 1, end: 3 }, { start: 3, end: 4 }, { start: 6, end: 9 }])).toEqual([
      { start: 1, end: 4 }, { start: 5, end: 9 },
    ]);
  });
});

describe("wallClockToEpoch", () => {
  it("handles both sides of a DST change", () => {
    const t = { hour: 9, minute: 0, second: 0 };
    expect(wallClockToEpoch({ year: 2026, month: 7, day: 1, ...t }, "America/New_York")).toBe(utc("2026-07-01T13:00:00Z"));
    expect(wallClockToEpoch({ year: 2026, month: 12, day: 1, ...t }, "America/New_York")).toBe(utc("2026-12-01T14:00:00Z"));
  });
});

describe("the feed address", () => {
  it("accepts https and webcal, and refuses the rest", () => {
    expect(normalizeFeedUrl("webcal://p01-caldav.icloud.com/published/2/abc")).toEqual({
      ok: true, url: "https://p01-caldav.icloud.com/published/2/abc",
    });
    expect(normalizeFeedUrl("http://example.com/a.ics").ok).toBe(false);
    expect(normalizeFeedUrl("https://localhost/a.ics").ok).toBe(false);
    expect(normalizeFeedUrl("https://192.168.1.4/a.ics").ok).toBe(false);
    expect(normalizeFeedUrl("https://[::1]/a.ics").ok).toBe(false);
    expect(normalizeFeedUrl("https://user:pw@example.com/a.ics").ok).toBe(false);
    expect(normalizeFeedUrl("not a url").ok).toBe(false);
  });

  it("is masked down to its host and last four characters", () => {
    const secret = "https://calendar.google.com/calendar/ical/me%40gmail.com/private-0123456789abcdef/basic.ics";
    const masked = maskFeedUrl(secret);
    expect(masked).toBe("calendar.google.com/••••.ics");
    expect(masked).not.toContain("private-");
    expect(maskFeedUrl("https://p01-caldav.icloud.com/published/2/SECRETTOKENxyz1")).toBe("p01-caldav.icloud.com/••••xyz1");
  });
});
