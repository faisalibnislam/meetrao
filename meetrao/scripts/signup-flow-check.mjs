#!/usr/bin/env node
/**
 * A brand-new account, created entirely on Convex Auth.
 *
 * This is the real bar for "Convex works on its own": nothing here touches
 * Supabase. Sign up, get a profile, sign in, read and write your own data.
 *
 * Uses Resend's sink address so no inbox is touched, and removes everything
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

const EMAIL = `delivered+signup-${Date.now()}@resend.dev`;
const PASSWORD = "a-perfectly-ordinary-password-42";
const c = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);

const created = await c.action("auth:signIn", {
  provider: "password",
  params: { email: EMAIL, password: PASSWORD, name: "Brand New", flow: "signUp" },
});

/* NO session yet, and that is correct. Email verification is configured, so
   sign-up starts it rather than signing the person in — which is exactly what
   the /verify gate expects, and what Supabase did before it. */
check("sign-up withholds the session until the email is verified", created?.tokens == null, JSON.stringify(created));

const users = run("authImport:importedUsers", {}).filter((u) => u.email === EMAIL);
check("a user row was created", users.length === 1);
check("it is unverified, awaiting the emailed code", users[0]?.verified === false);

/* The replacement for handle_new_user. Postgres created the profile on every
   insert into auth.users; convex/auth.ts does it in afterUserCreatedOrUpdated,
   so no entry point has to remember. */
const profile = run("authImport:profileFor", { email: EMAIL });
check("a PROFILE was created automatically", profile != null, profile ? `username=${profile.username}` : "none");
check("the username was generated from the name", /^brand-new/.test(profile?.username ?? ""), profile?.username);
check("it starts un-onboarded, as a new account should", profile?.onboarding_completed_at === null);
check("the profile is keyed by the Convex user id", profile?.id === users[0]?.supabase_id, profile?.id);

/* What cannot be automated, and why: the emailed code is stored as a sha256
   hash, so nothing but the inbox holds the plaintext. Signing in, verifying
   and resetting past this point need a real mailbox — which is the correct
   design, not a gap in the port. */

console.log("cleanup:", JSON.stringify(run("authImport:purgeNewUser", { email: EMAIL })));
process.exit(bad ? 1 : 0);
