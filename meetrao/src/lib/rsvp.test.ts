import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* What the RSVP sweep is allowed to read.
   
   This is the one place Meetrao reads anything about a calendar event, and
   the published policy makes a narrow promise about it: by the event's own
   identifier, for events Meetrao created, never by listing or searching. The
   promise is a sentence on /privacy, /help, the FAQ and the pricing page; this
   is the part that keeps the code on the same side of it. */

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

const api = read("convex/lib/googleApi.ts");
const sweep = read("convex/rsvp.ts");

describe("the attendee read", () => {
  it("guards the guard", () => {
    expect(api, "attendeeResponse has moved or been renamed").toContain("export async function attendeeResponse");
  });

  it("asks for one event by id, never a list", () => {
    const fn = api.slice(api.indexOf("export async function attendeeResponse"));
    const call = fn.slice(0, fn.indexOf("\n}"));
    expect(call).toContain("/events/${encodeURIComponent(eventId)}");
    // events.list and a free-text search are the two shapes the promise rules
    // out. Neither may appear anywhere in the Google layer.
    expect(api).not.toMatch(/\/events\?/);
    expect(api).not.toContain("q=");
  });

  it("narrows the response to the attendee list", () => {
    // Without `fields`, Google returns the summary and description of our own
    // event too, more than the policy says we read.
    expect(api).toContain("fields=attendees(email,responseStatus)");
  });

  it("only ever passes an event id that came off a booking row", () => {
    expect(sweep).toContain("eventId: b.google_event_id as string");
    expect(sweep).toContain("b.google_event_id !== null");
  });
});

describe("what a decline does", () => {
  it("does not cancel the booking", () => {
    /* A decline is the guest's answer, not their withdrawal: the slot stays
       held and the host decides. A sweep that cancelled would delete meetings
       on the strength of a mis-click in someone's calendar. */
    expect(sweep).not.toContain('status: "cancelled"');
    expect(sweep).not.toContain("cancelAsHost");
  });

  it("tells the host once, not on every sweep", () => {
    expect(sweep).toContain("guest_rsvp_notified_at");
    expect(sweep).toMatch(/b\.guest_rsvp !== "declined"/);
  });

  it("leaves a vanished event alone", () => {
    // A host who deleted the event may have meant to; this is not the place
    // to decide their meeting is over.
    expect(sweep).toMatch(/answer === "failed" \|\| answer === "missing"/);
  });
});

describe("the published promise", () => {
  const pages = [
    ["privacy", read("src/app/(marketing)/privacy/page.tsx")],
    ["help", read("src/app/help/page.tsx")],
    ["faq", read("src/lib/faq.ts")],
    ["pricing", read("src/lib/pricing.ts")],
  ] as const;

  /* The old copy said Meetrao never reads guests, full stop. The sweep made
     that false, and copy that is narrower than the code is the kind of thing
     people discover rather than read. */
  it.each(pages)("%s no longer claims guests are never read", (_name, text) => {
    expect(text).not.toContain("Never event titles, guests");
    expect(text).not.toContain("never event titles, guests");
    expect(text).not.toContain("Titles, guests, descriptions and attachments are never read");
  });

  it("says what is read instead, on every page that raised it", () => {
    for (const [name, text] of pages) {
      expect(text.toLowerCase(), `${name} does not mention accepting or declining`).toMatch(
        /accepted or declined|whether your guest accepted|guest accepted/,
      );
    }
  });
});
