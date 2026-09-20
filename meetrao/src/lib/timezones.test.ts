import { describe, expect, it } from "vitest";
import { nearestSupportedTimezone, supportedTimezone, TIMEZONES } from "@/lib/timezones";

/* supportedTimezone guards the boundary where a browser-reported zone becomes
   a column the slot engine reads, so it is tested like input validation. */

describe("supportedTimezone", () => {
  it("accepts a zone the app offers", () => {
    expect(supportedTimezone("Asia/Dhaka")).toBe("Asia/Dhaka");
    expect(supportedTimezone("America/New_York")).toBe("America/New_York");
  });

  it("falls back to UTC for anything else", () => {
    for (const bad of ["", "  ", "Mars/Olympus", "'; drop table profiles; --", "UTC+6", null, undefined, 42, {}]) {
      expect(supportedTimezone(bad)).toBe("UTC");
    }
  });

  it("trims, because a hidden field can carry whitespace", () => {
    expect(supportedTimezone("  Europe/London  ")).toBe("Europe/London");
  });

  it("is case sensitive, as IANA names are", () => {
    expect(supportedTimezone("asia/dhaka")).toBe("UTC");
  });
});

describe("nearestSupportedTimezone", () => {
  it("passes through a zone already on the list", () => {
    expect(nearestSupportedTimezone("Asia/Dhaka")).toBe("Asia/Dhaka");
  });

  it("maps an unlisted zone to one at the same offset", () => {
    // Asia/Dacca is the deprecated alias for Dhaka, +06:00.
    expect(TIMEZONES).not.toContain("Asia/Dacca");
    const mapped = nearestSupportedTimezone("Asia/Dacca");
    expect(TIMEZONES).toContain(mapped as (typeof TIMEZONES)[number]);
    expect(new Intl.DateTimeFormat("en-GB", { timeZone: mapped, timeZoneName: "shortOffset" })
      .format(new Date())).toContain("GMT+6");
  });

  it("never returns something the picker cannot show", () => {
    for (const zone of ["Not/AZone", "", "Etc/GMT-14"]) {
      expect(TIMEZONES).toContain(nearestSupportedTimezone(zone) as (typeof TIMEZONES)[number]);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   The Convex mirror.

   convex/lib/zones.ts holds a copy of this list, because a Convex function
   cannot import from src/. A copy that nothing checks is a copy that drifts,
   and the drift would show up as a host's chosen timezone being silently
   rejected on one side and accepted on the other. This is the check.
   ───────────────────────────────────────────────────────────────────────────── */
describe("the Convex mirror of the zone list", () => {
  it("is identical to this one, in the same order", async () => {
    const mirror = await import("../../convex/lib/zones");
    expect(mirror.TIMEZONES).toEqual(TIMEZONES);
  });

  it("agrees about what is supported", async () => {
    const mirror = await import("../../convex/lib/zones");
    for (const zone of [...TIMEZONES, "Not/AZone", "UTC"]) {
      const here = (TIMEZONES as readonly string[]).includes(zone);
      expect(mirror.supportedZoneOrNull(zone) !== null).toBe(here);
    }
  });
});
