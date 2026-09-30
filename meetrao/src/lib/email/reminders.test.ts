import { describe, expect, it } from "vitest";
import { dayPhrase, verdictFor, GRACE } from "@/convex/lib/reminderWindow";
import { renderReminder } from "@/convex/lib/reminderEmail";

/* The reminder sweep's two halves that can be run without a deployment: when a
   reminder is due, and what it says. The sweep itself takes a ctx and no test
   here can call one — verdictFor exists as a separate function so the edges
   below are covered rather than reasoned about. */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-09-21T09:00:00.000Z");

describe("when a reminder is due", () => {
  it("waits while the meeting is further off than the lead", () => {
    expect(verdictFor("24h", NOW + DAY + HOUR, NOW)).toBe("wait");
    expect(verdictFor("1h", NOW + 2 * HOUR, NOW)).toBe("wait");
  });

  it("sends the day-before reminder once inside a day", () => {
    expect(verdictFor("24h", NOW + DAY - 60_000, NOW)).toBe("send");
  });

  it("sends the hour-before reminder once inside an hour", () => {
    expect(verdictFor("1h", NOW + HOUR - 60_000, NOW)).toBe("send");
  });

  /* Booking at 09:00 for 09:30. The day-before reminder would arrive beside
     the one-hour reminder and call a meeting starting in half an hour
     "tomorrow". It is marked spent instead of sent. */
  it("never sends a 'tomorrow' reminder about something starting within the hour", () => {
    expect(verdictFor("24h", NOW + 30 * 60_000, NOW)).toBe("mark");
    expect(verdictFor("1h", NOW + 30 * 60_000, NOW)).toBe("send");
  });

  /* A sweep catching up after an outage must not announce a meeting that has
     already started — but a few minutes late is still useful. */
  it("still sends just after the start, and stops once past the grace period", () => {
    expect(verdictFor("1h", NOW - GRACE + 60_000, NOW)).toBe("send");
    expect(verdictFor("1h", NOW - GRACE - 60_000, NOW)).toBe("mark");
  });

  it("marks rather than waits for a meeting in the past, so the row settles", () => {
    // "wait" here would mean reconsidering the same row on every sweep.
    expect(verdictFor("24h", NOW - DAY, NOW)).toBe("mark");
    expect(verdictFor("1h", NOW - DAY, NOW)).toBe("mark");
  });
});

const BASE = {
  meetingName: "30 Minute Consultation",
  otherParty: "Ada Lovelace",
  whenLong: "Monday 21 Sept, 10:00 AM",
  dayPhrase: "tomorrow",
  timezoneLabel: "America/New York",
  durationLabel: "30 min",
  meetUrl: "https://meet.google.com/abc-defg-hij",
  reference: "ref-1",
  site: "https://meetrao.com",
  postalAddress: "1 Example Road, Cumilla, Bangladesh",
} as const;

describe("which day a reminder claims", () => {
  const NY = "America/New_York";
  // 21 Sept 2026 09:00 in New York.
  const nine = Date.parse("2026-09-21T13:00:00.000Z");

  it("calls a meeting later the same day 'later today'", () => {
    expect(dayPhrase(nine + 4 * HOUR, nine, NY)).toBe("later today");
  });

  it("calls the next calendar day 'tomorrow', even when it is 20 hours off", () => {
    expect(dayPhrase(nine + 20 * HOUR, nine, NY)).toBe("tomorrow");
  });

  it("names the weekday further out", () => {
    expect(dayPhrase(nine + 3 * DAY, nine, NY)).toBe("on Thursday");
  });

  /* The zone is the recipient's: 23:00 in New York is already the next day in
     Dhaka, and a guest there should be told "tomorrow". */
  it("answers in the recipient's own zone", () => {
    const lateNy = Date.parse("2026-09-22T02:30:00.000Z"); // 22:30 on the 21st in NY
    expect(dayPhrase(lateNy, nine, NY)).toBe("later today");
    expect(dayPhrase(lateNy, nine, "Asia/Dhaka")).toBe("tomorrow");
  });
});

describe("what a reminder says", () => {
  it("leaves no token unfilled", () => {
    for (const lead of ["24h", "1h"] as const) {
      for (const to of ["host", "guest"] as const) {
        const r = renderReminder({ ...BASE, lead, to });
        expect(r.html, `${to}/${lead} shipped a raw token`).not.toMatch(/\{\{[a-z_]+\}\}/);
      }
    }
  });

  it("names the lead in the subject", () => {
    expect(renderReminder({ ...BASE, lead: "1h", to: "guest" }).subject).toMatch(/^In an hour:/);
    expect(renderReminder({ ...BASE, lead: "24h", to: "guest" }).subject).toMatch(/^Tomorrow:/);
  });

  /* A real reminder went out titled "Tomorrow" about a meeting two hours
     away, because the long reminder assumed a day's notice from its own lead
     time. The phrase is a calendar fact now, and the template prints what it
     is handed. */
  it("says whatever the calendar says, not what the lead time implies", () => {
    const today = renderReminder({ ...BASE, dayPhrase: "later today", lead: "24h", to: "guest" });
    expect(today.subject).toMatch(/^Later today:/);
    expect(today.html).toContain("This is later today");
    expect(today.html).not.toContain("tomorrow");

    const friday = renderReminder({ ...BASE, dayPhrase: "on Friday", lead: "24h", to: "host" });
    expect(friday.subject).toMatch(/^On Friday:/);
  });

  it("gives each recipient a way out", () => {
    // A reminder nobody can stop is one people report as spam.
    expect(renderReminder({ ...BASE, lead: "1h", to: "host" }).html).toContain("/settings/notifications");
    expect(renderReminder({ ...BASE, lead: "1h", to: "guest" }).html).toContain("/booking/ref-1");
  });

  it("carries the postal address every message needs", () => {
    expect(renderReminder({ ...BASE, lead: "1h", to: "guest" }).html).toContain("Cumilla");
  });

  it("falls back to the booking when there is no Meet link", () => {
    const r = renderReminder({ ...BASE, meetUrl: null, lead: "1h", to: "guest" });
    expect(r.html).toContain("View your booking");
    expect(r.html).toContain("Link to follow by email");
  });

  it("escapes a guest-supplied name", () => {
    const r = renderReminder({ ...BASE, otherParty: "<script>alert(1)</script>", lead: "1h", to: "host" });
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("&lt;script&gt;");
  });
});
