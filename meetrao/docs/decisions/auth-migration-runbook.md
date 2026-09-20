# Runbook — moving auth off Supabase, so the project can be deleted

Status: **ready to execute, and no longer blocked on anyone.** Rewritten
2026-09-20 for **Convex Auth** rather than Clerk, because the deciding
constraint turned out to be "no additional service" — see the revision at the
end of `docs/decisions/auth-provider.md`.

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

## The one thing to prove first

**That a Supabase bcrypt hash verifies through Convex Auth's `crypto` hook.**
The Password provider takes a custom `crypto`, so first sign-in can verify the
bcrypt hash from `auth.users.encrypted_password` and re-hash to the default
afterwards — which is what avoids forcing anyone to reset a password.

**Prove it on ONE test account before migrating anyone.** If it does not work
the plan survives — with four users a forced reset is a Slack message — but you
should know which world you are in before you start, not after.

## Order of work

**1. Install and configure Convex Auth.** `@convex-dev/auth`, with the
`Password` provider and a Google OAuth provider. Point Google at the **same**
OAuth client the calendar integration uses, or hosts will be asked to authorise
twice. Wire `EmailConfig` to Resend — `meetrao.com` is already verified and
every other transactional email goes through it.

Preserve two properties from `src/lib/actions/auth.ts` while you do it, because
both are deliberate and both are easy to lose:
- sign-in returns ONE generic message for "no such account" and "wrong
  password", so the form is not an account-enumeration oracle;
- password reset never reveals whether an address is registered.

**2. Run Convex Auth alongside Supabase.** `convex/auth.config.ts` takes an
array, so both issuers can be accepted at once — which is what makes the
cutover reversible. Deploy this and nothing changes; no Convex Auth sessions
exist yet.

**3. Make `profiles.id` survive.** This is the step that matters most.

Today `sub` is the Supabase user UUID **and** `profiles.id`. Convex Auth
creates its own `users` table with Convex ids, so unless something maps them,
every row keyed by user id is orphaned — exactly the remapping this migration
has avoided since the first commit.

The clean way: give the Convex Auth `users` table a `supabase_id` field, set it
during the import, index it, and resolve through it **in one place** —
`convex/lib/auth.ts:currentUserId`, which every authorization path already goes
through. Nothing else in the codebase learns that identity changed shape.

Do NOT rewrite `profiles.id` and its foreign keys to Convex ids. It is a
fifteen-table rewrite for no benefit, and the UUIDs are what let a dual-run
compare the two databases row for row.

**4. Import the users.** Four of them: one row per Supabase user in Convex
Auth's `users` table, carrying `supabase_id` from step 3 and the bcrypt hash
for the `crypto` hook to verify. Google users match on verified email.

**5. Swap the app's auth surface.** `@supabase/ssr` → `@convex-dev/auth`:
`src/proxy.ts` (Convex Auth's Next.js middleware replaces the cookie refresh
and the redirects), `src/lib/actions/auth.ts`, `src/app/auth/{callback,confirm}`,
and `src/lib/convex/{server,provider}` — where `fetchAccessToken` comes from
Convex Auth instead of `supabase.auth.getSession()`.

`src/lib/data/session.ts` keeps its shape: it already reads the profile from
Convex and only takes the *identity* from the auth provider.

**6. The confirmation email moves to Resend automatically**, because step 1
wired the sender. This is the last thing Supabase was doing for the product,
and it stops being a template pasted into a dashboard.

**7. Cut over, then delete.** Both issuers are live through steps 2–6, so the
switch is: point the app at Convex Auth, watch, and only then remove the
Supabase provider from `auth.config.ts`. Keep the Supabase project **paused
rather than deleted** for a rollback window — once it is gone, so are the
password hashes, and with them any chance of going back without a reset.

## What has to be true before deleting the project

- [ ] `grep -rn "supabase" src/` returns nothing outside comments
- [ ] `@supabase/ssr` and `@supabase/supabase-js` removed from `package.json`
- [ ] Every Supabase variable removed from Vercel and from `convex env`
- [ ] `SUPABASE_URL` removed from `convex/auth.config.ts`, Supabase provider gone
- [ ] Sign-in still gives ONE message for unknown-account and wrong-password
- [ ] Password reset still does not reveal whether an address is registered
- [ ] Account deletion no longer calls `admin.auth.admin.deleteUser`
- [ ] A test account can sign up, confirm by email, sign in, and book — on Clerk
- [ ] The Supabase project has been **paused** and nothing broke for a week

## One thing to fix regardless of auth

Every Google Calendar connection is currently dead — see
`docs/convex-migration-status.md`. If the OAuth consent screen is still in
**Testing** publishing status, reconnected tokens will expire again after seven
days. Publish the consent screen before asking hosts to reconnect, or this
will look like a recurring bug in the migration.
