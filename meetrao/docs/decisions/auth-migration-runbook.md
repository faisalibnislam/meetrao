# Runbook — moving auth off Supabase, so the project can be deleted

Status: **ready to execute, blocked on one thing only** — a Clerk account, which
has to be created by a person. Written 2026-09-20. Companion to
`docs/decisions/auth-provider.md`, which chose Clerk and explains why.

Once this is done, **nothing in the application touches Supabase** and the
project can be deleted. Everything else already moved: all fifteen tables, file
storage, and (as of today) the Google Calendar tokens.

## What is actually left on Supabase

Four things, all auth:

| What | Where |
| --- | --- |
| Sign-in, sign-up, password reset | `src/lib/actions/auth.ts` |
| The session cookie and its refresh | `src/proxy.ts`, `src/lib/supabase/{server,client}.ts` |
| The `email_confirmed_at` verification gate | `src/proxy.ts`, `src/lib/data/session.ts` |
| The signup confirmation email | `src/emails/supabase/confirm-signup.html`, pasted into the Supabase dashboard |

And one thing that is not auth but dies with the project: `admin.auth.admin.deleteUser`
in `src/lib/actions/{settings,admin}.ts`, which removes the identity after
Convex has purged the data.

## The one-time decision to confirm first

**Does Clerk import Supabase's bcrypt hashes?** The whole recommendation rests
on this, because it is what avoids forcing a password reset. Supabase stores
bcrypt in `auth.users.encrypted_password`; Clerk's user-import API accepts a
`password_hasher` of `bcrypt`.

**Verify on ONE test account before migrating anyone.** If it does not work, the
decision does not collapse — with four users a forced reset is a Slack message
— but you should know which world you are in before you start, not after.

## Order of work

**1. Create the Clerk application** (a person; I cannot create accounts).
Enable email/password and Google. Point Google at the SAME OAuth client the
calendar integration uses, or hosts will be asked to authorise twice.

**2. Add Clerk as a second Convex auth provider.** `convex/auth.config.ts`
already takes an array. Adding Clerk beside Supabase means **both** issuers are
accepted at once, which is what makes this reversible:

```ts
providers: [
  { type: "customJwt", issuer: supabaseIssuer, jwks: `${supabaseIssuer}/.well-known/jwks.json`,
    algorithm: "ES256", applicationID: "authenticated" },
  { domain: process.env.CLERK_ISSUER_URL, applicationID: "convex" },
]
```

Deploy this and nothing changes — no Clerk tokens exist yet.

**3. Make `profiles.id` survive.** This is the step that matters most.

Today `sub` is the Supabase user UUID **and** `profiles.id`. Clerk issues its
own subject (`user_...`), so unless something maps it, every row keyed by user
id is orphaned — which is exactly the remapping this migration has avoided from
the first commit.

Two ways, and the second is better:
- Set the Supabase UUID as Clerk's `external_id` at import, and put it in the
  JWT template so `sub` (or a claim you read) stays the UUID. Nothing else
  changes.
- Or add `profiles.clerk_id`, indexed, and resolve through it in
  `convex/lib/auth.ts:currentUserId`.

Prefer the first: it keeps one identity column and no new lookup on every call.

**4. Import the users.** Four of them, with `password_hasher: "bcrypt"` and the
hash from `auth.users.encrypted_password`, plus `external_id` from step 3.
Google users match on verified email.

**5. Swap the app's auth surface.** `@supabase/ssr` → `@clerk/nextjs`:
`src/proxy.ts` (Clerk's middleware replaces the cookie refresh and the
redirects), `src/lib/actions/auth.ts`, `src/app/auth/{callback,confirm}`, and
`src/lib/convex/{server,provider}` — where `fetchAccessToken` becomes Clerk's
`getToken({ template: "convex" })`.

`src/lib/data/session.ts` keeps its shape: it already reads the profile from
Convex and only takes the *identity* from the auth provider.

**6. Move the confirmation email to Resend.** `meetrao.com` is verified and
sending, and every other transactional email already goes through it. This is
the last thing Supabase was doing for the product.

**7. Cut over, then delete.** Both issuers are live through steps 2–6, so the
switch is: point the app at Clerk, watch, and only then remove the Supabase
provider from `auth.config.ts`. Keep the Supabase project **paused rather than
deleted** for a rollback window — once it is gone, so are the password hashes.

## What has to be true before deleting the project

- [ ] `grep -rn "supabase" src/` returns nothing outside comments
- [ ] `@supabase/ssr` and `@supabase/supabase-js` removed from `package.json`
- [ ] Every Supabase variable removed from Vercel and from `convex env`
- [ ] `SUPABASE_URL` removed from `convex/auth.config.ts`, Supabase provider gone
- [ ] Account deletion no longer calls `admin.auth.admin.deleteUser`
- [ ] A test account can sign up, confirm by email, sign in, and book — on Clerk
- [ ] The Supabase project has been **paused** and nothing broke for a week

## One thing to fix regardless of auth

Every Google Calendar connection is currently dead — see
`docs/convex-migration-status.md`. If the OAuth consent screen is still in
**Testing** publishing status, reconnected tokens will expire again after seven
days. Publish the consent screen before asking hosts to reconnect, or this
will look like a recurring bug in the migration.
