import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/* Convex verifies the token; this only has to refuse every answer that is not
   "a verified, onboarded, unsuspended host", and pass the token on intact. */
let answer: unknown = null;
let failQuery = false;
const tokens: string[] = [];

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    setAuth(token: string) {
      tokens.push(token);
    }
    async query() {
      if (failQuery) throw new Error("Unauthenticated");
      return answer;
    }
  },
}));

process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
const { appSession } = await import("./app-session");

const host = {
  id: "u1",
  email: "sam@example.com",
  is_suspended: false,
  onboarding_completed_at: "2026-01-01T00:00:00.000Z",
};

function call(authorization?: string) {
  const headers = new Headers(authorization ? { authorization } : {});
  return appSession(new NextRequest(new Request("https://meetrao.com/api/app/bookings/cancel", { method: "POST", headers })));
}

async function status(result: Awaited<ReturnType<typeof appSession>>) {
  return result instanceof NextResponse ? result.status : 200;
}

beforeEach(() => {
  answer = { authenticated: true, emailVerified: true, email: host.email, profile: host };
  failQuery = false;
  tokens.length = 0;
});

describe("the iOS app's session", () => {
  it("lets a signed-in host through, with Convex holding their token", async () => {
    const result = await call("Bearer jwt-abc");
    expect(await status(result)).toBe(200);
    expect(tokens).toEqual(["jwt-abc"]);
  });

  it.each([undefined, "", "Basic abc", "Bearer "])("refuses %j with 401", async (header) => {
    expect(await status(await call(header))).toBe(401);
  });

  it("refuses a token Convex will not accept", async () => {
    failQuery = true;
    expect(await status(await call("Bearer forged"))).toBe(401);
  });

  it.each([
    ["signed out", { authenticated: false }, 401],
    ["unverified", { authenticated: true, emailVerified: false, profile: host }, 403],
    ["no profile", { authenticated: true, emailVerified: true, profile: null }, 403],
    ["suspended", { authenticated: true, emailVerified: true, profile: { ...host, is_suspended: true } }, 403],
    ["not onboarded", { authenticated: true, emailVerified: true, profile: { ...host, onboarding_completed_at: null } }, 403],
  ])("refuses a host who is %s", async (_name, who, code) => {
    answer = who;
    expect(await status(await call("Bearer jwt"))).toBe(code);
  });
});
