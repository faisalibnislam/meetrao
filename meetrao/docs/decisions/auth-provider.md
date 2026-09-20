# Decision — auth provider for the Convex migration

Status: **proposed**, awaiting a call. Written 2026-09-20. Gate 2 of Phase 0 in
`docs/convex-migration.md`.

## What auth actually has to do here

Taken from the code, not from a feature list:

| Requirement | Where it lives today |
| --- | --- |
| Email + password sign-up and sign-in | `lib/actions/auth.ts` |
| Google OAuth | `signInWithOAuth`, `app/auth/callback` |
| Email verification, with a `/verify` gate that blocks every product screen | `proxy.ts` reads `email_confirmed_at` |
| Password reset by emailed link | `resetPasswordForEmail` → `/auth/confirm?next=/reset` |
| Session in cookies, readable from server components and middleware | `@supabase/ssr`, `proxy.ts` |
| A profile row created on first sign-in, with a generated username | `handle_new_user` trigger |
| Account deletion | `admin_remove_account` deletes from `auth.users` |
| No account-enumeration oracle on sign-in or reset | deliberate, `GENERIC` in `auth.ts` |

Not required, and worth saying out loud because it removes whole product tiers
from consideration: no SSO/SAML, no organisations or teams, no MFA, no RBAC
beyond a single `is_admin` boolean that already lives in `profiles`.

**Scale: 4 users.** Every option below is free at this size. Migration cost is
therefore *noise*, and this decision should be made on long-run fit rather than
on how hard the move is.

## The finding that reframes the question

**Supabase Auth can stay on as Convex's identity provider.** Verified, both
halves — see `docs/spikes/convex-supabase-jwt/`:

- The live project already serves OIDC discovery and an **ES256** JWKS.
  Supabase tokens carry `aud = authenticated` and `sub = the user's UUID`.
- Convex's `customJwt` provider accepts exactly that: ES256, issuer, JWKS URL,
  audience. The spike confirms a valid token authenticates, `subject` and
  `email` survive into `ctx.auth.getUserIdentity()`, and wrong-audience and
  expired tokens are both rejected.

The consequence is the interesting part: **`sub` is already `profiles.id`.**
Keeping Supabase Auth means every user-keyed row migrates with its identity
intact — no remapping, no forced password reset, Google sign-in untouched.

So "which auth provider" and "when do we move auth" are two questions, and the
second one no longer has to be answered during the data migration.

## Options

### A — Keep Supabase Auth as Convex's JWT provider
**For:** zero user migration; `sub` = `profiles.id`; Google and the `/verify`
gate keep working as-is; takes the one irreversible step off the critical path;
fully reversible.
**Against:** doesn't actually get you off Supabase — you keep a project, a
dashboard and an outage surface alive for auth alone. `proxy.ts` keeps its
Supabase session refresh. Two vendors indefinitely, and deferring means
migrating auth later at a larger user count.

### B — Convex Auth (`@convex-dev/auth`)
**For:** one vendor, one dashboard; users become an ordinary Convex table;
password + Google both supported; you already run Resend, so sending your own
verification and reset mail is not new infrastructure; fits the bespoke login
design because there is no hosted UI to fight.
**Against:** **beta**, and Convex itself steers production apps toward hosted
providers. You own the security surface — verification, reset, rate limiting,
enumeration resistance — all of which Supabase currently does for you and all
of which are easy to get subtly wrong.

### C — Clerk
**For:** the best-documented Convex pairing; verification, reset, OAuth and
session management are the product, not your code; supports importing **bcrypt**
password hashes, and Supabase stores bcrypt in `auth.users.encrypted_password`
— so even passwords can survive the move; replaces `proxy.ts`'s session logic
with maintained middleware.
**Against:** another vendor and eventually another bill; the hosted UI
components will not match this design system, so you would use the headless
path and do more wiring than the quickstart implies.

### D — WorkOS AuthKit
**For:** very generous free tier; first-class Convex docs; strongest option *if*
SSO ever becomes a requirement.
**Against:** enterprise-shaped for a product that needs email/password and
Google. Buying capability you have no use for.

## Recommendation

**Adopt A as the migration bridge, and C (Clerk) as the destination.**

Concretely: configure Convex with Supabase as a `customJwt` provider, migrate
the data with identities untouched, and let Phase 4 become a normal project
afterwards rather than a big-bang cutover in the middle of one.

Reasoning:

- The migration's main risk is doing two hard things at once. This separates
  them at essentially no cost, and the separation is proven, not hoped for.
- Auth is the component where "boring and maintained" beats "integrated". A
  beta dependency on the login path of a scheduling product — where the entire
  value proposition is that people can reliably get in and book — is a poor
  trade for saving one vendor. That is the case against B, and it is the main
  reason not to simply stay on Supabase Auth forever either.
- Clerk's bcrypt import means the eventual move need not force a password reset
  at all, which is what makes deferring safe rather than merely convenient.

**The honest counter-argument**, which a reader should weigh rather than skip:
the cheapest moment to migrate auth is when you have 4 users, and that moment
is now. Deferring trades a trivial migration today for a larger one later. The
recommendation above accepts that trade *only* because Clerk can import bcrypt
hashes, which keeps the later migration cheap too. **If that import path turns
out not to work on Supabase's hash format, the calculus flips and auth should
move now, during Phase 4, exactly as originally planned.** Verify it before
relying on it.

## Before committing

1. Mint a **real** Supabase token for one throwaway user and present it to
   Convex. Half 1 and half 2 are each proven; the join is not.
2. Confirm Clerk imports Supabase's bcrypt hashes on a single test account.
   This is the hinge of the recommendation.
3. Check how token refresh threads through: `@supabase/ssr` refreshes the
   cookie, and Convex needs the fresh JWT via a `fetchAccessToken` callback.
   Confirm an expiring session renews without a visible sign-out.
4. Decide what happens to `handle_new_user`. It is a database trigger today; on
   Convex it becomes an explicit "create profile on first sign-in" mutation
   under every path that can produce a new user.

## Consequences if adopted

- Phase 4 leaves the critical path; the migration's irreversible step is
  deferred behind a proven bridge.
- Supabase stays alive for auth after Phase 6, so "decommission Supabase"
  becomes "decommission Supabase *data*". Say so plainly in the plan rather
  than discovering it at the end.
- `proxy.ts` keeps its Supabase session refresh until the Clerk move.
- The signup confirmation email stays on the Supabase dashboard template until
  then, rather than moving to Resend with everything else.
