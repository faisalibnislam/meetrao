#!/usr/bin/env node
/**
 * Supabase Auth → Convex Auth, step 4 of docs/decisions/auth-migration-runbook.md.
 *
 *   node scripts/import-auth-users.mjs <path-to-env-with-POSTGRES_URL> [--prod]
 *
 * Reads `auth.users` over a direct Postgres connection and hands each row to
 * `authImport:importUsers`. The bcrypt hashes go machine-to-machine and are
 * never printed — not to stdout, not to a file. The only thing this prints is
 * a count and an email.
 *
 * Idempotent, and MEANT to be re-run: hashes change whenever someone changes
 * their password, so the real cutover wants a fresh copy taken minutes before.
 */
import pg from "pg";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

/* Run from anywhere. `npx convex run` below needs the project directory (it
   looks for convex.json and .env.local there), and the obvious mistake is to
   invoke this from the repo root, where the app is a subdirectory. */
process.chdir(resolvePath(dirname(fileURLToPath(import.meta.url)), ".."));

const envArg = process.argv[2];
const prod = process.argv.includes("--prod");
const envPath = envArg ? resolvePath(process.env.INIT_CWD ?? ".", envArg) : null;

if (!envPath || !existsSync(envPath)) {
  console.error(`Usage: node scripts/import-auth-users.mjs <env-file-with-POSTGRES_URL> [--prod]

  <env-file> is a file you create, containing one line:

    POSTGRES_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres

  Get it from Supabase → Project Settings → Database → Connection string (URI).
  It cannot come from \`vercel env pull\`: Vercel marks it sensitive and returns
  [SENSITIVE] instead of the value, which is correct of it.

  Nothing in this script prints a password or a password hash.`);
  process.exit(1);
}

const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const url = env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL;
if (!url) {
  console.error("No POSTGRES_URL in that file.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const { rows } = await client.query(`
  select
    u.id,
    lower(u.email) as email,
    (u.email_confirmed_at is not null) as email_verified,
    u.encrypted_password,
    exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google') as has_google,
    coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '') as name
  from auth.users u
  order by u.created_at
`);
await client.end();

const users = rows.map((r) => ({
  supabaseId: r.id,
  email: r.email,
  name: r.name || undefined,
  emailVerified: r.email_verified,
  passwordHash: r.encrypted_password ?? null,
  hasGoogle: r.has_google,
}));

console.log(`Read ${users.length} users from Supabase:`);
for (const u of users) {
  // Deliberately NOT the hash — only whether one exists.
  console.log(`  ${u.email}  password=${u.passwordHash ? "yes" : "no"}  google=${u.hasGoogle ? "yes" : "no"}  verified=${u.emailVerified}`);
}

const args = ["convex", "run", "authImport:importUsers", JSON.stringify({ users })];
if (prod) args.push("--prod");
const out = execFileSync("npx", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
console.log(`\nImported into Convex ${prod ? "PRODUCTION" : "dev"}:`);
console.log(out.trim());
