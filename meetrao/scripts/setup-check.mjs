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
  ["NEXT_PUBLIC_CONVEX_URL", "Convex dashboard → Settings → Deployment URL (npx convex dev writes it)"],
  ["CONVEX_DEPLOYMENT", "written by npx convex dev; names which deployment this checkout talks to"],
  ["GOOGLE_CLIENT_ID", "Google Cloud → Credentials → OAuth 2.0 Client ID (Web application)"],
  ["GOOGLE_CLIENT_SECRET", "Google Cloud → Credentials → the same client's secret"],
  ["RESEND_API_KEY", "Resend → API Keys"],
  ["NEXT_PUBLIC_SITE_URL", "http://localhost:3000 locally; the deployed origin in production"],
];

const OPTIONAL = [
  ["EMAIL_FROM", 'defaults to "Meetrao <hello@meetrao.com>"'],
  ["EMAIL_POSTAL_ADDRESS", "shown in every email footer; defaults to the real address, so unset is compliant"],
  ["ANALYTICS_SALT", "salts the daily visitor hash; set it on the CONVEX deployment, not here"],
  ["NEXT_PUBLIC_GA_MEASUREMENT_ID", 'Google Analytics 4 ID ("G-…"); unset, GA and its consent banner never load'],
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
console.log(
  "\nSome secrets live on the CONVEX deployment rather than here, because the\n" +
    "code that uses them runs there: GOOGLE_CLIENT_ID/SECRET, AUTH_RESEND_KEY,\n" +
    "JWT_PRIVATE_KEY, JWKS, SITE_URL, ANALYTICS_INGEST_SECRET. List them with\n" +
    "`npx convex env list` — this script cannot see them.",
);
