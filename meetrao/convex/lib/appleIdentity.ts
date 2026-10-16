import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

/* ─────────────────────────────────────────────────────────────────────────────
   Sign in with Apple, from the iOS app.

   The app gets an identity token from Apple directly (no browser, no web
   redirect) and hands it here. That token is a JWT signed by Apple; it says
   who the person is only once the signature, issuer, audience, expiry and
   nonce have all been checked, and every one of them is checked below.

     · signature and expiry against Apple's published keys
     · issuer: Apple, and nobody else
     · audience: OUR bundle ID, so a token Apple issued to another app cannot
       be replayed here
     · nonce: the app sends sha256(nonce) to Apple and the raw nonce to us, so
       a token lifted from one sign-in cannot be used for another
   ───────────────────────────────────────────────────────────────────────────── */

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_KEYS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export type AppleIdentity = { sub: string; email: string | null; emailVerified: boolean };

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyAppleIdentityToken(
  identityToken: string,
  rawNonce: string,
  audience: string,
  /** Apple's published keys. A parameter only so tests can sign with their own. */
  keys: JWTVerifyGetKey = APPLE_KEYS,
): Promise<AppleIdentity> {
  const { payload } = await jwtVerify(identityToken, keys, { issuer: APPLE_ISSUER, audience });
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("Apple did not say who this is.");
  if (payload.nonce !== (await sha256Hex(rawNonce))) throw new Error("That sign-in has expired. Try again.");

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : null;
  // Apple has sent this as a boolean and as the string "true" at different times.
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  return { sub: payload.sub, email, emailVerified };
}
