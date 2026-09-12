import { z } from "zod";
import { POSTAL_ADDRESS } from "@/lib/contact";

/* ─────────────────────────────────────────────────────────────────────────────
   Environment.

   A missing variable fails at boot with a useful message rather than at runtime
   in production. `npm run setup:check` runs the same validation from the CLI.

   Never put a secret in a tracked file — not in vercel.json, not in a README,
   not in a commit message. `.env.local` is gitignored and does not travel to
   Vercel; every variable has to be set in the dashboard too.
   ───────────────────────────────────────────────────────────────────────────── */

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  /** Server only. Reaches past RLS — never expose it to the browser. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  /* Calendar access is ours to handle. Sign-in with Google is Supabase Auth's,
     and its callback lives in the Supabase dashboard — two separate concerns
     that share one Google Cloud project. */
  GOOGLE_CLIENT_ID: z.string().min(10),
  GOOGLE_CLIENT_SECRET: z.string().min(10),

  RESEND_API_KEY: z.string().min(10),
  /**
   * From address for every transactional email. Must be on a verified domain.
   *
   * support@ rather than hello@: this is the most-seen address in the product —
   * it heads every booking confirmation — and it is the one address a visitor
   * is shown anywhere else. Two addresses would be two, and only one of them is
   * forwarded to an inbox someone reads.
   *
   * This is only the default. Set on Vercel, the variable wins.
   */
  EMAIL_FROM: z.string().default("Meetrao <support@meetrao.com>"),
  /**
   * Shown in the footer of every email; required by anti-spam law.
   *
   * Defaults to the real address rather than to "", so a deployment that never
   * sets it still sends compliant mail. Set it on Vercel only to override.
   */
  EMAIL_POSTAL_ADDRESS: z.string().default(POSTAL_ADDRESS),

  /* Inbound mail. Both optional: unset, /api/resend/inbound does nothing and
     the rest of the app is unaffected. See README § "Receiving support mail". */

  /** Svix signing secret (`whsec_…`), shown once when the webhook is created. */
  RESEND_WEBHOOK_SECRET: z.string().default(""),
  /** Real inbox that mail to support@meetrao.com is forwarded to. */
  SUPPORT_INBOX: z.string().default(""),

  /** Absolute origin, used for OAuth redirect URIs and links inside emails. */
  NEXT_PUBLIC_SITE_URL: z.string().url(),

  /**
   * Secret that salts the daily visitor hash. See lib/analytics/visit.ts.
   *
   * Optional, and the default is not a placeholder — `analyticsSalt()` falls
   * back to the service-role key, which is already a stable server-only secret
   * that never reaches a browser. Setting this explicitly buys one thing:
   * rotating the service-role key then stops resetting the day's unique-visitor
   * count. Nothing else changes.
   */
  ANALYTICS_SALT: z.string().default(""),

  /**
   * GA4 measurement ID ("G-XXXXXXXXXX").
   *
   * Unset, Google Analytics is not loaded at all — no script, no request to
   * google-analytics.com — and the consent banner does not appear either. That
   * is not a shortcut: the banner exists because GA writes cookies, and the
   * first-party counter is cookie-free and needs no permission. A banner asking
   * consent for nothing is a dark pattern in the other direction.
   */
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().default(""),
});

export type Env = z.infer<typeof serverSchema>;

let cached: Env | null = null;

/**
 * Validated server environment. Throws on the first access if anything is
 * missing, naming every variable at once rather than one per attempt.
 */
export function env(): Env {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  · ${i.path.join(".")}: ${i.message}`);
    throw new Error(
      `Environment is incomplete. Set these in .env.local (and in the Vercel dashboard):\n${lines.join("\n")}`,
    );
  }

  cached = parsed.data;
  return cached;
}

/** The browser only ever needs these two. */
export function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.");
  }
  return { url, key };
}

/**
 * The origin this deployment is reachable at. Every OAuth redirect URI and
 * every link inside an email is built from it, so it has to be an address that
 * actually serves this app — and one that can be registered ahead of time in
 * Supabase's redirect allow-list and Google's authorised URIs.
 *
 * `VERCEL_URL` is the per-deployment host (meetrao-a1b2c3-….vercel.app). It
 * changes on every push, so it can never be allow-listed, and Supabase silently
 * falls back to its own Site URL when a redirect is not on the list. That is
 * how sign-in ended up on a domain with no deployment behind it.
 * `VERCEL_PROJECT_PRODUCTION_URL` is the stable production host, so it is
 * preferred; the per-deployment host is a last resort before localhost.
 *
 * Trailing slash is trimmed: `${siteUrl()}/auth/callback` on a value ending in
 * "/" produces a double slash, and an allow-list match is exact.
 */
export function siteUrl(): string {
  // Not `??` — an env var set to "" in a dashboard is empty, not undefined,
  // and would otherwise win and produce relative redirects.
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production}`;

  const deployment = process.env.VERCEL_URL?.trim();
  if (deployment) return `https://${deployment}`;

  return "http://localhost:3000";
}
