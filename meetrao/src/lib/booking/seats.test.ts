import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* Group meetings: several bookings sharing one instant.
   
   The rules live in a Convex mutation and in three slot call sites, none of
   which a test here can execute — so these read the source, in the style of
   admin-booking-link.test.ts, and each one names the failure it prevents. */

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
const bookings = read("convex/bookings.ts");
const google = read("convex/google.ts");

describe("the seat guard", () => {
  it("guards the guard", () => {
    expect(bookings).toContain("export async function seatsTaken");
    expect(bookings).toContain("seatmateOf");
  });

  /* Two guests reaching for the last seat is the same race as two reaching for
     the same slot, and needs the same answer: the count and the insert inside
     one serializable mutation. A count taken in a query first would be a
     number that was true a moment ago. */
  it("counts seats inside the mutation that inserts", () => {
    const insert = bookings.slice(bookings.indexOf("export async function insertBooking"));
    const body = insert.slice(0, insert.indexOf("\n}"));
    expect(body).toContain("await seatsTaken(ctx");
    expect(body).toContain('fail("no seats left")');
    // And the overlap guard still runs first.
    expect(body.indexOf("findOverlap")).toBeLessThan(body.indexOf("seatsTaken"));
  });

  /* The exemption has to be exactly "this meeting, this instant". A looser one
     would let a workshop's seats mask a different meeting that genuinely
     clashes, which is the double-booking this product refuses to allow. */
  it("exempts only the same meeting at the same instant", () => {
    expect(bookings).toMatch(
      /!\(args\.seatmateOf && b\.meeting_type_id === args\.seatmateOf && b\.starts_at === args\.startsAt\)/,
    );
  });

  it("never exempts anything for a one-to-one meeting", () => {
    // `group` is what gates it, and it needs both a capacity and a meeting.
    expect(bookings).toMatch(/const group = capacity > 1 && args\.meetingTypeId !== null/);
    expect(bookings).toContain("seatmateOf: group ? args.meetingTypeId : null");
  });
});

describe("one calendar event between the seats", () => {
  /* Twenty identical entries stacked on a host's Tuesday makes their own
     calendar unreadable — a strange way to thank them for running a workshop. */
  it("joins a seatmate's event instead of making another", () => {
    expect(google).toContain("export const seatmateEvent");
    const create = google.slice(google.indexOf("export const createEventForBooking"));
    expect(create.slice(0, create.indexOf("\n});"))).toContain("internal.google.seatmateEvent");
  });

  /* One guest leaving a workshop must not delete it for the nineteen who are
     still coming. */
  it("keeps the event while another seat still holds it", () => {
    const del = google.slice(google.indexOf("export const deleteEventForBooking"));
    const body = del.slice(0, del.indexOf("\n});"));
    expect(body).toContain("stillHeld");
    expect(body).toMatch(/if \(stillHeld\)[\s\S]*eventId: null/);
  });
});

describe("a full slot is not offered", () => {
  /* Three places compute times, and a slot missing the filter in any one of
     them offers a seat that the mutation will then refuse — which reads to a
     guest as the product losing their booking. */
  const sites = [
    ["the hosted page", read("src/app/(public)/[username]/[slug]/page.tsx")],
    ["the embed", read("src/app/embed/[username]/[slug]/page.tsx")],
    ["the slots API", read("src/app/api/slots/route.ts")],
  ] as const;

  it.each(sites)("%s filters on seats taken", (_name, text) => {
    expect(text).toMatch(/seats\[iso\] \?\? 0\) < meeting\.capacity/);
  });

  it.each(sites)("%s stops a workshop blocking itself", (_name, text) => {
    // Its own seats in `busy` would close the slot after the first booking.
    expect(text).toMatch(/meeting\.capacity > 1 \? meeting\.id : undefined/);
  });
});
