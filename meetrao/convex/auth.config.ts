/* Supabase Auth acts as Convex's identity provider.
 *
 * This is the bridge decided in docs/decisions/auth-provider.md and proven in
 * docs/spikes/convex-supabase-jwt/. Supabase signs access tokens with ES256 and
 * publishes a JWKS; Convex validates against it. The token's `sub` is the user
 * UUID, which is also profiles.id — so no identity is remapped anywhere.
 *
 * SUPABASE_URL must be set on the Convex deployment (npx convex env set).
 */
const supabaseUrl = process.env.SUPABASE_URL ?? "";
const issuer = `${supabaseUrl.replace(/\/$/, "")}/auth/v1`;

const authConfig = {
  providers: [
    /* Convex Auth, running BESIDE Supabase rather than instead of it.
       Both issuers are accepted at once, which is what makes the cutover
       reversible: the app can be pointed at either, watched, and pointed back
       without anyone being locked out. The Supabase entry comes out only after
       Convex Auth has been live for a while. */
    { domain: process.env.CONVEX_SITE_URL, applicationID: "convex" },

    {
      type: "customJwt" as const,
      issuer,
      jwks: `${issuer}/.well-known/jwks.json`,
      algorithm: "ES256" as const,
      // Every Supabase access token carries aud "authenticated".
      applicationID: "authenticated",
    },
  ],
};

export default authConfig;
