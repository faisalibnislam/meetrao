import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { dayKey, summarise, type AnalyticsBooking, type AnalyticsMember } from "./company-analytics";

/* ─────────────────────────────────────────────────────────────────────────────
   The company dashboard's arithmetic.

   These are not source-shape assertions. `summarise` is a function of its
   arguments, including `now`, so every claim here is a real count over real
   rows, which is the only kind of test worth having on an analytics screen: a
   wrong number is invisible in a way a wrong list is not.

   The cases that earn their place are the ones where a reasonable
   implementation gets it wrong:

   · A MEETING THAT HAS NOT HAPPENED is not work done. Counting it would make
     every Monday morning look like a good week.
   · A CANCELLATION IS NOT A GAP. Dropping cancelled rows on the way in would
     delete the only measure on the screen that says something is going wrong.
   · MIDNIGHT IS LOCAL. A meeting at 23:30 in London belongs to that day, not
     to the next one in UTC, and the difference shows up for half the year.
   · A DAY WITH NOTHING ON IT is a column, not a missing column.
   ───────────────────────────────────────────────────────────────────────────── */

const HOUR = 3_600_000;
const DAY = 86_400_000;

/** A fixed Wednesday 12:00 UTC, so "today" is a thing a test can say. */
const NOW = Date.parse("2026-10-07T12:00:00Z");

function booking(over: Partial<AnalyticsBooking> = {}): AnalyticsBooking {
  return {
    hostId: "u1",
    startsAt: NOW - 2 * HOUR,
    endsAt: NOW - HOUR,
    durationMinutes: 60,
    status: "confirmed",
    cancelledBy: null,
    meetingName: "Intro call",
    guestName: "Sam",
    guestEmail: "sam@example.com",
    createdAt: NOW - 3 * DAY,
    ...over,
  };
}

function member(over: Partial<AnalyticsMember> = {}): AnalyticsMember {
  return { userId: "u1", name: "Priya", handle: "priya", role: "member", activeLinks: 1, ...over };
}

const opts = { now: NOW, timezone: "Europe/London", days: 30 };
const run = (b: AnalyticsBooking[], m: AnalyticsMember[] = [member()]) => summarise(b, m, opts);

describe("today", () => {
  it("counts what is on today and what is still to come", () => {
    const out = run([
      booking({ startsAt: NOW - 3 * HOUR, endsAt: NOW - 2 * HOUR }),
      booking({ startsAt: NOW + 2 * HOUR, endsAt: NOW + 3 * HOUR }),
      booking({ startsAt: NOW + 4 * HOUR, endsAt: NOW + 5 * HOUR }),
    ]);
    expect(out.today.total).toBe(3);
    expect(out.today.remaining).toBe(2);
  });

  /* A meeting that started an hour ago and runs for two is still happening,
     and a dashboard that calls it finished is wrong about the present. */
  it("counts a meeting in progress as still to come", () => {
    const out = run([booking({ startsAt: NOW - HOUR, endsAt: NOW + HOUR })]);
    expect(out.today.remaining).toBe(1);
  });

  it("leaves a cancellation out of today", () => {
    const out = run([booking({ status: "cancelled", cancelledBy: "guest" })]);
    expect(out.today.total).toBe(0);
  });

  /* 23:30 in London is the 7th. In UTC during BST it is the 7th at 22:30,
     which is the same day; the case that breaks a naive implementation is the
     one where local time has already rolled over and UTC has not. */
  it("buckets a late meeting on the local day, not the UTC one", () => {
    const lateInTokyo = Date.parse("2026-10-07T16:00:00Z"); // 01:00 on the 8th in Tokyo
    expect(dayKey(lateInTokyo, "Asia/Tokyo")).toBe("2026-10-08");
    expect(dayKey(lateInTokyo, "Europe/London")).toBe("2026-10-07");

    const out = summarise([booking({ startsAt: lateInTokyo, endsAt: lateInTokyo + HOUR })], [member()], {
      ...opts,
      timezone: "Asia/Tokyo",
    });
    expect(out.today.total, "it is tomorrow in Tokyo").toBe(0);
  });
});

