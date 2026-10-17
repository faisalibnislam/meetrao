import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TZDate } from "@date-fns/tz";
import { cleanGuests, groupByDayPart, guestProblem, weeksBefore } from "./booking-helpers";

/* The booking page's small rules, and the "Add guests" path end to end.

   The helpers are exercised directly. The rest is pinned by reading the
   source, in the style of reschedule-guards.test.ts: the guest list crosses a
   route handler, a Convex mutation and the mailer, none of which this suite
   can execute. The defect each test prevents is named on it. */

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

const iso = (zone: string, h: number, m = 0) => new Date(new TZDate(2026, 9, 19, h, m, zone).getTime()).toISOString();

describe("times grouped by part of the day", () => {
  it("groups by the hour in the zone on screen, not the server's", () => {
    // 09:00 in Dhaka is 03:00 UTC. Grouped in UTC it would still say Morning;
    // 18:00 in Dhaka is 12:00 UTC, which UTC would call Afternoon.
    const times = [iso("Asia/Dhaka", 9), iso("Asia/Dhaka", 13, 30), iso("Asia/Dhaka", 18)];
    const groups = groupByDayPart(times, "Asia/Dhaka");
    expect(groups.map((g) => g.part)).toEqual(["Morning", "Afternoon", "Evening"]);
    expect(groups.map((g) => g.times.length)).toEqual([1, 1, 1]);
  });

  it("moves a slot between groups when the zone changes", () => {
    const sixPmDhaka = iso("Asia/Dhaka", 18);
    expect(groupByDayPart([sixPmDhaka], "Asia/Dhaka")[0].part).toBe("Evening");
    expect(groupByDayPart([sixPmDhaka], "UTC")[0].part).toBe("Afternoon");
  });

  /* A heading with nothing under it reads as "there were times here". */
  it("leaves out empty groups and keeps the order of the times", () => {
    const times = [iso("UTC", 14), iso("UTC", 14, 30), iso("UTC", 15)];
    const groups = groupByDayPart(times, "UTC");
    expect(groups).toEqual([{ part: "Afternoon", times }]);
  });

  it("puts noon in the afternoon and five o'clock in the evening", () => {
    const groups = groupByDayPart([iso("UTC", 11, 45), iso("UTC", 12), iso("UTC", 16, 45), iso("UTC", 17)], "UTC");
    expect(groups.map((g) => [g.part, g.times.length])).toEqual([
      ["Morning", 1],
      ["Afternoon", 2],
      ["Evening", 1],
    ]);
  });
});

describe("calendar rows a phone hides", () => {
  // October 2026 starts on a Thursday: four blanks, then the 1st.
  const october = [null, null, null, null, ...Array.from({ length: 31 }, (_, i) => i + 1)];

  it("hides only weeks that are wholly before today, in the current month", () => {
    // Today the 19th (a Monday). Rows 0 (1-3), 1 (4-10), 2 (11-17) are gone;
    // row 3 starts on the 18th, a day before today, and still holds today.
    expect([...weeksBefore(october, 2026, 10, { year: 2026, month: 10, day: 19 })]).toEqual([0, 1, 2]);
  });

  it("keeps the row that holds today", () => {
    expect(weeksBefore(october, 2026, 10, { year: 2026, month: 10, day: 1 }).size).toBe(0);
  });

  /* A later month is all ahead; hiding its first row would hide real days. */
  it("hides nothing in any other month", () => {
    expect(weeksBefore(october, 2026, 10, { year: 2026, month: 9, day: 30 }).size).toBe(0);
  });
});

describe("the Add guests list", () => {
  it("sends each address once, lower-cased, without blanks", () => {
    expect(cleanGuests([" Ada@Example.com", "", "ada@example.com", "bo@example.com "])).toEqual([
      "ada@example.com",
      "bo@example.com",
    ]);
  });

  it("does not complain about a row left empty", () => {
    expect(guestProblem("   ", "me@example.com")).toBeNull();
  });

  it("flags an address that is not one, and the guest's own", () => {
    expect(guestProblem("not-an-email", "me@example.com")).not.toBeNull();
    expect(guestProblem("ME@example.com", "me@example.com")).toMatch(/your own email/);
    expect(guestProblem("colleague@example.com", "me@example.com")).toBeNull();
  });
});

describe("extra guests reach the booking, the event and the inbox", () => {
  const MUTATIONS = read("convex/publicBooking.ts");
  const ROUTE = read("src/app/api/bookings/route.ts");
  const SEND = read("src/lib/email/send.ts");

  /* The check that counts: the form is not the only caller of a public
     mutation. */
  it("both guest booking doors clean the list and write it", () => {
    for (const door of ["createBooking", "createTeamBooking"]) {
      const from = MUTATIONS.indexOf(`export const ${door}`);
      expect(from, `${door} has moved or been renamed`).toBeGreaterThan(-1);
      const body = MUTATIONS.slice(from, MUTATIONS.indexOf("\n});", from));
      expect(body, `${door} accepts no invitees`).toContain("invitees: v.optional(v.array(v.string()))");
      expect(body, `${door} skips the cleaning`).toContain("guestInviteesFor(meeting, a.invitees,");
      expect(body, `${door} never writes them`).toContain("await insertGuestInvitees(ctx, booking, invitees);");
    }
  });

  it("caps the list, refuses a bad address, and drops the guest's and host's own", () => {
    const clean = MUTATIONS.slice(MUTATIONS.indexOf("function cleanGuestInvitees"));
    expect(MUTATIONS).toContain("const MAX_GUEST_INVITEES = 5;");
    expect(clean).toContain("if (raw.length > MAX_GUEST_INVITEES) fail(");
    expect(clean).toContain("is not an email address.");
    expect(clean).toContain("if (skip.has(email) || seen.has(email)) continue;");
    expect(MUTATIONS).toContain("[a.guestEmail, host.email]");
    expect(MUTATIONS).toContain("[a.guestEmail, chosenEmail]");
  });

  /* A seat is one person counted against capacity. */
  it("refuses guests on a group meeting", () => {
    expect(MUTATIONS).toContain('if (invitees.length && (meeting.capacity ?? 1) > 1) fail(');
  });

  it("the route passes the list and mails every guest", () => {
    expect((ROUTE.match(/\.\.\.inviteesArg\(input\.guests\),/g) ?? []).length).toBe(2);
    expect((ROUTE.match(/\.\.\.guestMails\(mail, row\.invitees \?\? \[\]\),/g) ?? []).length).toBe(2);
  });

  /* Every guest of one booking shares its id. A key naming only the booking
     made each send after the first a reused key with a new payload, which
     Resend refuses: only the first person on the list was ever told. */
  it("guest email keys name the recipient", () => {
    expect(SEND).toContain("`booking-new-guest:${mail.bookingId}:${mail.guestEmail.toLowerCase()}`");
    expect(SEND).toContain("`booking-cancelled-guest:${mail.bookingId}:${mail.guestEmail.toLowerCase()}`");
    expect(SEND).toContain(
      "`booking-changed-guest:${mail.bookingId}:${mail.startLong}:${mail.guestEmail.toLowerCase()}`",
    );
  });
});
