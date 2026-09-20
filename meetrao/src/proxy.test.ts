import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/* The stranded-code forward runs BEFORE the auth middleware, which is the
   property under test: a code that landed on the wrong path has to be rescued
   whether or not anyone is signed in.

   Convex Auth's middleware is stubbed because it pulls in Next's middleware
   machinery, which does not resolve outside a Next build. The stub records
   that it was reached, so "left alone" can be asserted as "delegated and
   returned nothing" rather than merely "no redirect happened" — which an
   accidentally dead proxy would also satisfy. */
const delegated: string[] = [];

vi.mock("@convex-dev/auth/nextjs/server", () => ({
  convexAuthNextjsMiddleware: () => async (request: NextRequest) => {
    delegated.push(request.nextUrl.pathname);
    return undefined;
  },
  nextjsMiddlewareRedirect: () => undefined,
}));

const { proxy } = await import("./proxy");

function get(url: string) {
  return proxy(new NextRequest(new Request(url)));
}

beforeEach(() => {
  delegated.length = 0;
});

describe("proxy · an OAuth code stranded on the site root", () => {
  it("forwards a code on / to the callback, keeping the query", async () => {
    const res = await get("https://meetrao.com/?code=abc123");
    expect(res.status).toBe(307);
    const to = new URL(res.headers.get("location")!);
    expect(to.pathname).toBe("/auth/callback");
    expect(to.searchParams.get("code")).toBe("abc123");
  });

  it("forwards an OAuth error too, so it reaches the login page", async () => {
    const res = await get("https://meetrao.com/?error=access_denied");
    expect(new URL(res.headers.get("location")!).pathname).toBe("/auth/callback");
  });

  it("leaves the landing page alone when there is no code", async () => {
    expect((await get("https://meetrao.com/")).headers.get("location")).toBeNull();
    expect(delegated).toEqual(["/"]);
  });

  it("never touches the Calendar consent callback, which has its own code", async () => {
    const res = await get("https://meetrao.com/api/google/callback?code=xyz");
    expect(res.headers.get("location")).toBeNull();
    expect(delegated).toEqual(["/api/google/callback"]);
  });

  it("does not hijack a code on any other path", async () => {
    expect((await get("https://meetrao.com/booking/MR-1?code=x")).headers.get("location")).toBeNull();
    expect(delegated).toEqual(["/booking/MR-1"]);
  });

  /* The forward must happen INSTEAD of the auth middleware, not before it and
     then again through it — a delegated request would be redirected twice. */
  it("forwards without consulting the auth middleware at all", async () => {
    await get("https://meetrao.com/?code=abc123");
    expect(delegated).toEqual([]);
  });
});