describe("the window", () => {
  /* The measure of work done. A meeting next Tuesday is not work done, and
     counting it would make every Monday look like a good week. */
  it("counts only what has already started as held", () => {
    const out = run([
      booking({ startsAt: NOW - 5 * DAY }),
      booking({ startsAt: NOW + 5 * DAY, endsAt: NOW + 5 * DAY + HOUR }),
    ]);
    expect(out.window.held).toBe(1);
    expect(out.window.minutes).toBe(60);
  });

  it("ignores what fell out of the back of the window", () => {
    const out = run([booking({ startsAt: NOW - 40 * DAY }), booking({ startsAt: NOW - 2 * DAY })]);
    expect(out.window.held).toBe(1);
  });

  /* The one signal on this screen that says something is going wrong.
     Filtering cancellations on the way in would delete it. */
  it("keeps cancellations and rates them against everything booked", () => {
    const out = run([
      booking({ startsAt: NOW - DAY }),
      booking({ startsAt: NOW - DAY }),
      booking({ startsAt: NOW - DAY }),
      booking({ startsAt: NOW - DAY, status: "cancelled", cancelledBy: "guest" }),
    ]);
    expect(out.window.held).toBe(3);
    expect(out.window.cancelled).toBe(1);
    expect(out.window.cancelRate).toBeCloseTo(0.25);
  });

  it("rates nothing as nothing rather than dividing by zero", () => {
    expect(run([]).window.cancelRate).toBe(0);
  });

  /* Repeat guests are the thing worth knowing, so this counts people and not
     bookings, and an address is an address whatever its capitals. */
  it("counts a repeat guest once", () => {
    const out = run([
      booking({ startsAt: NOW - DAY, guestEmail: "sam@example.com" }),
      booking({ startsAt: NOW - 2 * DAY, guestEmail: "SAM@example.com" }),
      booking({ startsAt: NOW - 3 * DAY, guestEmail: "ada@example.com" }),
    ]);
    expect(out.window.people).toBe(2);
  });

  /* Measured off the bookings that were kept: a cancelled one says when
     somebody changed their mind, not how far ahead this company gets booked. */
  it("takes the median notice from held bookings", () => {
    const out = run([
      booking({ startsAt: NOW - DAY, createdAt: NOW - DAY - 2 * HOUR }),
      booking({ startsAt: NOW - DAY, createdAt: NOW - DAY - 4 * HOUR }),
      booking({ startsAt: NOW - DAY, createdAt: NOW - DAY - 6 * HOUR }),
      booking({ startsAt: NOW - DAY, createdAt: NOW - 40 * DAY, status: "cancelled", cancelledBy: "host" }),
    ]);
    expect(out.window.medianNoticeHours).toBe(4);
  });

  it("has no median when nothing was held", () => {
    expect(run([]).window.medianNoticeHours).toBeNull();
  });
});

describe("who is up next", () => {
  it("is the soonest confirmed meeting, whoever it belongs to", () => {
    const people = [member({ userId: "u1", name: "Priya" }), member({ userId: "u2", name: "Tom" })];
    const out = run(
      [
        booking({ hostId: "u1", startsAt: NOW + 5 * HOUR, endsAt: NOW + 6 * HOUR }),
        booking({ hostId: "u2", startsAt: NOW + 2 * HOUR, endsAt: NOW + 3 * HOUR }),
      ],
      people,
    );
    expect(out.upNext[0].memberName).toBe("Tom");
    expect(out.upNext[1].memberName).toBe("Priya");
  });

  it("never offers a meeting that has already started", () => {
    const out = run([booking({ startsAt: NOW - HOUR, endsAt: NOW + HOUR })]);
    expect(out.upNext).toHaveLength(0);
  });

  it("skips a cancellation", () => {
    const out = run([
      booking({ startsAt: NOW + HOUR, status: "cancelled", cancelledBy: "guest" }),
      booking({ startsAt: NOW + 2 * HOUR }),
    ]);
    expect(out.upNext).toHaveLength(1);
    expect(out.upNext[0].startsAt).toBe(NOW + 2 * HOUR);
  });
});

