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

/** The options the proxy hands the auth middleware, captured for assertion. */
type MiddlewareOptions = { shouldHandleCode?: (r: NextRequest) => boolean | Promise<boolean> };
let options: MiddlewareOptions = {};

vi.mock("@convex-dev/auth/nextjs/server", () => ({
  convexAuthNextjsMiddleware: (_handler: unknown, opts: MiddlewareOptions) => {
    options = opts ?? {};
    return async (request: NextRequest) => {
      delegated.push(request.nextUrl.pathname);
      return undefined;
    };
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

/* ─────────────────────────────────────────────────────────────────────────────
   Which `?code=` belongs to Convex Auth, and which do not.

   The middleware claims EVERY code unless told otherwise, and when redemption
   fails it deletes the parameter and CLEARS THE AUTH COOKIES. So a route
   carrying a code of its own loses it before the page can read it, and the
   visitor is signed out as well.

   This shipped twice. First it broke connecting a calendar. The fix named the
   calendar callback and let everything else through — which left sign-up and
   password reset broken in the identical way, and a real confirmation link
   arrived correct, lost its code here, and landed on a page telling the person
   they had not confirmed.

   Hence an ALLOW-LIST. A deny-list has to be extended every time a route
   starts carrying a code, and nothing fails until someone reports it.
   ───────────────────────────────────────────────────────────────────────────── */
describe("proxy · only the OAuth callback's code belongs to the auth middleware", () => {
  const ask = (url: string) => options.shouldHandleCode!(new NextRequest(new Request(url)));

  it("tells the auth middleware which codes are its own", async () => {
    await get("https://meetrao.com/dashboard");
    expect(options.shouldHandleCode, "shouldHandleCode was not passed at all").toBeTypeOf("function");
  });

  /* Google sign-in is the only OAuth flow here: Convex redeems the provider's
     code on its own domain and sends the browser here to be signed in. */
  it("claims the code on the OAuth callback", async () => {
    await get("https://meetrao.com/dashboard");
    expect(await ask("https://meetrao.com/auth/callback?code=auth-code")).toBe(true);
  });

  /* Each of these redeems its own code, and each was broken by the middleware
     taking it first. */
  it.each([
    ["/api/google/callback", "Google Calendar consent, exchanged inside Convex"],
    ["/verify", "the emailed confirmation code"],
    ["/reset", "the emailed password-reset code"],
  ])("leaves %s alone — %s", async (path) => {
    await get("https://meetrao.com/dashboard");
    expect(await ask(`https://meetrao.com${path}?email=a%40b.com&code=its-own-code`)).toBe(false);
  });

  /* The default is "claim it", so anything unlisted must come back false or
     the allow-list is not actually being applied. */
  it("claims nothing else by default", async () => {
    await get("https://meetrao.com/dashboard");
    for (const path of ["/", "/login", "/signup", "/dashboard", "/settings/calendar"]) {
      expect(await ask(`https://meetrao.com${path}?code=x`), `${path} should not be claimed`).toBe(false);
    }
  });
});
