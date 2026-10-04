import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   Round trips to the database, which are what made the app feel slow.

   The app's server functions run in a different region from the database, so
   every query is a cross-region hop, and a page waits for the SUM of the
   queries it makes one after another. Measured with a temporary probe on
   every Convex call:

     · every authenticated page made two auth queries in sequence before it
       could fetch anything, the second re-reading a row the first had read;
     · in a company workspace, the company list was fetched after the session
       rather than beside it, and refetched by every loader that asked;
     · the guest booking page made up to nine queries in a row, /api/slots
       seven on every date a guest clicked, and booking creation six before
       it could even check the slot.

   These assert the STRUCTURE that fixed it, because a single `await` added in
   the wrong place puts a whole hop back and no type check or behaviour test
   will notice.
   ───────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("the session is one round trip", () => {
  it("reads identity and profile in a single query", () => {
    const session = read("src/lib/data/session.ts");
    const fn = session.slice(
      session.indexOf("export const requireSession"),
      session.indexOf("export async function requireOnboardedSession"),
    );
    expect(fn).toContain("convex.query(api.whoami.session, {})");
    expect(fn, "the second, sequential trip is gone").not.toContain("api.profiles.current");
    expect((fn.match(/convex\.query\(/g) ?? []).length, "one query, not two").toBe(1);
  });

  /* The same lookup profiles.current used, so the row cannot differ. */
  it("resolves the profile with the same helper as before", () => {
    const whoami = read("convex/whoami.ts");
    const fn = whoami.slice(whoami.indexOf("export const session"));
    expect(fn).toContain("await optionalProfile(ctx)");
    expect(fn).toContain("profile ? profileOut(profile) : null");
  });
});

describe("the workspace is asked once, and early", () => {
  const CONTEXT = read("src/lib/data/context.ts");

  it("memoises both helpers per request", () => {
    expect(CONTEXT).toContain("export const contextChoices = cache(async function contextChoices()");
    expect(CONTEXT).toContain("export const activeContext = cache(async function activeContext()");
  });

  /* Started beside the session, not after it. */
  it("starts the company list before the session is awaited", () => {
    const layout = read("src/app/(app)/layout.tsx");
    const prefetch = layout.indexOf("contextChoices().catch(() => {});");
    const session = layout.indexOf("await requireOnboardedSession()");
    expect(prefetch).toBeGreaterThan(-1);
    expect(session).toBeGreaterThan(-1);
    expect(prefetch, "the prefetch must come first").toBeLessThan(session);
  });
});

describe("the guest booking path runs in phases, not chains", () => {
  const PAGE = read("src/components/booking/meeting-page.tsx");
  const SLOTS = read("src/app/api/slots/route.ts");
  const BOOKINGS = read("src/app/api/bookings/route.ts");
  const PUBLIC = read("src/lib/data/public-booking.ts");

  /** How many `await`s a function body contains: a rough count of hops. */
  const awaits = (body: string) => (body.match(/\bawait\b/g) ?? []).length;

  it("the booking page makes two phases of reads", () => {
    const body = PAGE.slice(PAGE.indexOf("export async function MeetingPage"));
    expect(body).toContain("const [host, meeting, onCompany] = await Promise.all([");
    expect(body).toContain("const [availability, overrides, { busy }, seats, pageViewId] = await Promise.all([");
    expect(awaits(body), "every await on this page is a cross-region hop").toBeLessThanOrEqual(2);
  });

  /* The page needs one meeting; it used to list them all and fetch the rules
     for each, two trips in sequence. */
  it("reads one meeting, not the whole list", () => {
    expect(PAGE).toContain("getPublicMeeting(username, slug)");
    expect(PAGE).not.toContain("getPublicMeetings(");
  });

  it("slots, which run on every date clicked, make two phases", () => {
    expect(SLOTS).toContain("const [host, meeting] = await Promise.all([getPublicHost(username), getPublicMeeting(username, slug)]);");
    expect(SLOTS).toContain("const [availability, overrides, { busy, calendarChecked }, seats] = await Promise.all([");
  });

  it("booking creation reads in two phases before the slot re-check", () => {
    expect(BOOKINGS).toContain("const [availability, overrides, { busy }] = await Promise.all([");
    expect(BOOKINGS).not.toContain("getPublicMeetings(");
  });

  it("the calendar event and the host's mail details are fetched together", () => {
    expect((BOOKINGS.match(/const \[event, hostProfile\] = await Promise\.all\(\[/g) ?? []).length).toBe(2);
  });

  /* The Google check never used our own bookings; it only waited for them. */
  it("busy asks our bookings and Google at the same time", () => {
    const fn = PUBLIC.slice(PUBLIC.indexOf("export async function getBusy"));
    const body = fn.slice(0, fn.indexOf("\n}\n"));
    expect(body).toContain("const [rows, google] = await Promise.all([");
    /* Exactly one await. An `await` on the bookings query inside the array
       would still compile and still look parallel, while making Google wait
       for it: the precise regression this exists to prevent. */
    expect(awaits(body), "one await: both start before either is waited on").toBe(1);
  });

  /* Metadata and the page both read the host and the meeting. */
  it("memoises the reads the metadata and the page share", () => {
    for (const name of ["getPublicHost", "getPublicMeeting", "hostOnCompany", "companyBySlug"]) {
      expect(PUBLIC).toContain(`export const ${name} = cache(async function ${name}(`);
    }
  });
});