describe("per day", () => {
  /* Walked as a calendar rather than grouped from the rows, so a quiet day is
     a gap in the chart instead of a column that is not there. */
  it("has a column for a day with nothing on it", () => {
    const out = run([booking({ startsAt: NOW - 2 * DAY })]);
    const keys = out.perDay.map((d) => d.key);
    expect(new Set(keys).size, "no day appears twice").toBe(keys.length);
    expect(out.perDay.find((d) => d.key === dayKey(NOW - DAY, "Europe/London"))?.count).toBe(0);
    expect(out.perDay.find((d) => d.key === dayKey(NOW - 2 * DAY, "Europe/London"))?.count).toBe(1);
  });

  it("runs from the start of the window to a fortnight ahead", () => {
    const out = run([]);
    expect(out.perDay[0].key).toBe(dayKey(NOW - 30 * DAY, "Europe/London"));
    expect(out.perDay[out.perDay.length - 1].key).toBe(dayKey(NOW + 13 * DAY, "Europe/London"));
  });

  it("carries what is coming, not only what has been", () => {
    const out = run([booking({ startsAt: NOW + 3 * DAY, endsAt: NOW + 3 * DAY + HOUR })]);
    expect(out.perDay.find((d) => d.key === dayKey(NOW + 3 * DAY, "Europe/London"))?.count).toBe(1);
  });
});

describe("per person", () => {
  it("splits the work by who held it", () => {
    const people = [member({ userId: "u1", name: "Priya" }), member({ userId: "u2", name: "Tom" })];
    const out = run(
      [
        booking({ hostId: "u1", startsAt: NOW - DAY }),
        booking({ hostId: "u1", startsAt: NOW - 2 * DAY, durationMinutes: 30 }),
        booking({ hostId: "u2", startsAt: NOW - DAY }),
      ],
      people,
    );
    const priya = out.members.find((m) => m.userId === "u1")!;
    expect(priya.held).toBe(2);
    expect(priya.minutes).toBe(90);
    expect(out.members.find((m) => m.userId === "u2")!.held).toBe(1);
  });

  /* The question the screen was asked to answer: who has a meeting next. */
  it("orders people by whose meeting comes first", () => {
    const people = [member({ userId: "u1", name: "Priya" }), member({ userId: "u2", name: "Tom" })];
    const out = run(
      [
        booking({ hostId: "u1", startsAt: NOW + 6 * HOUR, endsAt: NOW + 7 * HOUR }),
        booking({ hostId: "u2", startsAt: NOW + HOUR, endsAt: NOW + 2 * HOUR }),
      ],
      people,
    );
    expect(out.members.map((m) => m.name)).toEqual(["Tom", "Priya"]);
  });

  /* Somebody with nothing booked sorts last rather than first, which is what
     comparing a null against a number gets you if you are not careful.

     ASSERTED FROM BOTH INPUT ORDERS on purpose. A comparator that treats a
     missing meeting as one value on the left and another on the right is
     inconsistent, and an inconsistent comparator still returns the right
     answer for some inputs: with two members V8 compares them once, so
     exactly one of the two orders below comes out looking correct. Checking
     one order lets that through. */
  it("puts somebody with nothing booked at the end, whichever way round they arrive", () => {
    const idle = member({ userId: "u2", name: "Idle" });
    const busy = member({ userId: "u1", name: "Busy" });
    const rows = [booking({ hostId: "u1", startsAt: NOW + HOUR, endsAt: NOW + 2 * HOUR })];

    for (const people of [
      [idle, busy],
      [busy, idle],
    ]) {
      const out = run(rows, people);
      expect(out.members.map((m) => m.name)).toEqual(["Busy", "Idle"]);
      expect(out.members[1].next).toBeNull();
    }
  });

  /* Two people with nothing booked must not make the comparator return NaN
     and silently stop ordering: it falls through to work held, then name. */
  it("still orders two people who both have nothing booked", () => {
    const people = [member({ userId: "u2", name: "Zoe" }), member({ userId: "u1", name: "Ada" })];
    // Nothing ahead for either, so the tiebreaks decide: work held, then name.
    expect(run([], people).members.map((m) => m.name)).toEqual(["Ada", "Zoe"]);
    expect(
      run([booking({ hostId: "u2", startsAt: NOW - 2 * DAY })], people).members.map((m) => m.name),
      "the one who held more comes first",
    ).toEqual(["Zoe", "Ada"]);
  });

  it("appears even with nothing at all", () => {
    const out = run([], [member({ userId: "u9", name: "New" })]);
    expect(out.members).toHaveLength(1);
    expect(out.members[0].held).toBe(0);
  });
});

