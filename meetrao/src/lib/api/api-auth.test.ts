import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KEY_PREFIX, hashApiKey, keyPrefix, newApiKey, newWebhookSecret, signPayload } from "@/convex/lib/apiAuth";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

describe("API keys", () => {
  it("are prefixed, long, and never the same twice", () => {
    const a = newApiKey();
    const b = newApiKey();
    expect(a.startsWith(KEY_PREFIX)).toBe(true);
    expect(a.length).toBeGreaterThan(KEY_PREFIX.length + 40);
    expect(a).not.toBe(b);
  });

  it("hash to the same value every time, and to different values for different keys", async () => {
    const key = newApiKey();
    expect(await hashApiKey(key)).toBe(await hashApiKey(key));
    expect(await hashApiKey(key)).not.toBe(await hashApiKey(newApiKey()));
  });

  /* The hash is what is stored, so it must not be reversible to the key and
     must not contain it. Obvious, and worth pinning: a "hash" that was really
     an encoding would pass every other test here. */
  it("hash to something that is not the key", async () => {
    const key = newApiKey();
    const hash = await hashApiKey(key);
    expect(hash).not.toContain(key);
    expect(hash).not.toContain(key.slice(KEY_PREFIX.length));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keep a prefix long enough to tell two keys apart", () => {
    const key = newApiKey();
    expect(keyPrefix(key).startsWith(KEY_PREFIX)).toBe(true);
    expect(keyPrefix(key).length).toBeGreaterThan(KEY_PREFIX.length);
    expect(keyPrefix(key).length).toBeLessThan(key.length);
  });
});

describe("webhook signatures", () => {
  const SECRET = "whsec_test";
  const BODY = JSON.stringify({ event: "booking.created", data: { id: "b1" } });
  const AT = Date.parse("2026-09-21T09:00:00.000Z");

  /* Computed the way a RECEIVER would, with a different crypto library. A
     signature only this codebase can produce and verify is one that fails on
     somebody else's server. */
  it("match an independently computed HMAC of `timestamp.body`", async () => {
    const signature = await signPayload(SECRET, BODY, AT);
    const seconds = Math.floor(AT / 1000);

    const expected = createHmac("sha256", SECRET).update(`${seconds}.${BODY}`).digest("hex");
    expect(signature).toBe(`t=${seconds},v1=${expected}`);
  });

  it("change when the body changes", async () => {
    const a = await signPayload(SECRET, BODY, AT);
    const b = await signPayload(SECRET, BODY + " ", AT);
    expect(a).not.toBe(b);
  });

  /* The timestamp is inside the signed string, not beside it, otherwise a
     captured delivery could be replayed with a fresh one. */
  it("cover the timestamp, so a delivery cannot be replayed with a new one", async () => {
    const a = await signPayload(SECRET, BODY, AT);
    const b = await signPayload(SECRET, BODY, AT + 60_000);
    expect(a.split(",")[1]).not.toBe(b.split(",")[1]);
  });

  it("differ per endpoint, because each has its own secret", async () => {
    expect(await signPayload("whsec_a", BODY, AT)).not.toBe(await signPayload("whsec_b", BODY, AT));
    expect(newWebhookSecret()).not.toBe(newWebhookSecret());
  });
});

describe("the API is read-only", () => {
  const routes = ["src/app/api/v1/bookings/route.ts", "src/app/api/v1/meetings/route.ts"].map(read);
  const convexDoor = read("convex/apiPublic.ts");

  it("guards the guard", () => {
    for (const route of routes) expect(route).toContain("presentedKeyHash");
  });

  /* Every booking rule is enforced at a door built for guests. A write API is
     a second door that has to enforce all of them again, and the first thing
     it would grow is a way to skip one. */
  it("exports nothing but GET", () => {
    for (const route of routes) {
      expect(route).toContain("export async function GET");
      for (const verb of ["POST", "PUT", "PATCH", "DELETE"]) {
        expect(route, `${verb} appeared in a read-only route`).not.toContain(`export async function ${verb}`);
      }
    }
  });

  it("has one Convex door that writes, and it writes only a timestamp", () => {
    const mutations = convexDoor.match(/= mutation\(/g) ?? [];
    expect(mutations.length).toBe(1);
    expect(convexDoor).toContain("export const touchKey");
    expect(convexDoor).toContain("last_used_at");
  });

  it("answers the same way whether a key is missing, wrong or revoked", () => {
    const auth = read("src/lib/api/auth.ts");
    expect(auth).toContain("export function unauthorized");
    // Both routes use the one refusal rather than describing the failure.
    for (const route of routes) expect((route.match(/unauthorized\(\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
