import { describe, expect, it } from "vitest";
import { calendarFailure, calendarUnconfigured } from "./failure";

/**
 * These messages are the only diagnostic the host ever sees for a failed
 * calendar connection — /api/google/callback logs the detail server-side and
 * puts a status in the URL. The bug worth guarding against is regression to a
 * single generic sentence, so what is asserted here is that the distinct causes
 * stay distinct, and that each names its own fix.
 */
describe("calendarFailure", () => {
  it("returns nothing for success or an absent status", () => {
    expect(calendarFailure(undefined)).toBeNull();
    expect(calendarFailure("connected")).toBeNull();
  });

  it("names the test-user list for access_denied", () => {
    const f = calendarFailure("denied", "access_denied");
    expect(f?.body).toMatch(/test-user/i);
  });

  it("blames the Workspace admin, not the host, for a policy block", () => {
    const f = calendarFailure("denied", "admin_policy_enforced");
    expect(f?.body).toMatch(/administrator/i);
    expect(f?.body).not.toMatch(/try again/i);
  });

  it("carries an unrecognised Google error code through verbatim", () => {
    expect(calendarFailure("denied", "some_new_code")?.body).toContain(
      "some_new_code",
    );
  });

  it("keeps the four causes distinct from one another", () => {
    const bodies = [
      calendarFailure("denied", "access_denied"),
      calendarFailure("session"),
      calendarFailure("norefresh"),
      calendarFailure("failed"),
    ].map((f) => f?.body);

    expect(bodies.every(Boolean)).toBe(true);
    expect(new Set(bodies).size).toBe(4);
  });

  it("does not tell a timed-out host to allow access again", () => {
    // The old copy said "try again and allow calendar access" for this, which
    // sent hosts round the same loop.
    expect(calendarFailure("session")?.body).not.toMatch(/allow calendar/i);
  });
});

describe("calendarUnconfigured", () => {
  it("names the service-role key when storage is what is missing", () => {
    expect(calendarUnconfigured("storage")).toContain(
      "SUPABASE_SERVICE_ROLE_KEY",
    );
  });

  it("names the OAuth client otherwise", () => {
    expect(calendarUnconfigured()).toContain("GOOGLE_CLIENT_ID");
  });

  it("distinguishes the two", () => {
    expect(calendarUnconfigured("storage")).not.toBe(calendarUnconfigured());
  });
});
