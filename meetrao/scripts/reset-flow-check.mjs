#!/usr/bin/env node
/**
 * Password reset, as far as a script can honestly take it.
 *
 * WHAT THIS CANNOT DO, and why that is correct: the emailed code is stored as
 * a sha256 hash, so nothing but the inbox holds the plaintext. A script cannot
 * complete a reset, and a script that could would mean the codes were
 * recoverable from the database — which is the thing we want to be untrue.
 *
 * So this covers the half that is mechanisable: a reset is issued, it has an
 * expiry, the account cannot be signed into meanwhile, and a code that is not
 * the emailed one is refused. Completing a real reset is a manual check
 * against a real mailbox.
 *
 * Uses Resend's sink address, so no inbox is touched, and removes the account
 * it creates.
 */
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), ".."));

const env = {};
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const prod = process.argv.includes("--prod");
const run = (fn, args) => {
  const a = ["convex", "run", fn, JSON.stringify(args)];
  if (prod) a.push("--prod");
  return JSON.parse(execFileSync("npx", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim() || "null");
};

let bad = 0;
const check = (l, ok, d) => { console.log(`  ${ok ? "PASS" : "FAIL"}  ${l}${d ? ` — ${d}` : ""}`); if (!ok) bad++; };

/* Resend refuses example.com outright ("please use our testing email address
   instead"), and the reset flow really does send, so the throwaway account
   uses Resend's own sink. Mail to it is accepted and discarded. */
const EMAIL = `delivered+reset-check-${Date.now()}@resend.dev`;
const PASSWORD = "a-perfectly-ordinary-password-42";
const c = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);

await c.action("auth:signIn", {
  provider: "password",
  params: { email: EMAIL, password: PASSWORD, name: "Reset Check", flow: "signUp" },
});

/* The verification gate, asserted the way it actually behaves.
 *
 * Convex Auth REFUSES BY RETURN, not by throwing: an unverified account gets
 * `{ tokens: null }` rather than an error. An earlier version of this script
 * wrapped the call in try/catch and reported a failure, because nothing threw
 * — which reads exactly like "unverified accounts can sign in" and is not.
 * Check the return value, not the absence of an exception. */
const signedIn = await c.action("auth:signIn", {
  provider: "password",
  params: { email: EMAIL, password: PASSWORD, flow: "signIn" },
});
check("an unverified account gets no session", signedIn?.tokens == null, JSON.stringify(signedIn));

await c.action("auth:signIn", { provider: "password", params: { email: EMAIL, flow: "reset" } });
const issued = run("authImport:latestVerificationCode", { email: EMAIL });
check("requesting a reset issues a code", issued?.code != null);
check(
  "the code expires, and not in a month",
  issued != null && issued.expires > Date.now() && issued.expires < Date.now() + 25 * 3600_000,
  issued ? `expires in ${Math.round((issued.expires - Date.now()) / 60000)} min` : "none",
);

/* The stored value is a hash. Presenting it is presenting the wrong code, and
   the flow has to refuse it — which is simultaneously the proof that the codes
   are not recoverable from the database. */
let acceptedHash = false;
try {
  await c.action("auth:signIn", {
    provider: "password",
    params: { email: EMAIL, code: issued.code, newPassword: "another-one-entirely-77", flow: "reset-verification" },
  });
  acceptedHash = true;
} catch { /* expected */ }
check("the STORED code is not the emailed one, and is refused", !acceptedHash);

console.log("  SKIP  completing a reset — needs a real inbox, by design");
console.log("cleanup:", JSON.stringify(run("authImport:purgeNewUser", { email: EMAIL })));
process.exit(bad ? 1 : 0);
