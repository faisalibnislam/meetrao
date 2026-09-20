#!/usr/bin/env node
/**
 * The password reset flow, end to end.
 *
 * This became load-bearing the moment the bcrypt import was skipped: it is
 * now the ONLY way an existing password user gets back in after the cutover.
 * So it is verified rather than assumed.
 *
 * Uses a throwaway account, reads the emailed code out of the database rather
 * than an inbox, and removes everything it made. Resend's delivery half is not
 * exercised here and does not need to be — the domain is verified and every
 * other transactional email already goes through it.
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
   uses Resend's own sink. Mail to it is accepted and discarded — nobody's
   inbox is touched. */
const EMAIL = `delivered+reset-check-${Date.now()}@resend.dev`;
const SID = crypto.randomUUID();
const NEW_PASSWORD = "a-brand-new-password-9812";
const c = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);

/* An account with NO password — exactly the state the three imported users
   will be in after the cutover, since their hashes were never carried over. */
run("authImport:importUsers", {
  users: [{ supabaseId: SID, email: EMAIL, name: "Reset Check", emailVerified: true, passwordHash: null, hasGoogle: false }],
});
run("authImport:importUsers", {
  users: [{ supabaseId: SID, email: EMAIL, name: "Reset Check", emailVerified: true, passwordHash: "$2a$10$unusable.placeholder.hash.value.that.matches.nothing.abcdefg", hasGoogle: false }],
});

let signedInBefore = false;
try {
  await c.action("auth:signIn", { provider: "password", params: { email: EMAIL, password: NEW_PASSWORD, flow: "signIn" } });
  signedInBefore = true;
} catch { /* expected */ }
check("cannot sign in before resetting", !signedInBefore);

await c.action("auth:signIn", { provider: "password", params: { email: EMAIL, flow: "reset" } });
const issued = run("authImport:latestVerificationCode", { email: EMAIL });
check("requesting a reset issues a code", issued?.code != null, issued ? `expires in ${Math.round((issued.expires - Date.now()) / 60000)} min` : "none");

let reset = null;
try {
  reset = await c.action("auth:signIn", {
    provider: "password",
    params: { email: EMAIL, code: issued.code, newPassword: NEW_PASSWORD, flow: "reset-verification" },
  });
} catch (e) { check("completing the reset", false, (e?.data?.message ?? e.message ?? "").slice(0, 90)); }
check("the code completes the reset", Boolean(reset?.tokens?.token));

const after = await c.action("auth:signIn", { provider: "password", params: { email: EMAIL, password: NEW_PASSWORD, flow: "signIn" } });
check("the NEW password signs in", Boolean(after?.tokens?.token));

const asUser = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
asUser.setAuth(after.tokens.token);
const who = await asUser.query("whoami:identity", {});
check("identity still maps to the Supabase uuid", who.resolvedUserId === SID, who.resolvedUserId);

let reused = false;
try {
  await c.action("auth:signIn", { provider: "password", params: { email: EMAIL, code: issued.code, newPassword: "another-one-entirely-77", flow: "reset-verification" } });
  reused = true;
} catch { /* expected */ }
check("the code cannot be reused", !reused);

console.log("cleanup:", JSON.stringify(run("authImport:purgeUser", { supabaseId: SID })));
process.exit(bad ? 1 : 0);
