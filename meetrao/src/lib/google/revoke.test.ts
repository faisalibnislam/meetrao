import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasCalendarWrite, revokeToken } from "@/convex/lib/googleApi";

/* ─────────────────────────────────────────────────────────────────────────────
   Disconnecting has to end the grant, not just lose our key to it.

   Deleting the token row stops Meetrao reaching the calendar. It does nothing
   about the entry in the host's Google account, and nothing about the token
   itself, which stays valid until it expires. The Privacy Policy says the grant
   ends; this is what makes that true.

   The call now lives in Convex, next to the tokens — `convex/google.ts`
   disconnect takes the refresh token out of the row and revokes it. The
   ordering that test used to guard (revoke before delete) is no longer a risk
   there, because the mutation RETURNS the token as it deletes, so the action
   cannot be left holding a deleted row and nothing to revoke with. What is
   still worth pinning down is this function's own behaviour, because every one
   of its answers is a judgement call about what "failed" means.
   ───────────────────────────────────────────────────────────────────────────── */

const calls: string[] = [];
const revokedTokens: string[] = [];

/** What the revoke endpoint answers with. Reassigned per test. */
let revokeResponse: () => Response | Promise<Response> = () => new Response("", { status: 200 });

beforeEach(() => {
  calls.length = 0;
  revokedTokens.length = 0;
  revokeResponse = () => new Response("", { status: 200 });

  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    if (String(url).includes("oauth2.googleapis.com/revoke")) {
      calls.push("revoke");
      revokedTokens.push(new URLSearchParams(String(init.body)).get("token") ?? "");
      return revokeResponse();
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("revokeToken", () => {
  it("reports success on 200", async () => {
    expect(await revokeToken("t")).toBe("revoked");
  });

  /* Google answers 400 invalid_token for a token that is already revoked or
     expired. The grant is gone, which is what we asked for — calling that a
     failure would log a warning on the most ordinary case there is. */
  it("treats an already-invalid token as done, not failed", async () => {
    revokeResponse = () => new Response(JSON.stringify({ error: "invalid_token" }), { status: 400 });
    expect(await revokeToken("t")).toBe("already-invalid");
  });

  it("reports failure on a server error", async () => {
    revokeResponse = () => new Response("", { status: 500 });
    expect(await revokeToken("t")).toBe("failed");
  });

  /* Never throws. The caller is in the middle of disconnecting a calendar or
     deleting an account, and neither may fail because Google is unreachable. */
  it("reports failure rather than throwing when the network dies", async () => {
    revokeResponse = () => {
      throw new Error("ECONNREFUSED");
    };
    expect(await revokeToken("t")).toBe("failed");
  });

  it("does not call Google with an empty token", async () => {
    expect(await revokeToken("")).toBe("already-invalid");
    expect(calls).toEqual([]);
  });

  it("posts the token as form data, and nothing else", async () => {
    await revokeToken("refresh-abc");
    expect(revokedTokens).toEqual(["refresh-abc"]);
  });
});

/* Google lets a user tick only some of the consent boxes. Without the write
   scope the guest cannot be invited, which is the whole point of connecting,
   so the callback refuses the connection rather than storing a token that
   will fail on the first booking. */
describe("hasCalendarWrite", () => {
  it("accepts the write scope", () => {
    expect(hasCalendarWrite(["https://www.googleapis.com/auth/calendar.events"])).toBe(true);
  });

  it("rejects read-only consent", () => {
    expect(hasCalendarWrite(["https://www.googleapis.com/auth/calendar.readonly"])).toBe(false);
  });

  it("rejects no calendar scope at all", () => {
    expect(hasCalendarWrite(["openid", "email"])).toBe(false);
  });
});
