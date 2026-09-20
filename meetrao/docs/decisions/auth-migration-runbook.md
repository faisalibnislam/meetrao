# Runbook — moving auth off Supabase, so the project can be deleted

Status: **steps 1–4 done on the dev deployment and verified; 5–7 remain.** Rewritten
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

## Progress, 2026-09-20

Done, on **dev only** — production still runs entirely on Supabase Auth:

| Step | State |
| --- | --- |
| 1. Install and configure Convex Auth | done — `convex/auth.ts`, Password + Google, Resend wired for verification and reset |
| 2. Run beside Supabase | done — `convex/auth.config.ts` accepts **both** issuers |
| 3. Keep `profiles.id` stable | done — `users.supabase_id`, resolved only in `convex/lib/auth.ts:currentUserId` |
| 4. Import the users | done for identities and Google links; **password hashes still to come** (see below) |
| 5. Swap the app's auth surface | **done — sign-in verified end to end on dev** |
| 6. Confirmation email to Resend | wired in step 1, unexercised |
| 7. Cut over, then delete | not started |

**Verified end to end on dev, with a real migrated host:** signs in with a
bcrypt hash, the token authenticates, `currentUserId` resolves it to the
Supabase UUID, the migrated profile is found, and owner-scoped reads return
that host's own rows — 4 contacts and 2 schedules, matching Postgres.

### Step 5: what is done, and the wall it hit

Done and verified with `auth` switched on locally — every route behaves
exactly as before, and the server logs are clean:

- `src/lib/convex/server.ts` takes the token from Convex Auth instead of
  Supabase when the domain is on;
- `src/lib/data/session.ts` resolves identity and profile from one
  authenticated call;
- `src/proxy.ts` runs Convex Auth's middleware for the redirects;
- `src/lib/convex/provider.tsx` wraps the app in the right provider, decided
  on the **server** and passed down, so the browser cannot disagree with the
  backend about who issues sessions;
- `auth` is excluded from the `all` wildcard and has to be typed out —
  `src/lib/backend.test.ts` is the rule.

**The wall: sign-in cannot be a server action.** `@convex-dev/auth/nextjs/server`
exports `convexAuthNextjsToken`, `isAuthenticatedNextjs`,
`convexAuthNextjsMiddleware`, `nextjsMiddlewareRedirect` and the provider —
and **no `signIn`**. Calling `api.auth.signIn` from a server action does
authenticate and does return tokens, but nothing stores them: the cookie the
middleware reads is written client-side by `useAuthActions()`. The result is a
sign-in that succeeds and leaves the person on the login page, which is worse
than one that fails.

Server-action branches for sign-in, sign-up, reset and sign-out were written,
proved non-viable, and **removed** rather than left looking plausible.

**The forms are ported.** There were two, not four —
`components/auth/auth-form.tsx` (login, signup, forgot) and
`reset-form.tsx` — and each now carries both paths, choosing on a
`convexAuth` prop passed down from its server page. Both security properties
survived and are commented where someone might "fix" them: ONE message for
unknown-account and wrong-password, and a reset that redirects identically
whether or not the address exists.

Convex Auth also needs BOTH providers mounted — `ConvexAuthNextjsServerProvider`
in the root layout to read the cookie, and `ConvexAuthNextjsProvider` inside it
for `useAuthActions`. The client one alone throws `Cannot destructure property
'isLoading' of 'useAuth(...)'`. Neither is mounted while the domain is off, so
the Supabase path renders exactly the tree it always did.

**Verified end to end on dev**: signed in through the real form with an
imported bcrypt hash, landed on the dashboard as the right person, and
`/contacts` rendered all four contacts with their meeting counts and dates.

The reset flow differs by backend and the form shows it: Supabase emails a link
that creates a session, Convex Auth emails a CODE and no session, so the
address and code travel in the query string with visible fields as the
fallback.

### Two things that bit, recorded so they do not bite twice

**`bcryptjs.compare` cannot run in Convex.** The async form yields with
`setTimeout`, which Convex forbids outside actions, and sign-in fails with
`Can't use setTimeout in queries`. Use `compareSync`. It is CPU-bound for a few
milliseconds at cost 10, which is the entire point of a password hash.

**Convex Auth needs its own signing keypair** — `JWT_PRIVATE_KEY` and `JWKS`.
Without them every sign-in returns an opaque `Server Error`. Set them with
`npx convex env set NAME --from-file <file>`: the value begins with `-----`,
so passing it as an argument makes the CLI read it as a flag, and the failure
message echoes the whole private key.

### The step that still needs a person

The password hashes are not imported yet. `scripts/import-auth-users.mjs`
does it in one command, but it needs a Postgres connection string, and Vercel
correctly refuses to hand `POSTGRES_URL` to `env pull` because it is marked
sensitive. Put the connection string (Supabase → Project Settings → Database)
in a local file and run:

```bash
node scripts/import-auth-users.mjs path/to/env-file        # dev
node scripts/import-auth-users.mjs path/to/env-file --prod # production
```

The script prints a count and an email per user and **never** prints a hash.
Re-run it immediately before the real cutover: hashes change whenever someone
changes their password.

## The one thing to prove first

**That a Supabase bcrypt hash verifies through Convex Auth's `crypto` hook.**
The Password provider takes a custom `crypto`, so first sign-in can verify the
bcrypt hash from `auth.users.encrypted_password` and re-hash to the default
afterwards — which is what avoids forcing anyone to reset a password.

~~**Prove it on ONE test account before migrating anyone.**~~ **Proven** — see
Progress above. A `$2a$10$` 60-character hash in Supabase's exact format
verifies through the `crypto` hook, a wrong password is refused, and new
passwords are written as Scrypt so an imported bcrypt hash is a one-way door
in the right direction.

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
