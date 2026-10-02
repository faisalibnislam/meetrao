import { describe, expect, it } from "vitest";
import { LOCATION_KINDS, LOCATION_OPTIONS, isLocationKind, needsMeetLink, whereText } from "./locations";

/* The list is written twice (here and in convex/lib/locations.ts) because a
   Convex function cannot import from src/. The same arrangement the timezone
   list has, and the same failure if the two drift: a meeting saved as a phone
   call that the booking door does not recognise. */

describe("the two location lists", () => {
  it("say the same thing", async () => {
    const convex = await import("@/convex/lib/locations");
    expect([...convex.LOCATION_KINDS]).toEqual([...LOCATION_KINDS]);
  });

  it("offer every kind to the host", () => {
    expect(LOCATION_OPTIONS.map((o) => o.value).sort()).toEqual([...LOCATION_KINDS].sort());
  });

  it("refuses a kind nobody offers", () => {
    expect(isLocationKind("google_meet")).toBe(true);
    expect(isLocationKind("carrier-pigeon")).toBe(false);
  });
});

describe("what gets a Meet link", () => {
  /* Asking Google for a conference on a meeting that happens in a room puts a
     video link in front of a guest who is supposed to turn up somewhere. */
  it("is Meet, and only Meet", () => {
    expect(needsMeetLink("google_meet")).toBe(true);
    for (const kind of ["phone", "in_person", "custom"]) expect(needsMeetLink(kind)).toBe(false);
  });
});

describe("the Where line", () => {
  it("shows the link for a Meet, without its scheme", () => {
    expect(whereText("google_meet", "", "https://meet.google.com/abc-defg-hij")).toBe("meet.google.com/abc-defg-hij");
  });

  it("promises the link by email when there is not one yet", () => {
    expect(whereText("google_meet", "", null)).toBe("Link to follow by email");
  });

  it("names the number, the room, or the arrangement", () => {
    expect(whereText("phone", "+880 1711-000000", null)).toBe("Phone: +880 1711-000000");
    expect(whereText("in_person", "12 Example Road", null)).toBe("12 Example Road");
    expect(whereText("custom", "Zoom link in the invite", null)).toBe("Zoom link in the invite");
  });

  it("still says something when the host left the detail empty", () => {
    expect(whereText("phone", "", null)).toBe("Phone call");
    expect(whereText("in_person", "", null)).toBe("In person");
    expect(whereText("custom", "", null)).toBe("Details to follow");
  });

  it("never shows a Meet link for a meeting that is not one", () => {
    // The snapshot on an old booking can hold a stale link; the kind wins.
    expect(whereText("phone", "+880 1711-000000", "https://meet.google.com/abc")).not.toContain("meet.google.com");
  });
});
