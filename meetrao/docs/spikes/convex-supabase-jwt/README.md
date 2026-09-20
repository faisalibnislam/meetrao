# Spike — can Supabase Auth act as Convex's identity provider?

If yes, the data migration and the auth migration stop being the same project,
and the irreversible step leaves the critical path.

Two halves, verified separately.

## Half 1 — Supabase's side (verified against the live project, read-only)

```bash
curl https://<ref>.supabase.co/auth/v1/.well-known/jwks.json
curl https://<ref>.supabase.co/auth/v1/.well-known/openid-configuration
```

The live Meetrao project serves a full OIDC discovery document and a JWKS
containing an **ES256 / P-256** signing key. Supabase access tokens carry
`iss = https://<ref>.supabase.co/auth/v1`, `aud = authenticated`, and
`sub = the user's UUID` — which is also `public.profiles.id`.

## Half 2 — Convex's side (this spike)

`convex/auth.config.ts` declares a `customJwt` provider with `algorithm: "ES256"`
and `applicationID: "authenticated"`. `jwks-server.mjs` stands up a local ES256
issuer that mints tokens with Supabase's claim shape.

```bash
npm install convex jose
node jwks-server.mjs &                        # issuer on :4455
CONVEX_AGENT_MODE=anonymous npx convex dev    # leave running
node run-auth-spike.mjs
```

Asserts: a valid token authenticates and `subject`/`issuer`/`email` survive;
a wrong `aud` is rejected (`NoAuthProvider`); an expired token is rejected
(`InvalidAuthHeader`); no token reads as unauthenticated.

## What is NOT proven here

The final link — a **real** Supabase-issued token accepted by Convex — is
untested, because minting one needs a real user and a password. Half 1 shows
Supabase issues the right shape; half 2 shows Convex accepts that shape. Close
the gap with one throwaway test user before committing to this path.
