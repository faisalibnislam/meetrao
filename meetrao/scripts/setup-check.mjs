#!/usr/bin/env node
/**
 * npm run setup:check
 *
 * Reads .env.local and reports what is missing, so step 0 ends with a validated
 * environment rather than a styled page. Prints only variable names — never a
 * value.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED = [
  ["NEXT_PUBLIC_SUPABASE_URL", "Supabase → Project Settings → API → Project URL"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase → Project Settings → API → anon / publishable key"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Supabase → Project Settings → API → service_role (server only)"],
  ["GOOGLE_CLIENT_ID", "Google Cloud → Credentials → OAuth 2.0 Client ID (Web application)"],
  ["GOOGLE_CLIENT_SECRET", "Google Cloud → Credentials → the same client's secret"],
  ["RESEND_API_KEY", "Resend → API Keys"],
  ["NEXT_PUBLIC_SITE_URL", "http://localhost:3000 locally; the deployed origin in production"],
];

const OPTIONAL = [
  ["EMAIL_FROM", 'defaults to "Meetrao <hello@meetrao.com>"'],
  ["EMAIL_POSTAL_ADDRESS", "shown in every email footer — required by anti-spam law before launch"],
];

const file = resolve(process.cwd(), ".env.local");
const env = { ...process.env };

if (existsSync(file)) {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (value) env[m[1]] = value;
  }
} else {
  console.log("• .env.local not found — copy .env.example and fill it in.\n");
}

const missing = REQUIRED.filter(([name]) => !env[name] || env[name].startsWith("REPLACE_ME"));

for (const [name, where] of REQUIRED) {
  const ok = env[name] && !env[name].startsWith("REPLACE_ME");
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `  — ${where}`}`);
}
for (const [name, note] of OPTIONAL) {
  console.log(`${env[name] ? "✓" : "·"} ${name}  (${note})`);
}

if (missing.length) {
  console.error(`\n${missing.length} required variable(s) missing. The app will not boot.`);
  process.exit(1);
}

console.log("\nEnvironment complete.");
console.log(
  "Reminder: until Resend's DKIM record verifies, Resend delivers only to the\n" +
    "account owner's own address — which is indistinguishable from working code.",
);
