import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/* The stranded-code forward runs BEFORE the auth middleware, which is the
   property under test: a code that landed on the wrong path has to be rescued
   whether or not anyone is signed in.

   Convex Auth's middleware is stubbed because it pulls in Next's middleware
   machinery, which does not resolve outside a Next build. The stub records
   that it was reached, so "left alone" can be asserted as "delegated and
   returned nothing" rather than merely "no redirect happened", which an
   accidentally dead proxy would also satisfy. */
const delegated: string[] = [];

/** The options the proxy hands the auth middleware, captured for assertion. */
type MiddlewareOptions = { shouldHandleCode?: (r: NextRequest) => boolean | Promise<boolean> };
let options: MiddlewareOptions = {};

type Handler = (
  request: NextRequest,
  ctx: {
    convexAuth: { getToken: () => Promise<string | undefined>; isAuthenticated: () => Promise<boolean> };
  },
) => Promise<unknown>;

let handler: Handler = async () => undefined;

/** Whether the request carries a session token. Reassigned per test. */
let convexSaysAuthenticated = false;

/** Paths on which the proxy asked Convex over the network. Should stay empty. */
const askedConvex: string[] = [];

vi.mock("@convex-dev/auth/nextjs/server", () => ({
  convexAuthNextjsMiddleware: (h: Handler, opts: MiddlewareOptions) => {
    options = opts ?? {};
    handler = h;
    return async (request: NextRequest) => {
      delegated.push(request.nextUrl.pathname);
      return await handler(request, {
        convexAuth: {
          getToken: async () => (convexSaysAuthenticated ? "token" : undefined),
          isAuthenticated: async () => {
            askedConvex.push(request.nextUrl.pathname);
            return convexSaysAuthenticated;
          },
        },
      });
    };
  },
}));

const { proxy } = await import("./proxy");

function get(url: string) {
  return proxy(new NextRequest(new Request(url)));
}

beforeEach(() => {
  delegated.length = 0;
  askedConvex.length = 0;
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
     then again through it. a delegated request would be redirected twice. */
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
   calendar callback and let everything else through, which left sign-up and
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
  ])("leaves %s alone, %s", async (path) => {
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

/* ─────────────────────────────────────────────────────────────────────────────
   The proxy must never send a signed-in visitor away from an auth page.

   It used to redirect /login to /dashboard as a convenience. That was one half
   of a redirect loop which took the live site down for signed-in users:

     /dashboard  requireSession asks Convex, is told the token is not good,
                 and redirects to /login
     /login      the proxy asks Convex, is told it IS good, and redirects back

   Both call Convex, so they are not simply trusting different things, the
   middleware validates the token it just REFRESHED, while the page reads the
   stale cookie from the same request. A session whose access token expired
   while its refresh token is still valid sits exactly in that gap, and the
   browser gives up with ERR_TOO_MANY_REDIRECTS.

   The half that had to go is the convenience, not the gate.
   ───────────────────────────────────────────────────────────────────────────── */
describe("proxy · a signed-in visitor is never bounced off an auth page", () => {
  it.each(["/login", "/signup", "/forgot", "/reset", "/verify"])(
    "leaves %s alone even when Convex says the session is good",
    async (path) => {
      convexSaysAuthenticated = true;
      const res = await get(`https://meetrao.com${path}`);
      expect(res.headers.get("location"), `${path} redirected a signed-in visitor`).toBeNull();
    },
  );

  /* The gate that matters is untouched: a signed-OUT visitor still cannot open
     a private screen. */
  it.each(["/dashboard", "/bookings", "/settings", "/admin", "/onboarding/1"])(
    "still sends a signed-out visitor from %s to the login page",
    async (path) => {
      convexSaysAuthenticated = false;
      const res = await get(`https://meetrao.com${path}`);
      const to = res.headers.get("location");
      expect(to, `${path} let a signed-out visitor through`).not.toBeNull();
      expect(new URL(to!).pathname).toBe("/login");
      expect(new URL(to!).searchParams.get("next")).toBe(path);
    },
  );

  it("lets a signed-in visitor into a private screen", async () => {
    convexSaysAuthenticated = true;
    expect((await get("https://meetrao.com/dashboard")).headers.get("location")).toBeNull();
  });
});

/* isAuthenticated() is a network query. It used to run on every request with
   a session, public pages and API routes included, which put a cross-region
   hop in front of every signed-in navigation. */
describe("proxy · no database round trip", () => {
  it.each(["/", "/pricing", "/sarah/intro", "/api/slots", "/booking/MR-1", "/dashboard", "/settings/profile"])(
    "%s is decided without asking Convex",
    async (path) => {
      convexSaysAuthenticated = true;
      await get(`https://meetrao.com${path}`);
      expect(askedConvex).toEqual([]);
    },
  );
});