describe("what to do about it", () => {
  /* The failure the People screen exists to make visible, said again here in
     the one place somebody looks every morning. */
  it("names somebody whose handle answers nothing", () => {
    const out = run([], [member({ name: "Tom", handle: "tom", activeLinks: 0 })]);
    expect(out.flags[0]).toMatchObject({ kind: "no-links", who: "Tom" });
    expect(out.flags[0].detail).toContain("/tom");
  });

  it("does not call somebody idle when the real problem is they have no link", () => {
    const out = run([], [member({ activeLinks: 0 })]);
    expect(out.flags.filter((f) => f.kind === "idle")).toHaveLength(0);
  });

  it("names somebody with a link and nothing booked", () => {
    const out = run([], [member({ name: "Tom", activeLinks: 2 })]);
    expect(out.flags.some((f) => f.kind === "idle" && f.who === "Tom")).toBe(true);
  });

  /* Only when there is somebody to compare against and enough meetings for
     the share to mean anything. */
  it("says nothing about load with one person", () => {
    const out = run(
      Array.from({ length: 8 }, () => booking({ startsAt: NOW - DAY })),
      [member()],
    );
    expect(out.flags.some((f) => f.kind === "overloaded")).toBe(false);
  });

  it("names the person carrying most of the work", () => {
    const people = [member({ userId: "u1", name: "Priya" }), member({ userId: "u2", name: "Tom" })];
    const out = run(
      [
        ...Array.from({ length: 7 }, () => booking({ hostId: "u1", startsAt: NOW - DAY })),
        booking({ hostId: "u2", startsAt: NOW - DAY }),
      ],
      people,
    );
    const flag = out.flags.find((f) => f.kind === "overloaded");
    expect(flag?.who).toBe("Priya");
    expect(flag?.detail).toContain("88%");
  });

  it("says nothing about load when it is even", () => {
    const people = [member({ userId: "u1", name: "Priya" }), member({ userId: "u2", name: "Tom" })];
    const out = run(
      [
        ...Array.from({ length: 3 }, () => booking({ hostId: "u1", startsAt: NOW - DAY })),
        ...Array.from({ length: 3 }, () => booking({ hostId: "u2", startsAt: NOW - DAY })),
      ],
      people,
    );
    expect(out.flags.some((f) => f.kind === "overloaded")).toBe(false);
  });

  it("names somebody losing more than they keep", () => {
    const out = run([
      booking({ startsAt: NOW - DAY }),
      booking({ startsAt: NOW - DAY, status: "cancelled", cancelledBy: "guest" }),
      booking({ startsAt: NOW - 2 * DAY, status: "cancelled", cancelledBy: "guest" }),
    ]);
    expect(out.flags.some((f) => f.kind === "cancellations")).toBe(true);
  });
});

