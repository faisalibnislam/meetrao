import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { APP_AUTH_REDIRECT, resolveRedirect } from "@/convex/lib/authRedirect";
import { sha256Hex, verifyAppleIdentityToken } from "@/convex/lib/appleIdentity";
import { apnsConfig, apnsHost, apnsPayload, isDeadToken } from "@/convex/lib/apns";
import { pushWanted } from "@/convex/lib/effects";

/* ─────────────────────────────────────────────────────────────────────────────
   What the backend does for the iOS app. Each of these is a door, and each
   test is a way the door could be left open.
   ───────────────────────────────────────────────────────────────────────────── */

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
const SITE = "https://meetrao.com";

describe("where Google sign-in may land", () => {
  it("lets the app's own callback through, exactly", () => {
    expect(resolveRedirect(APP_AUTH_REDIRECT, SITE)).toBe("meetrao://auth");
  });

  /* A scheme can be claimed by any app on the phone. The narrower the address,
     the less a look-alike can do with it. */
  it.each(["meetrao://auth/x", "meetrao://evil", "meetrao:auth", "other://auth", "https://evil.example/auth"])(
    "refuses %s",
    (target) => {
      expect(() => resolveRedirect(target, SITE)).toThrow();
    },
  );

  it("keeps Convex Auth's own rule for the web", () => {
    expect(resolveRedirect("/auth/callback", SITE)).toBe("https://meetrao.com/auth/callback");
    expect(resolveRedirect("?x=1", SITE)).toBe("https://meetrao.com?x=1");
    expect(resolveRedirect("https://meetrao.com/dashboard", SITE)).toBe("https://meetrao.com/dashboard");
    expect(() => resolveRedirect("https://meetrao.com.evil.example/", SITE)).toThrow();
  });

  it("is the callback Convex Auth actually uses", () => {
    expect(read("convex/auth.ts")).toContain('return resolveRedirect(redirectTo, process.env.SITE_URL ?? "");');
  });
});

describe("Sign in with Apple from the app", async () => {
  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "test", alg: "ES256" };
  const keys = createLocalJWKSet({ keys: [jwk] });
  const AUD = "com.meetrao.app";
  const NONCE = "raw-nonce-123";

  async function token(claims: Record<string, unknown>, over: { iss?: string; aud?: string } = {}) {
    return await new SignJWT(claims)
      .setProtectedHeader({ alg: "ES256", kid: "test" })
      .setIssuer(over.iss ?? "https://appleid.apple.com")
      .setAudience(over.aud ?? AUD)
      .setSubject("001234.apple-user")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
  }

  it("accepts Apple's token for this app and this sign-in", async () => {
    const t = await token({ email: "Sam@Example.com", email_verified: "true", nonce: await sha256Hex(NONCE) });
    expect(await verifyAppleIdentityToken(t, NONCE, AUD, keys)).toEqual({
      sub: "001234.apple-user",
      email: "sam@example.com",
      emailVerified: true,
    });
  });

  it("refuses a token Apple issued to another app", async () => {
    const t = await token({ nonce: await sha256Hex(NONCE) }, { aud: "com.other.app" });
    await expect(verifyAppleIdentityToken(t, NONCE, AUD, keys)).rejects.toThrow();
  });

  it("refuses a token from anyone but Apple", async () => {
    const t = await token({ nonce: await sha256Hex(NONCE) }, { iss: "https://evil.example" });
    await expect(verifyAppleIdentityToken(t, NONCE, AUD, keys)).rejects.toThrow();
  });

  /* A token lifted from one sign-in must not work for another. */
  it("refuses a token minted for a different nonce", async () => {
    const t = await token({ nonce: await sha256Hex("someone-else") });
    await expect(verifyAppleIdentityToken(t, NONCE, AUD, keys)).rejects.toThrow(/expired/);
  });

  it("refuses a token signed with a key Apple never published", async () => {
    const other = await generateKeyPair("ES256");
    const forged = await new SignJWT({ nonce: await sha256Hex(NONCE) })
      .setProtectedHeader({ alg: "ES256", kid: "test" })
      .setIssuer("https://appleid.apple.com")
      .setAudience(AUD)
      .setSubject("x")
      .setExpirationTime("5m")
      .sign(other.privateKey);
    await expect(verifyAppleIdentityToken(forged, NONCE, AUD, keys)).rejects.toThrow();
  });

  /* Linking by email is only safe when Apple vouches for the address. */
  it("links to an existing account only when Apple says the email is verified", () => {
    expect(read("convex/auth.ts")).toContain("shouldLinkViaEmail: apple.emailVerified,");
  });

  it("stays off until APPLE_BUNDLE_ID is set", () => {
    expect(read("convex/auth.ts")).toContain('if (!audience) throw new Error("Sign in with Apple is not available yet.");');
  });
});

