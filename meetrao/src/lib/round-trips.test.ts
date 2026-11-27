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

describe("an app screen reads in one round after the session", () => {
  /* Seeding a default schedule is a write. It ran before the read on every
     visit to Availability; now only a host with no schedule pays for it. */
  it("Availability reads before it seeds", () => {
    const page = read("src/app/(app)/availability/page.tsx");
    const readAt = page.indexOf("let screen = await convex.query(api.availability.screen, {});");
    const seedAt = page.indexOf("screen.schedules.length === 0 && (await ensureDefaultAvailability(profile.id))");
    expect(readAt).toBeGreaterThan(-1);
    expect(seedAt).toBeGreaterThan(readAt);
  });

  it("the meeting form reads its plan and schedules beside the meeting", () => {
    /* And now the host's other meetings and the workspaces too, for the Link
       field: still one round, not four in a row. */
    expect(read("src/app/(app)/meetings/[id]/edit/page.tsx")).toContain(
      "const [data, pro, schedules, meetings, choices] = await Promise.all([",
    );
    expect(read("src/app/(app)/meetings/new/page.tsx")).toContain(
      "const [pro, schedules, meetings, context, choices] = await Promise.all([",
    );
  });

  /* The rail and the page used to ask for the same rows separately. */
  it("the shell and the pages share one read of meetings and plan", () => {
    const own = read("src/lib/data/own.ts");
    expect(own).toContain("export const ownMeetings = cache(async function ownMeetings()");
    expect(own).toContain("export const ownPlan = cache(async function ownPlan()");
    for (const file of [
      "src/components/app/app-shell.tsx",
      "src/app/(app)/dashboard/page.tsx",
      "src/app/(app)/meetings/page.tsx",
      "src/lib/data/links.ts",
    ]) {
      expect(read(file), file).not.toContain("api.meetingTypes.listOwn");
    }
  });

  /* Settings already has the profile from the session. */
  it("settings loaders take the profile from the session", () => {
    expect(read("src/lib/data/teams.ts")).not.toContain("api.profiles.current");
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
  const LOADER = read("src/lib/data/booking-start.ts");
  const SLOTS = read("src/app/api/slots/route.ts");
  const BOOKINGS = read("src/app/api/bookings/route.ts");
  const PUBLIC = read("src/lib/data/public-booking.ts");

  /** How many `await`s a function body contains: a rough count of hops. */
  const awaits = (body: string) => (body.match(/\bawait\b/g) ?? []).length;

  /* The hosted page and the embed widget both start here. The widget used
     to chain seven reads of its own. */
  it("the booking page and the widget make two phases of reads", () => {
    const body = LOADER.slice(LOADER.indexOf("export async function bookingStart"));
    expect(body).toContain("const [host, meeting, onCompany] = await Promise.all([");
    expect(body).toContain("const [availability, overrides, { busy }, seats, pageViewId] = await Promise.all([");
    expect(awaits(body), "every await on this page is a cross-region hop").toBeLessThanOrEqual(2);
  });

  /* A page needs one meeting; each used to list them all and fetch the rules
     for each, two trips in sequence. The list loader no longer exists. */
  it("reads one meeting, not the whole list", () => {
    expect(LOADER).toContain("getPublicMeeting(username, slug)");
    expect(PUBLIC).not.toContain("export async function getPublicMeetings");
  });

  it("rescheduling reads in phases after the booking, on the page and in the API", () => {
    for (const file of ["src/app/(public)/booking/[reference]/reschedule/page.tsx", "src/app/api/bookings/reschedule/route.ts"]) {
      const text = read(file);
      expect(text, file).toContain("const [host, meeting] = await Promise.all([");
      expect(text, file).toContain("const [availability, overrides, { busy }] = await Promise.all([");
    }
  });

  /* A team of five used to wait through ten round trips in a row. */
  it("a team's calendars are read all at once", () => {
    const team = read("src/lib/data/team-booking.ts");
    expect(team).toContain("await Promise.all(hours.map((member) => busyFor(member.userId, from, to)))");
    expect(team).not.toMatch(/for \(const member of hours\)[^\n]*await/);
  });

  it("slots, which run on every date clicked, make two phases", () => {
    expect(SLOTS).toContain("const [host, meeting] = await Promise.all([getPublicHost(username), getPublicMeeting(username, slug)]);");
    expect(SLOTS).toContain("const [availability, overrides, { busy, calendarChecked }, seats] = await Promise.all([");
  });

  it("booking creation reads in two phases before the slot re-check", () => {
    expect(BOOKINGS).toContain("const [availability, overrides, { busy }] = await Promise.all([");
    expect(BOOKINGS).not.toContain("getPublicMeetings(");
  });

  it("makes no calendar call after the booking: the invite travels with the mail", () => {
    expect(BOOKINGS).not.toContain("createEventForBooking");
    expect((BOOKINGS.match(/const meetUrl = row\.meet_url \?\? null;/g) ?? []).length).toBe(2);
  });

  /* The feed check never uses our own bookings; it must not wait for them. */
  it("busy asks our bookings and the calendar feed at the same time", () => {
    const fn = PUBLIC.slice(PUBLIC.indexOf("export async function getBusy"));
    const body = fn.slice(0, fn.indexOf("\n}\n"));
    expect(body).toContain("const [rows, feed] = await Promise.all([");
    /* Exactly one await. An `await` on the bookings query inside the array
       would still compile and still look parallel, while making the feed wait
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

/* "Connect Google Calendar" is a link to /api/google/connect, which starts
   the OAuth flow. As a <Link> it was prefetched whenever it scrolled into
   view, which ran a Convex query and overwrote the OAuth state cookie on
   every visit to the calendar settings, before anybody clicked. */
describe("a link to a route handler is never prefetched", () => {
  it("ButtonLink renders a plain anchor for /api/", () => {
    const button = read("src/components/ui/button.tsx");
    expect(button).toContain('if (typeof rest.href === "string" && rest.href.startsWith("/api/")) {');
    expect(button).toContain("<a href={rest.href} className={classes}");
  });
});

/* ── 2026-11-27 speed pass ───────────────────────────────────────────────── */

describe("the Help Centre is static", () => {
  it("does not read the session on the server", () => {
    const help = read("src/app/help/page.tsx");
    expect(help, "reading the session made /help render on every request").not.toContain("optionalSession");
    expect(help).toContain("liveAccount={{ onSignOut: signOut }}");
    expect(help).not.toMatch(/export default async function HelpPage/);
  });
});

describe("signed-out visitors cost no Convex round trip", () => {
  it("optionalSession asks Convex only when there is a token", () => {
    const session = read("src/lib/data/session.ts");
    const fn = session.slice(session.indexOf("export const optionalSession"));
    expect(fn).toContain("convexServerIfSignedIn()");
    expect(fn).toContain("if (!convex) return null;");
  });

  it("/api/me answers a signed-out visitor without asking Convex", () => {
    const me = read("src/app/api/me/route.ts");
    expect(me).toContain("convexServerIfSignedIn()");
    expect(me).not.toContain("convexServer()");
  });
});

describe("the guest pages do not fetch a meeting's hours twice", () => {
  it("reuses the hours that came back with the meeting", () => {
    for (const file of ["src/lib/data/booking-start.ts", "src/app/api/slots/route.ts"]) {
      const text = read(file);
      expect(text, file).toContain("getPublicMeetingHours(username, slug)");
      expect(text, file).not.toContain("getMeetingAvailability(meeting.id)");
    }
  });
});

describe("the calendar feed busy check is one function", () => {
  it("reads host and feed together, serves a fresh cache, and calls no nested action", () => {
    const feed = read("convex/calendarFeed.ts");
    const fn = feed.slice(feed.indexOf("export const busyForHost"), feed.indexOf("export const statusOwn"));
    expect(fn).toContain("internal.calendarFeed.feedContext");
    expect(fn).toContain("FRESH_FOR_MS");
    expect(fn, "a nested action is a second function invocation").not.toContain("ctx.runAction(");
  });
});

/* ── 2026-11-27 security pass ────────────────────────────────────────────── */

describe("server-only Convex functions", () => {
  const PUBLIC_BOOKING = read("convex/publicBooking.ts");
  const FEED = read("convex/calendarFeed.ts");
  const fnBody = (src: string, name: string) => {
    const start = src.indexOf(`export const ${name}`);
    return src.slice(start, src.indexOf("\nexport ", start + 10));
  };

  it("require the server secret", () => {
    expect(fnBody(PUBLIC_BOOKING, "busyForHost")).toContain("assertServerCall(a.secret)");
    expect(fnBody(PUBLIC_BOOKING, "recordPageView")).toContain("assertServerCall(a.secret)");
    expect(fnBody(FEED, "busyForHost")).toContain("assertServerCall(a.secret)");
  });

  it("are called with it", () => {
    for (const file of [
      "src/lib/data/public-booking.ts",
      "src/lib/data/team-booking.ts",
      "src/lib/calendar/feed.ts",
      "src/lib/data/booking-start.ts",
    ]) {
      expect(read(file), file).toContain("secret: serverSecret()");
    }
  });

  it("rate-limit page views and check the host and meeting are real", () => {
    const fn = fnBody(PUBLIC_BOOKING, "recordPageView");
    expect(fn).toContain("consume(ctx");
    expect(fn).toContain("meeting.user_id !== host.id");
  });

  it("delete a host's page views in batches", () => {
    const admin = read("convex/admin.ts");
    const purge = admin.slice(admin.indexOf("export async function purgeAccount"), admin.indexOf("export const purgePageViews"));
    expect(purge).not.toMatch(/booking_page_views[\s\S]{0,120}\.collect\(\)/);
    expect(purge).toContain("internal.admin.purgePageViews");
  });
});
