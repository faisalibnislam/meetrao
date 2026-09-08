import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

/* The stranded-code forward runs before any Supabase call, so these need no
   network and no session. Everything else in proxy() returns next() once the
   env vars are absent. */

function get(url: string) {
  return proxy(new NextRequest(new Request(url)));
}

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
  });

  it("never touches the Calendar consent callback, which has its own code", async () => {
    const res = await get("https://meetrao.com/api/google/callback?code=xyz");
    expect(res.headers.get("location")).toBeNull();
  });

  it("does not hijack a code on any other path", async () => {
    expect((await get("https://meetrao.com/booking/MR-1?code=x")).headers.get("location")).toBeNull();
  });
});