describe("what gets booked, and when", () => {
  it("ranks meetings by how often they are taken", () => {
    const out = run([
      booking({ startsAt: NOW - DAY, meetingName: "Intro call" }),
      booking({ startsAt: NOW - DAY, meetingName: "Intro call" }),
      booking({ startsAt: NOW - DAY, meetingName: "Review", durationMinutes: 45 }),
    ]);
    expect(out.byMeeting[0]).toEqual({ name: "Intro call", count: 2, minutes: 120 });
    expect(out.byMeeting[1]).toEqual({ name: "Review", count: 1, minutes: 45 });
  });

  it("puts a weekday and an hour where the viewer lives", () => {
    // 09:30 UTC on a Wednesday is 10:30 in London, still Wednesday.
    const at = Date.parse("2026-10-07T09:30:00Z");
    const out = run([booking({ startsAt: at, endsAt: at + HOUR })]);
    expect(out.byWeekday[3]).toBe(1); // Sunday is 0
    expect(out.byHour[10]).toBe(1);
  });

  /* Midnight is the hour an implementation gets wrong. The modulo in hourIn
     guards against ICU builds that format it as "24", which this Node does
     not do, so what is actually asserted here is the bucket: midnight is
     hour zero and the array is 24 long. */
  it("files midnight as hour zero", () => {
    // 23:30 UTC on the 6th is 00:30 on the 7th in London, and already past.
    const at = Date.parse("2026-10-06T23:30:00Z");
    const out = run([booking({ startsAt: at, endsAt: at + HOUR })]);
    expect(out.byHour).toHaveLength(24);
    expect(out.byHour[0]).toBe(1);
    expect(out.byHour.reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe("the chart knows which column is today", () => {
  /* The screen puts the "Today" label over a column by index, so the first
     future day has to be the one after today and not today itself. A meeting
     later on today still belongs to a day that has started. */
  it("marks today as past and tomorrow as future", () => {
    const out = run([]);
    const i = out.perDay.findIndex((d) => d.future);
    expect(i).toBeGreaterThan(0);
    expect(out.perDay[i - 1].key, "the last non-future day is today").toBe(dayKey(NOW, "Europe/London"));
    expect(out.perDay[i].key).toBe(dayKey(NOW + DAY, "Europe/London"));
  });

  it("marks nothing in the window behind as future", () => {
    const out = run([]);
    expect(out.perDay.slice(0, 30).every((d) => !d.future)).toBe(true);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   The query behind it.

   Everything above is arithmetic over rows handed in. These three are about
   which rows get handed in at all, which no amount of pure testing can reach.
   ───────────────────────────────────────────────────────────────────────────── */

describe("which rows reach the maths", () => {
  const QUERY = readFileSync(path.join(process.cwd(), "convex/companyAnalytics.ts"), "utf8");

  /* A member's personal bookings are not this company's business. Without
     this an agency owner is told about meetings on a domain they have
     nothing to do with. */
  it("takes this company's bookings, not the host's", () => {
    expect(QUERY).toContain('if ((b.company_id ?? null) !== company.id) continue;');
  });

  /* A host with three years of history would otherwise be read in full every
     time somebody opens the screen. */
  it("ranges the index rather than collecting a whole history", () => {
    expect(QUERY).toContain('q.eq("host_id", profile.id).gte("starts_at", from).lte("starts_at", to)');
  });

  /* Readable by any member: somebody in a company can already see who is in
     it and read their own bookings. Not readable by anybody else, and the
     refusal is a not-found so ids cannot be probed. */
  it("is readable by a member and nobody outside", () => {
    expect(QUERY).toContain("roleIn(ctx, company, me)");
    expect(QUERY).toContain('if (!role) AuthError("No such company.", "NOT_FOUND");');
    expect(QUERY, "a member must not be refused").not.toContain('role === "member"');
  });

  /* One query must not be able to read a year. */
  it("caps the window", () => {
    expect(QUERY).toContain("Math.min(Math.max(Math.round(a.days ?? 30), 1), MAX_DAYS)");
  });
});
