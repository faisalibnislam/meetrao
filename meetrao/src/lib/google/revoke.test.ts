import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ─────────────────────────────────────────────────────────────────────────────
   Disconnecting has to end the grant, not just lose our key to it.

   Deleting the token row stops Meetrao reaching the calendar. It does nothing
   about the entry in the host's Google account, and nothing about the token
   itself, which stays valid until it expires. The Privacy Policy says the grant
   ends; this is what makes that true.

   The order is the part that can silently break. Delete first and the refresh
   token is gone before anything can be revoked with it, and the failure is
   invisible — the UI still says "disconnected", the calendar is still
   unreachable, and the grant just quietly survives in somebody's Google
   account. So the test asserts the sequence, not only the calls.
   ───────────────────────────────────────────────────────────────────────────── */

const calls: string[] = [];
const revokedTokens: string[] = [];

/** What getConnection will find. Reassigned per test. */
let row: Record<string, unknown> | null = null;

/** What the revoke endpoint answers with. Reassigned per test. */
let revokeResponse: () => Response | Promise<Response> = () => new Response("", { status: 200 });

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            calls.push("read");
            return { data: row };
          },
        }),
      }),
      delete: () => ({
        eq: async () => {
          calls.push("delete");
          return { error: null };
        },
      }),
    }),
  }),
}));

vi.mock("@/lib/env", () => ({
  env: () => ({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" }),
  siteUrl: () => "https://meetrao.com",
}));

const { disconnect } = await import("./connection");
const { revokeToken } = await import("./oauth");

beforeEach(() => {
  calls.length = 0;
  revokedTokens.length = 0;
  row = { user_id: "u1", refresh_token: "refresh-abc", access_token: "access-xyz" };
  revokeResponse = () => new Response("", { status: 200 });

  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    if (String(url).includes("oauth2.googleapis.com/revoke")) {
      calls.push("revoke");
      revokedTokens.push(new URLSearchParams(String(init.body)).get("token") ?? "");
      return revokeResponse();
    }
    throw new Error(`unexpected fetch: ${url}`);
  });

  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("disconnect", () => {
  it("revokes the grant with Google before deleting our copy", async () => {
    await disconnect("u1");
    expect(calls).toEqual(["read", "revoke", "delete"]);
  });

  /* The refresh token is the durable half of the grant. Revoking the access
     token works too — until it expires, which for an idle connection is most of
     the time. Sending the wrong one would pass a "did we call revoke" test. */
  it("sends the refresh token, not the access token", async () => {
    await disconnect("u1");
    expect(revokedTokens).toEqual(["refresh-abc"]);
  });

  it("falls back to the access token when there is no refresh token", async () => {
    row = { user_id: "u1", refresh_token: null, access_token: "access-xyz" };
    await disconnect("u1");
    expect(revokedTokens).toEqual(["access-xyz"]);
  });

  /* Google being unreachable must never leave a host unable to disconnect. Our
     copy still goes; the grant is the part they may have to finish by hand. */
  it("still deletes our copy when Google refuses", async () => {
    revokeResponse = () => new Response("nope", { status: 503 });
    await disconnect("u1");
    expect(calls).toEqual(["read", "revoke", "delete"]);
  });

  it("still deletes our copy when the network fails outright", async () => {
    revokeResponse = () => {
      throw new Error("ECONNREFUSED");
    };
    await expect(disconnect("u1")).resolves.toBeUndefined();
    expect(calls).toContain("delete");
  });

  it("does not call Google for a user who has no connection", async () => {
    row = null;
    await disconnect("u1");
    expect(calls).toEqual(["read", "delete"]);
  });
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
