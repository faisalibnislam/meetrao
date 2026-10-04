import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/* ─────────────────────────────────────────────────────────────────────────────
   Which meetings a company's domain may serve.

   THE FAILURE THIS PREVENTS has a name and a shape. Sarah is in Acme's
   company. She also runs her own meetings: a personal one, a client she keeps
   separate, something she would not put on a client's branded page. Without a
   company on the meeting, anybody who guessed a slug could reach any of them
   through meet.acme.com, wearing Acme's logo.

   Three rules hold it, and all three are asserted here because the failure is
   silent: the page renders perfectly, it is just the wrong page on the wrong
   domain.

   1. A COMPANY'S DOMAIN SERVES ONLY ITS OWN MEETINGS. A meeting with no
      company is personal and is reachable nowhere but meetrao.com.
   2. MEETRAO.COM IS UNAFFECTED. Every meeting is reachable at its own address
      there, whichever company it belongs to, so filing one under a company
      never takes an existing link away.
   3. YOU CANNOT FILE A MEETING UNDER SOMEBODY ELSE'S COMPANY. Otherwise the
      check in rule 1 is bypassed by writing the id you want.
   ───────────────────────────────────────────────────────────────────────────── */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const PUBLIC_BOOKING = read("convex/publicBooking.ts");
const MEETING_TYPES = read("convex/meetingTypes.ts");
/* The body moved out of the route when a company got its own address:
   three addresses now render one shared component. */
const PAGE = read("src/components/booking/meeting-page.tsx");
const BACKFILL = read("convex/companiesBackfill.ts");

describe("a company domain serves only its own meetings", () => {
  /* Now part of the page's first parallel phase rather than a step of its
     own, but still decided before anything is rendered or branded. */
  it("checks before rendering anything", () => {
    expect(PAGE).toContain("meetingIsOnCompany(username, slug, company.slug)");
    expect(PAGE).toContain("if (!onCompany) notFound();");
  });

  /* Ordering matters: a check that runs after the brand is resolved is still
     a check, but one that runs after the page is built is not. */
  it("checks before the brand is chosen", () => {
    const check = PAGE.indexOf("meetingIsOnCompany(username");
    const brand = PAGE.indexOf("const brand = company ?");
    expect(check).toBeGreaterThan(-1);
    expect(brand).toBeGreaterThan(-1);
    expect(check).toBeLessThan(brand);
  });

  /* The gate only applies on a company's domain. On meetrao.com `company` is
     null and every meeting resolves, which is what keeps existing links alive. */
  it("applies only when the request arrived on a company domain", () => {
    expect(PAGE).toContain("company ? meetingIsOnCompany(username, slug, company.slug) : Promise.resolve(true)");
  });

  it("treats a personal meeting as belonging to no company", () => {
    const fn = PUBLIC_BOOKING.slice(
      PUBLIC_BOOKING.indexOf("export const meetingIsOnCompany"),
      PUBLIC_BOOKING.indexOf("/** public.get_meeting_availability"),
    );
    expect(fn).toContain("if (!meeting.company_id) return false;");
  });

  it("refuses an inactive meeting too", () => {
    const fn = PUBLIC_BOOKING.slice(
      PUBLIC_BOOKING.indexOf("export const meetingIsOnCompany"),
      PUBLIC_BOOKING.indexOf("/** public.get_meeting_availability"),
    );
    expect(fn).toContain("!meeting.is_active");
  });

  it("refuses a suspended host", () => {
    const fn = PUBLIC_BOOKING.slice(
      PUBLIC_BOOKING.indexOf("export const meetingIsOnCompany"),
      PUBLIC_BOOKING.indexOf("/** public.get_meeting_availability"),
    );
    expect(fn).toContain("host.is_suspended");
  });
});

describe("filing a meeting under a company", () => {
  /* The bypass: writing a company id you are not in would put your meeting on
     that company's branded domain. */
  it("refuses a company the caller is not in", () => {
    const fn = MEETING_TYPES.slice(
      MEETING_TYPES.indexOf("async function companyForMeeting"),
      MEETING_TYPES.indexOf("export const listOwn"),
    );
    expect(fn).toContain('query("company_members")');
    expect(fn).toContain("That is not one of your companies.");
  });

  it("is checked on create", () => {
    const fn = MEETING_TYPES.slice(
      MEETING_TYPES.indexOf("export const create"),
      MEETING_TYPES.indexOf("export const update"),
    );
    expect(fn).toContain("companyForMeeting(ctx, me, a.company_id)");
  });

  it("is checked on update", () => {
    const fn = MEETING_TYPES.slice(MEETING_TYPES.indexOf("export const update"));
    expect(fn).toContain("companyForMeeting(ctx, me, patch.company_id");
  });
});

describe("the meetings backfill", () => {
  /* A member's meetings are not touched: somebody added to a company
     publishes nothing there until they choose to. Filing their existing
     meetings would put a personal one on a client's branded page the moment
     they were added, which is the exact failure this whole file is about. */
  it("files only the owner's own meetings", () => {
    const fn = BACKFILL.slice(BACKFILL.indexOf("export const backfillMeetings"));
    expect(fn).toContain('q.eq("user_id", owner.id)');
    expect(fn, "a member's meetings must not be filed").not.toContain("company_members");
  });

  it("never moves a meeting that is already filed", () => {
    const fn = BACKFILL.slice(BACKFILL.indexOf("export const backfillMeetings"));
    expect(fn).toContain("if (m.company_id) continue;");
  });

  it("is a dry run unless told otherwise", () => {
    const fn = BACKFILL.slice(BACKFILL.indexOf("export const backfillMeetings"));
    expect(fn).toContain("const dryRun = a.dryRun !== false;");
    const write = fn.indexOf("ctx.db.patch(m._id");
    const guard = fn.indexOf("if (!dryRun)");
    expect(guard).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(write);
  });
});
