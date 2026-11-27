import { describe, expect, it } from "vitest";
import ICAL from "ical.js";
import { buildInvite, fold, type Invite } from "./invite";
import { normalizeVideoLink } from "@/convex/lib/videoLink";

const base: Invite = {
  method: "REQUEST",
  reference: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
  sequence: 0,
  start: new Date("2026-12-02T15:00:00Z"),
  end: new Date("2026-12-02T15:30:00Z"),
  summary: "Intro call: Ada, Lovelace; and co",
  description: "Join: https://zoom.us/j/123\n\nBooked through Meetrao.",
  location: "https://zoom.us/j/123",
  url: "https://meetrao.com/booking/a1b2",
  organizer: { name: "Sam \"Host\"", email: "sam@example.com" },
  attendees: [
    { name: "Ada", email: "ada@example.com" },
    { name: "Ada again", email: "ADA@example.com" },
    { name: "Sam", email: "sam@example.com" },
  ],
  stamp: new Date("2026-11-27T12:00:00Z"),
};

function parse(ics: string) {
  const cal = new ICAL.Component(ICAL.parse(ics));
  return { cal, event: cal.getFirstSubcomponent("vevent")! };
}

describe("buildInvite", () => {
  it("produces an iTIP REQUEST a calendar can parse", () => {
    const ics = buildInvite(base);
    expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    const { cal, event } = parse(ics);
    expect(cal.getFirstPropertyValue("method")).toBe("REQUEST");
    expect(event.getFirstPropertyValue("uid")).toBe("a1b2c3d4e5f60718293a4b5c6d7e8f90@meetrao.com");
    expect(event.getFirstPropertyValue("sequence")).toBe(0);
    expect(event.getFirstPropertyValue("summary")).toBe("Intro call: Ada, Lovelace; and co");
    expect(event.getFirstPropertyValue("description")).toBe(base.description);
    expect((event.getFirstPropertyValue("dtstart") as ICAL.Time).toJSDate().toISOString()).toBe("2026-12-02T15:00:00.000Z");
    expect(event.getFirstPropertyValue("status")).toBe("CONFIRMED");
  });

  it("lists each attendee once and never the organiser", () => {
    const { event } = parse(buildInvite(base));
    const attendees = event.getAllProperties("attendee").map((p) => String(p.getFirstValue()).toLowerCase());
    expect(attendees).toEqual(["mailto:ada@example.com"]);
    expect(String(event.getFirstPropertyValue("organizer"))).toBe("mailto:sam@example.com");
  });

  it("keeps the UID and raises SEQUENCE on a move", () => {
    const { event } = parse(buildInvite({ ...base, sequence: 2 }));
    expect(event.getFirstPropertyValue("sequence")).toBe(2);
    expect(event.getFirstPropertyValue("uid")).toBe("a1b2c3d4e5f60718293a4b5c6d7e8f90@meetrao.com");
  });

  it("cancels with METHOD:CANCEL, STATUS:CANCELLED and a higher SEQUENCE", () => {
    const { cal, event } = parse(buildInvite({ ...base, method: "CANCEL", sequence: 2 }));
    expect(cal.getFirstPropertyValue("method")).toBe("CANCEL");
    expect(event.getFirstPropertyValue("status")).toBe("CANCELLED");
    expect(event.getFirstPropertyValue("sequence")).toBe(3);
  });

  it("asks no RSVP of an attendee who is already in", () => {
    const ics = buildInvite({ ...base, organizer: { name: "Meetrao", email: "support@meetrao.com" }, attendees: [{ name: "Sam", email: "sam@example.com", accepted: true }] });
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:sam@example.com");
  });
});

describe("fold", () => {
  it("never splits a multi-byte character", () => {
    const line = `SUMMARY:${"é".repeat(80)}`;
    const folded = fold(line);
    expect(folded.replace(/\r\n /g, "")).toBe(line);
    for (const part of folded.split("\r\n")) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
  });
});

describe("normalizeVideoLink", () => {
  it("accepts https links and adds the scheme when it is missing", () => {
    expect(normalizeVideoLink("zoom.us/j/123")).toEqual({ ok: true, link: "https://zoom.us/j/123" });
    expect(normalizeVideoLink(" https://meet.google.com/abc-defg-hij ")).toEqual({
      ok: true, link: "https://meet.google.com/abc-defg-hij",
    });
    expect(normalizeVideoLink("")).toEqual({ ok: true, link: null });
  });

  it("refuses anything that is not an https web address", () => {
    expect(normalizeVideoLink("http://zoom.us/j/1").ok).toBe(false);
    expect(normalizeVideoLink("javascript:alert(1)").ok).toBe(false);
    expect(normalizeVideoLink("https://user:pw@zoom.us/j/1").ok).toBe(false);
    expect(normalizeVideoLink("not a link").ok).toBe(false);
  });
});
