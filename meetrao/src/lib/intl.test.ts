import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { dateFormat } from "./intl";

describe("date formatters are built once", () => {
  it("hands back the same formatter for the same locale, options and zone", () => {
    const a = dateFormat("en-US", { hour: "numeric", timeZone: "Asia/Dhaka" });
    expect(dateFormat("en-US", { hour: "numeric", timeZone: "Asia/Dhaka" })).toBe(a);
  });

  it("keeps zones apart", () => {
    const at = new Date(Date.UTC(2026, 9, 4, 12));
    expect(dateFormat("en-US", { hour: "numeric", timeZone: "Asia/Dhaka" }).format(at)).toBe("6 PM");
    expect(dateFormat("en-US", { hour: "numeric", timeZone: "America/New_York" }).format(at)).toBe("8 AM");
  });

  /* These run once per row: per booking on the dashboard and the bookings
     list, per zone in the timezone picker. A fresh formatter each time cost
     the company dashboard ~160ms of server time at 3,000 bookings. */
  it.each([
    "src/lib/company-analytics.ts",
    "src/lib/booking/time.ts",
    "src/lib/data/bookings.ts",
    "src/lib/timezones.ts",
  ])("%s builds no formatter per call", (file) => {
    const source = readFileSync(path.join(process.cwd(), file), "utf8");
    expect(source).not.toContain("new Intl.DateTimeFormat(");
  });
});
