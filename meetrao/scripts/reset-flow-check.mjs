#!/usr/bin/env node
/**
 * Password reset, end to end, through the mail that is actually sent.
 *
 * The emailed code is stored sha256-hashed, so the database cannot tell you
 * what went out. Resend can: it keeps the rendered body of every message, so
 * this reads the code the recipient would have read and finishes the reset.
 * That is the whole point of the check — "a code was issued" proves very
 * little, and the reset is the only way back in for anyone who forgets a
 * password.
 *
 * Uses Resend's sink address, so no inbox is touched, and removes the account
 * it creates.
 */
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { codeFromEmail, latestEmailTo } from "./lib/inbox.mjs";

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), ".."));

/* .env.local names the DEV deployment, so a real process.env wins over it —
   otherwise `--prod` reached the convex-run half while the ConvexHttpClient
   kept talking to dev, and the two halves silently disagreed about which
   database they were checking. A green run that proved nothing. */
const env = {};
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
Object.assign(env, Object.fromEntries(Object.entries(process.env).filter(([, v]) => v)));
const prod = process.argv.includes("--prod");
const run = (fn, args) => {
  const a = ["convex", "run", fn, JSON.stringify(args)];
  if (prod) a.push("--prod");
  return JSON.parse(execFileSync("npx", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim() || "null");
};

let bad = 0;
const check = (l, ok, d) => { console.log(`  ${ok ? "PASS" : "FAIL"}  ${l}${d ? ` — ${d}` : ""}`); if (!ok) bad++; };

/* Resend refuses example.com outright ("please use our testing email address
   instead"), and these flows really do send, so the throwaway account uses
   Resend's own sink. Mail to it is accepted and discarded. */
const EMAIL = `delivered+reset-check-${Date.now()}@resend.dev`;
const PASSWORD = "a-perfectly-ordinary-password-42";
const NEW_PASSWORD = "a-brand-new-password-9812";
const c = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);

await c.action("auth:signIn", {
  provider: "password",
  params: { email: EMAIL, password: PASSWORD, name: "Reset Check", flow: "signUp" },
});

/* Convex Auth REFUSES BY RETURN, not by throwing: an unverified account gets
   `{ tokens: null }` rather than an error. An earlier version of this script
   wrapped the call in try/catch and reported a failure because nothing threw —
   which reads exactly like "unverified accounts can sign in" and is not. Check
   the return value, not the absence of an exception. */
const beforeVerify = await c.action("auth:signIn", {
  provider: "password",
  params: { email: EMAIL, password: PASSWORD, flow: "signIn" },
});
check("an unverified account gets no session", beforeVerify?.tokens == null, JSON.stringify(beforeVerify));

// ── the verification email ──────────────────────────────────────────────────
const verifyMail = await latestEmailTo(EMAIL, env.RESEND_API_KEY);
check("a verification email was sent", verifyMail != null, verifyMail?.subject);
check("it is ours, not Auth.js's default", verifyMail?.subject === "Confirm your email", verifyMail?.subject);
check("it carries the postal address anti-spam law requires", (verifyMail?.html ?? "").includes("Cumilla"));
/* The footer used to offer one, pointing at /settings/notifications — an
   account the recipient has not activated yet. An unsubscribe that cannot work
   is worse than none, and this message is transactional anyway. */
check("it does not offer a dead unsubscribe link", !/unsubscribe/i.test(verifyMail?.html ?? ""));

const verifyCode = codeFromEmail(verifyMail);
check("the link carries a code", verifyCode != null);

const verified = await c.action("auth:signIn", {
  provider: "password",
  params: { email: EMAIL, code: verifyCode, flow: "email-verification" },
});
check("the emailed code verifies the account and signs it in", Boolean(verified?.tokens?.token));

// ── the reset email ─────────────────────────────────────────────────────────
await c.action("auth:signIn", { provider: "password", params: { email: EMAIL, flow: "reset" } });
const resetMail = await latestEmailTo(EMAIL, env.RESEND_API_KEY);
check("a reset email was sent", resetMail?.subject === "Reset your Meetrao password", resetMail?.subject);
check("it points at /reset, which reads email and code", /\/reset\?email=/.test(resetMail?.html ?? ""));

const resetCode = codeFromEmail(resetMail);
check("the reset link carries its own code", resetCode != null && resetCode !== verifyCode);

const reset = await c.action("auth:signIn", {
  provider: "password",
  params: { email: EMAIL, code: resetCode, newPassword: NEW_PASSWORD, flow: "reset-verification" },
});
check("the emailed code completes the reset", Boolean(reset?.tokens?.token));

const after = await c.action("auth:signIn", {
  provider: "password",
  params: { email: EMAIL, password: NEW_PASSWORD, flow: "signIn" },
});
check("the NEW password signs in", Boolean(after?.tokens?.token));

let reused = false;
try {
  await c.action("auth:signIn", {
    provider: "password",
    params: { email: EMAIL, code: resetCode, newPassword: "another-one-entirely-77", flow: "reset-verification" },
  });
  reused = true;
} catch { /* expected */ }
check("the reset code cannot be reused", !reused);

console.log("cleanup:", JSON.stringify(run("authImport:purgeNewUser", { email: EMAIL })));
process.exit(bad ? 1 : 0);
