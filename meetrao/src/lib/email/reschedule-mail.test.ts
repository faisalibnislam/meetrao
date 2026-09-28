import { describe, expect, it } from "vitest";
import { rescheduleMail, type MailableBooking } from "./booking-mail";

/* The values a "meeting moved" email prints.

   The defect worth guarding: a mail that renders the old time in one zone and
   the new one in another. Both are the host's, so "was 09:00, now 10:00" is a
   one-hour move on the page as well as in fact. */

const HOST = {
  full_name: "Adam Voigt",
  username: "adam",
  email: "adam@example.com",
  timezone: "America/New_York",
};

/** Moved from 09:00 to 10:00 New York, on the same day. */
const MOVED: MailableBooking = {
  id: "b1",
  reference: "ref-1",
  meeting_name: "30 Minute Consultation",
  duration_minutes: 30,
  guest_name: "Ada Lovelace",
  guest_email: "ada@example.com",
  guest_note: "",
  guest_timezone: "Asia/Kolkata",
  starts_at: "2026-09-21T14:00:00.000Z",
  ends_at: "2026-09-21T14:30:00.000Z",
  meet_url: "https://meet.google.com/abc-defg-hij",
};

const OLD_START = "2026-09-21T13:00:00.000Z";

describe("rescheduleMail", () => {
  it("prints both times in the host's zone", () => {
    const mail = rescheduleMail(MOVED, HOST, "guest", OLD_START);

    // 13:00Z and 14:00Z are 09:00 and 10:00 in New York.
    expect(mail.oldStartLong, "old time is not the host's wall clock").toContain("9:00");
    expect(mail.startLong, "new time is not the host's wall clock").toContain("10:00");
    // Kolkata would read 18:30 and 19:30. Neither belongs in these two lines.
    expect(mail.oldStartLong).not.toContain("6:30");
    expect(mail.startLong).not.toContain("7:30");
  });

  it("keeps the old end a duration after the old start", () => {
    const mail = rescheduleMail(MOVED, HOST, "guest", OLD_START);
    // A 30-minute meeting that was at 9: the range closes at 9:30, not at the
    // new time's end.
    expect(mail.oldStartLong).toMatch(/9:00.*9:30/);
  });

  it("names whoever moved it", () => {
    expect(rescheduleMail(MOVED, HOST, "guest", OLD_START).changedByName).toBe("Ada Lovelace");
    expect(rescheduleMail(MOVED, HOST, "host", OLD_START).changedByName).toBe("Adam Voigt");
  });

  it("carries the Meet link through, because the move keeps it", () => {
    expect(rescheduleMail(MOVED, HOST, "guest", OLD_START).meetUrl).toBe(MOVED.meet_url);
  });

  it("shows each recipient their own zone label", () => {
    const toGuest = rescheduleMail(MOVED, HOST, "guest", OLD_START);
    expect(toGuest.guestTimezoneLabel).not.toBe(toGuest.hostTimezoneLabel);
  });
});
