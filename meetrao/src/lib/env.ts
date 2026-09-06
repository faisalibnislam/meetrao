/**
 * Environment access. Public values are inlined by Next at build time, so they
 * must be referenced as full literal `process.env.NEXT_PUBLIC_*` expressions
 * rather than looked up dynamically.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  /** Absolute origin, used to build OAuth redirect URIs and booking links. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** Host shown in booking links, e.g. "meetrao.com/faisal". */
  bookingHost: process.env.NEXT_PUBLIC_BOOKING_HOST ?? "meetrao.com",
  /**
   * Username of a public demo account. When set, the landing page's secondary
   * CTA points at a real booking page; when not, it falls back to the "How it
   * works" section rather than linking somewhere that would 404.
   */
  demoUsername: process.env.NEXT_PUBLIC_DEMO_USERNAME ?? "",
} as const;

export function requirePublicEnv() {
  return {
    supabaseUrl: required(publicEnv.supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: required(
      publicEnv.supabaseAnonKey,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ),
  };
}

/**
 * Server-only. Deliberately separate from `googleEnv()`: reading whether a
 * host has connected a calendar must not require Google credentials to be
 * configured, or a deployment without them would fail on the dashboard.
 */
export function serviceRoleKey() {
  return required(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
}

export function googleEnv() {
  return {
    googleClientId: required(process.env.GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID"),
    googleClientSecret: required(
      process.env.GOOGLE_CLIENT_SECRET,
      "GOOGLE_CLIENT_SECRET",
    ),
  };
}

/** True when Google Calendar credentials are configured. */
export function hasGoogleCredentials() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

/**
 * True when the service-role key is configured. Without it Meetrao can still
 * render every screen and serve public booking pages (those run on the anon
 * key), but it cannot store Google tokens or write a booking.
 */
export function hasServiceRole() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function siteUrl(path = "") {
  const base = publicEnv.siteUrl.replace(/\/$/, "");
  return path ? `${base}${path.startsWith("/") ? path : `/${path}`}` : base;
}

/** The user-facing booking link, e.g. meetrao.com/faisal/intro-call */
export function bookingLink(username: string, slug?: string) {
  const base = `${publicEnv.bookingHost}/${username}`;
  return slug ? `${base}/${slug}` : base;
}
