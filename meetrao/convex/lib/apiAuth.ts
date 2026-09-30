/* ─────────────────────────────────────────────────────────────────────────────
   API keys and webhook signatures.

   Pure, and separate from the functions that use them, so both can be tested:
   a signature scheme nobody can run in a test is one nobody checks until a
   receiver rejects every delivery.
   ───────────────────────────────────────────────────────────────────────────── */

/** Visible on the key itself, so a leaked string is identifiable at a glance. */
export const KEY_PREFIX = "mk_live_";

export function newApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return KEY_PREFIX + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function newWebhookSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "whsec_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** What is stored. The key itself is never written down after it is shown. */
export function hashApiKey(key: string): Promise<string> {
  return sha256Hex(key.trim());
}

/** The first characters, for telling two keys apart in a list. */
export function keyPrefix(key: string): string {
  return key.slice(0, KEY_PREFIX.length + 6);
}

/**
 * `t=<unix seconds>,v1=<hex hmac of "t.body">`.
 *
 * The timestamp is inside the signed string, not beside it, so a captured
 * delivery cannot be replayed with a fresh timestamp — which is the whole
 * reason to sign a timestamp at all. Stripe's scheme, and Resend's inbound
 * one in src/lib/email/inbound.ts, both work this way.
 */
export async function signPayload(secret: string, body: string, atMs: number): Promise<string> {
  const seconds = Math.floor(atMs / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${seconds}.${body}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${seconds},v1=${hex}`;
}
