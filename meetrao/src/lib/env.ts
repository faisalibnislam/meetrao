import { z } from "zod";

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
  /** From address for every transactional email. Must be on a verified domain. */
  EMAIL_FROM: z.string().default("Meetrao <hello@meetrao.com>"),
  /** Shown in the footer of every email; required by anti-spam law. */
  EMAIL_POSTAL_ADDRESS: z.string().default(""),

  /** Absolute origin, used for OAuth redirect URIs and links inside emails. */
  NEXT_PUBLIC_SITE_URL: z.string().url(),
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