describe("push", () => {
  it("is off until every APNs setting is present", () => {
    expect(apnsConfig({})).toBeNull();
    expect(apnsConfig({ APNS_KEY_ID: "K", APNS_TEAM_ID: "T", APNS_BUNDLE_ID: "com.meetrao.app" })).toBeNull();
    expect(
      apnsConfig({ APNS_KEY_ID: "K", APNS_TEAM_ID: "T", APNS_PRIVATE_KEY: "a\\nb", APNS_BUNDLE_ID: "com.meetrao.app" }),
    ).toEqual({ keyId: "K", teamId: "T", privateKey: "a\nb", topic: "com.meetrao.app" });
  });

  it("sends a token to the host it was issued for", () => {
    expect(apnsHost("sandbox")).toBe("https://api.sandbox.push.apple.com");
    expect(apnsHost("production")).toBe("https://api.push.apple.com");
  });

  it("carries the booking the alert should open", () => {
    const payload = JSON.parse(apnsPayload({ title: "New booking", body: "Sam, Tue 3:00 PM", bookingId: "b1" }));
    expect(payload).toEqual({
      aps: { alert: { title: "New booking", body: "Sam, Tue 3:00 PM" }, sound: "default", "thread-id": "bookings" },
      bookingId: "b1",
    });
  });

  it("forgets tokens APNs says are dead, and only those", () => {
    expect(isDeadToken(410, undefined)).toBe(true);
    expect(isDeadToken(400, "BadDeviceToken")).toBe(true);
    expect(isDeadToken(429, "TooManyRequests")).toBe(false);
    expect(isDeadToken(500, "InternalServerError")).toBe(false);
  });

  /* One switch silences both, so somebody who turned off cancellation emails
     is not woken by a cancellation push. */
  it.each([
    ["booking_new", "notify_new_booking"],
    ["booking_cancelled", "notify_booking_cancelled"],
    ["booking_changed", "notify_booking_changed"],
    ["booking_declined", "notify_booking_changed"],
  ] as const)("%s follows %s", (kind, pref) => {
    const off = { notify_new_booking: true, notify_booking_changed: true, notify_booking_cancelled: true, [pref]: false };
    expect(pushWanted(off, kind)).toBe(false);
    expect(pushWanted({ ...off, [pref]: true }, kind)).toBe(true);
  });

  it("is scheduled after the write, never awaited inside it", () => {
    const effects = read("convex/lib/effects.ts");
    expect(effects).toContain("await ctx.scheduler.runAfter(0, internal.pushNode.deliver, {");
    expect(read("convex/pushNode.ts").startsWith('"use node";')).toBe(true);
  });

  it("a device can only be removed by its own account", () => {
    expect(read("convex/push.ts")).toContain("if (row && row.user_id === me.id) await ctx.db.delete(row._id);");
  });
});

describe("cancel and move from the app", () => {
  /* The app and the web must do the same thing: the same order, the same
     emails, the same calendar update. One implementation, two doors. */
  it("both doors use one implementation", () => {
    const actions = read("src/lib/actions/bookings.ts");
    expect(actions).toContain("await cancelAsHost(await convexServer(), session.profile, bookingId)");
    expect(actions).toContain("await moveAsHost(await convexServer(), session.profile, bookingId, date, time)");
    expect(read("src/app/api/app/bookings/cancel/route.ts")).toContain("await cancelAsHost(session.convex, session.profile, parsed.data.id)");
    expect(read("src/app/api/app/bookings/move/route.ts")).toContain("await moveAsHost(session.convex, session.profile, id, date, time)");
  });

  it("every app route checks the session first", () => {
    for (const file of ["src/app/api/app/bookings/cancel/route.ts", "src/app/api/app/bookings/move/route.ts"]) {
      const text = read(file);
      expect(text.indexOf("await appSession(request)")).toBeLessThan(text.indexOf("request.json()"));
    }
  });
});
