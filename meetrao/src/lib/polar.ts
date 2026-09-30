import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/* ─────────────────────────────────────────────────────────────────────────────
   Polar: checkout, the customer portal, and verifying what comes back.

   Polar is a merchant of record, so it holds the customer, the card and the
   tax liability. This file is the whole surface: two calls out, one signature
   check coming in. Nothing else in the codebase talks to it.

   THE WEBHOOK IS THE ONLY THING THAT GRANTS PRO. Not the checkout return, not
   a success page, not a client callback — those are all things a browser can
   be made to say. A plan is a claim about money, and the only party that
   knows is the one that took it.
   ───────────────────────────────────────────────────────────────────────────── */

function base(): string {
  // Sandbox is a different host, not a flag on the request.
  return env().POLAR_SERVER === "sandbox" ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";
}

async function polar<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env().POLAR_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Polar refused ${path} (${response.status}): ${(await response.text()).slice(0, 300)}`);
  }
  return (await response.json()) as T;
}

export type Cadence = "monthly" | "yearly";

/**
 * A checkout session for one host.
 *
 * `external_customer_id` is the profile id, which is what ties the
 * subscription back to an account when the webhook arrives — Polar echoes it
 * on every subscription event. The email is passed so the customer does not
 * have to type an address we already know.
 */
export async function createCheckout(args: {
  cadence: Cadence;
  profileId: string;
  email: string;
  successUrl: string;
}): Promise<{ id: string; url: string }> {
  const product = args.cadence === "yearly" ? env().POLAR_PRODUCT_YEARLY : env().POLAR_PRODUCT_MONTHLY;
  if (!product) throw new Error(`No Polar product configured for ${args.cadence}.`);

  return await polar<{ id: string; url: string }>("/v1/checkouts/", {
    products: [product],
    success_url: args.successUrl,
    customer_email: args.email,
    external_customer_id: args.profileId,
    metadata: { profile_id: args.profileId },
  });
}

/**
 * A link to Polar's own portal, where a customer changes their card or
 * cancels. Building those screens here would mean holding payment details;
 * a merchant of record exists precisely so we do not.
 */
export async function customerPortalUrl(profileId: string): Promise<string> {
  const session = await polar<{ customer_portal_url: string }>("/v1/customer-sessions/", {
    external_customer_id: profileId,
  });
  return session.customer_portal_url;
}

/* ── verifying a delivery ──────────────────────────────────────────────────── */

/**
 * Standard Webhooks: `webhook-id`, `webhook-timestamp`, `webhook-signature`,
 * signing the string `id.timestamp.body` with HMAC-SHA256, base64, listed as
 * `v1,<sig>` and space-separated when several are present.
 *
 * Polar changed scheme in September 2026: secrets minted before then are keyed
 * on the UTF-8 bytes of the whole `whsec_…` string, and newer ones on the
 * base64 body after the prefix. Their own SDK tries both, so this does too —
 * a webhook that verifies only under the scheme you guessed is one that fails
 * silently on the day you rotate the secret.
 */
export function verifyPolarSignature(args: {
  secret: string;
  body: string;
  headers: { id: string | null; timestamp: string | null; signature: string | null };
  now?: number;
}): boolean {
  const { id, timestamp, signature } = args.headers;
  if (!id || !timestamp || !signature) return false;

  /* Five minutes either way. Without this a captured delivery replays
     forever, which is the whole reason the timestamp is signed. */
  const sentAt = Number(timestamp) * 1000;
  if (!Number.isFinite(sentAt)) return false;
  if (Math.abs((args.now ?? Date.now()) - sentAt) > 5 * 60_000) return false;

  const signed = `${id}.${timestamp}.${args.body}`;
  const keys = [
    // Newer: the base64 payload after the prefix.
    Buffer.from(args.secret.replace(/^whsec_/, ""), "base64"),
    // Older: the whole string, as bytes.
    Buffer.from(args.secret, "utf8"),
  ];

  const offered = signature
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.startsWith("v1,") ? part.slice(3) : part));

  for (const key of keys) {
    const expected = createHmac("sha256", key).update(signed).digest("base64");
    for (const candidate of offered) {
      const a = Buffer.from(expected);
      const b = Buffer.from(candidate);
      // Constant time, and only when the lengths already match — timingSafeEqual
      // throws otherwise, which would itself be a length oracle.
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    }
  }

  return false;
}
