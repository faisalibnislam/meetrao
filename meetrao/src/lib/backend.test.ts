import { describe, expect, it, afterEach } from "vitest";
import { convexServes } from "@/lib/backend";

const set = (value: string | undefined) => {
  if (value === undefined) delete process.env.CONVEX_BACKENDS;
  else process.env.CONVEX_BACKENDS = value;
};

afterEach(() => set(undefined));

describe("which backend serves a domain", () => {
  it("is Supabase when the variable is unset", () => {
    set(undefined);
    expect(convexServes("contacts")).toBe(false);
    expect(convexServes("auth")).toBe(false);
  });

  it("is Supabase for an explicit none", () => {
    set("none");
    expect(convexServes("contacts")).toBe(false);
  });

  it("serves exactly the domains named", () => {
    set("analytics,contacts");
    expect(convexServes("analytics")).toBe(true);
    expect(convexServes("contacts")).toBe(true);
    expect(convexServes("bookings")).toBe(false);
  });

  it("tolerates spacing and case", () => {
    set(" Analytics , Contacts ");
    expect(convexServes("analytics")).toBe(true);
    expect(convexServes("contacts")).toBe(true);
  });

  /* The rule this file exists for: "all" moves data, never identity. A
     wildcard must not silently change how every person signs in. */
  it("does NOT sweep auth into all", () => {
    set("all");
    expect(convexServes("bookings")).toBe(true);
    expect(convexServes("google")).toBe(true);
    expect(convexServes("session")).toBe(true);
    expect(convexServes("auth")).toBe(false);
  });

  it("switches auth on only when it is named outright", () => {
    set("all,auth");
    expect(convexServes("auth")).toBe(true);
    set("auth");
    expect(convexServes("auth")).toBe(true);
    expect(convexServes("contacts")).toBe(false);
  });
});
