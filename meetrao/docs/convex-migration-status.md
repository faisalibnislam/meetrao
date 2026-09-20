# Convex migration — status

Updated 2026-09-20. Companion to `docs/convex-migration.md` (the plan) and
`docs/decisions/auth-provider.md` (the auth call).

**Supabase is gone from the codebase.** Nothing imports `@supabase/*`, the
packages are out of `package.json`, and the per-domain `CONVEX_BACKENDS` flag
has been deleted along with them — with no second backend to fall back to, a
switch whose off position does not work is not a switch. Convex is the
database, the auth provider, file storage, the cron host, and where the Google
Calendar tokens live and are used.

The history below is kept as the record of how that happened, including the
things that went wrong. Read the sections in order; the earlier ones describe
states the project is no longer in.

**Not yet deployed.** Everything above is true of this branch, not of
production — see *Before deploying this branch*, which has a step that will
break sign-up if it is skipped.

## Done

| | Evidence |
| --- | --- |
| **Convex project linked** — `faisal-islam/meetrao`, dev deployment `festive-meerkat-460` | `npx convex dev` deploys clean |
| **Schema: all 15 tables, 27 indexes** | `convex/schema.ts` |
| **Auth bridge: Supabase → Convex, live** | `scripts/verify-auth-bridge.mjs` — a real Supabase token is accepted, `sub` survives, unsigned/expired/wrong-audience are rejected |
| **All 24 RLS policies re-expressed as code** | `convex/lib/auth.ts`, called from every user-owned read and write |
| **All 17 triggers re-expressed as explicit calls** | `convex/lib/effects.ts` |
| **The 36 SQL functions ported** | `convex/{profiles,meetingTypes,availability,bookings,publicBooking,contacts,notifications,calendarConnections,analytics,admin,platformSettings}.ts` |
| **Double-booking guard** | `convex/bookings.ts:findOverlap` — the mechanism proven in `docs/spikes/convex-concurrency/` |
| **Google tokens unreachable from any client** | every function in `convex/calendarConnections.ts` is `internal*` |
| **`analytics_prune` on a real schedule** | `convex/crons.ts` — daily 03:15 UTC, replacing the piggyback on visitor traffic |
| **Data migrated: 242 rows, all 15 tables** | `scripts/export-supabase.mjs` → `npx convex import`; counts verified equal to Postgres via `convex/verify.ts` |
| **Next.js wiring** | `src/lib/convex/server.ts`, `src/lib/convex/provider.tsx` |
| **Repo health** | 405 tests pass, `tsc` clean, `next build` succeeds, lint back to its 4 pre-existing errors |

Row counts, both sides: profiles 4 · meeting_types 5 · availability_schedules 5
· availability_rules 30 · bookings 7 · booking_invitees 0 · contacts 5 ·
notifications 1 · calendar_connections 4 · booking_page_views 23 · site_visits
85 · admin_activity 63 · platform_settings 1 · bootstrap_admins 1 ·
reserved_usernames 8.

## Repointing the data layer — in progress

A per-domain switch, `CONVEX_BACKENDS` (`src/lib/backend.ts`), decides which
backend serves which domain. Unset means Supabase, so nothing moves by
accident; `all` moves everything. Each domain is reversible by an environment
variable alone.

**Every domain is on Convex.** `CONVEX_BACKENDS=all` runs the whole app —
`analytics`, `notifications`, `contacts`, `schedules`, `availability`,
`meetings`, `bookings`, `publicBooking`, `session`, `admin` — plus file
storage. Each domain still reverts individually by editing one variable.

A domain is reads *and* writes together — splitting them would have a host save
a contact to Postgres and then read the list from Convex, which does not have
it. The corollary, written down in `src/lib/backend.ts`: Convex is
authoritative for a switched-on domain, so flipping the flag back does not
carry the writes home. Affordable for these domains; explicitly not the plan
for the booking core, which dual-writes.

`scripts/write-path-check.mjs` round-trips the mutations as a real host —
create, update, upsert-by-email, chunked import, delete — and asserts the row
counts return to where they started. A test that leaves debris is a test that
gets switched off.

`scripts/parity-check.mjs` is the reconciliation the plan asks for. It mints a
session for every real host (via `generateLink`, which sends no mail) and asks
both backends the same question **as that host** — so Convex's authorization
code and Postgres's RLS have to agree about what a given person may see, not
merely about which rows exist. It currently reports parity clean for all four
hosts, including the analytics aggregates at 7/30/90 days.

### What the harnesses found

**A real ordering defect, and it predates the migration.** One host's four
contacts share `created_at` to the millisecond — they were written by a single
batch — so `order by created_at desc` is a four-way tie. Postgres resolved it
by storage order, Convex by its own, and the two disagreed. The screen's order
was never deterministic in production either; it could reshuffle between reads.
Both backends now carry an explicit `id` tie-break.

**Every user-facing error message was going to break in production.** Convex
delivers a `ConvexError`'s `data` to the client and redacts everything else — a
plain `throw new Error("You already have a contact with that email.")` reaches
the browser as "Server Error", with the message and stack stripped. It looked
fine in the dev deployment, which does pass the text through, so this would
have shipped. All user-facing failures now go through `convex/lib/errors.ts`
and are read back by `src/lib/convex/error.ts`; a plain `Error` is reserved for
genuine bugs, which *should* be opaque to the client.

**A scoping trap the port had to catch by hand.** `src/lib/data/contacts.ts`
selected from `booking_invitees` with no user filter, because RLS scoped it.
There is no RLS in Convex, so `contacts.listForScreen` gathers invitees per
booking of the calling host. An unscoped read would have returned every
invitee in the database — exactly the failure mode the risk register calls out.

## Production deployment

Provisioned 2026-09-20 as **`avid-dotterel-109`** (the dev deployment is
`festive-meerkat-460`). Functions and schema deployed; `SUPABASE_URL` and
`SITE_URL` set, the latter to `https://meetrao.com` rather than localhost.

Backfilled from a **fresh** Supabase export — 245 rows across 15 tables, all
counts verified equal — and both avatars imported into production storage, so
no profile there points at a Supabase Storage URL. Verified against prod: every
host resolves on the guest path, a real Supabase token authenticates and maps
to a migrated profile, an anonymous caller is refused, and avatars serve from
`avid-dotterel-109`.

### Cutover log

**2026-09-20 — `analytics` switched on in production.** `CONVEX_BACKENDS=analytics`.
Everything else still reads and writes Supabase.

Sequencing mattered and nearly bit: `main` already had the analytics *read*
path on Convex, but the collect route's *write* path was not merged yet.
Flipping the flag first would have frozen the admin screen at its backfilled
count while real visits kept landing in Postgres. Code merged first, then the
flag, then a redeploy — a Vercel env change does not reach a deployment that
already exists.

Verified after the switch: a real beacon to `meetrao.com/api/analytics/collect`
landed in Convex (85 → 86) while Postgres stayed put; the admin reads return
real figures at 7/30/90 days; an anonymous caller is refused.

**2026-09-20 — `auth` switched on. The cutover.**
`CONVEX_BACKENDS=all,auth`. Convex Auth now issues every session; Supabase Auth
no longer does. Production Convex got its OWN signing keypair (not dev's),
Resend credentials, the auth schema, and the four identities — all four
pre-verified, so nobody is asked to confirm an address they confirmed months
ago. Verified against production: a sign-up is accepted, the profile callback
runs, and the dataset is untouched at 4 profiles / 7 bookings / 5 contacts.

**Everyone was signed out by this**, which is inherent: a Supabase session is
not a Convex Auth session. Two consequences, both known and accepted because
these four accounts are test data:

| Who | What they must do |
| --- | --- |
| The three password accounts | Use **Forgot password**. Their bcrypt hashes were deliberately not imported, so the old passwords do not work. The reset flow is wired to Resend. |
| The two Google accounts | **Blocked until a redirect URI is registered** — see below. |

### The one thing that needs Google Cloud

Convex Auth's callback is its own URL, not the app's:

    https://avid-dotterel-109.convex.site/api/auth/callback/google

That is **not** registered on the OAuth client, so "Continue with Google" will
fail with `redirect_uri_mismatch` until someone adds it in Google Cloud →
Credentials → the Web application client → Authorised redirect URIs. Add the
dev one too if Google sign-in is wanted locally:

    https://festive-meerkat-460.convex.site/api/auth/callback/google

This is separate from the calendar integration's own URI
(`https://meetrao.com/api/google/callback`), which stays exactly as it is —
sign-in and calendar access are two concerns sharing one OAuth client, which
is what the original `.env.example` said from the beginning.

**2026-09-20 — `google` switched on.**
`CONVEX_BACKENDS=analytics,notifications,contacts,schedules,google`. Google
Calendar tokens are now read, refreshed and used entirely inside Convex;
`calendar_connections` was re-synced first. Verified after the switch: the
booking page renders, `/api/slots` returns the host's real weekday
availability, and `calendarChecked` is `false` — which is correct, because
every Google grant is currently dead. **Enabling this did not fix Calendar and
was never going to**; what it fixed is where the tokens live, so that when
hosts do reconnect, the new tokens land in Convex rather than in a project
that is due to be deleted.

**2026-09-20 — `notifications`, `contacts`, `schedules` switched on.**
`CONVEX_BACKENDS=analytics,notifications,contacts,schedules`. All tables except
`site_visits` were re-synced first; `site_visits` was deliberately excluded,
because Convex is now authoritative for it and `--replace` would have wiped
every row written since the analytics cutover. **That exclusion is the rule
from here on: never `--replace` a table a switched-on domain owns.** Verified
after the switch: all four hosts match Postgres exactly on all three domains.

Two rows had landed in Postgres between the pre-cutover sync and the switch.
Reconciled by diffing on `(visited_at, visitor_hash, path)` and appending only
the missing ones — 88 rows now, nothing only-in-Postgres, no duplicates.
`convex/verify.ts:visitKeys` is the query that makes that diff possible, and
the same shape works for any table switched later.

### Before flipping the switch

The backfill is a **snapshot**. Supabase keeps taking writes while it is the
live backend, so whatever lands between the export and the cutover exists only
in Postgres. Re-run `scripts/export-supabase.mjs` and re-import immediately
before switching any domain that takes writes — `--replace` makes that safe to
repeat.

## Before deploying this branch

Ordered. The first item is the one that breaks things.

1. **Set `EMAIL_POSTAL_ADDRESS` on the production Convex deployment, first.**

   ```
   npx convex env set EMAIL_POSTAL_ADDRESS "…" --prod
   ```

   The verification and password-reset emails are rendered inside Convex now
   (`convex/lib/emails.ts`), and they **throw** when it is unset rather than
   send a footer with no postal address in it. That is deliberate — a footer
   with the company name and no address is not a compliant footer, and quietly
   substituting one is how the old Supabase template went out wrong for weeks —
   but it means deploying this code to a deployment without the variable breaks
   sign-up and password reset outright.

   Safe to do before deploying: the code currently in production does not read
   it.

2. **Deploy the code**, then redeploy Vercel. Same ordering rule as every
   cutover above: a Vercel environment change does not reach a deployment that
   already exists.

3. **Remove the dead variables.** `SUPABASE_URL` on the production Convex
   deployment (already removed from dev), and `CONVEX_BACKENDS` on Vercel —
   nothing reads either. Harmless to leave, confusing to find later.

4. **Confirm what the privacy policy claims.** It now names Convex as the
   subprocessor and says data is stored **in the United States**. That region
   was not verified against the Convex dashboard — check it, because it is a
   statement about international transfer in a published legal document.

Still outstanding, unchanged by this branch: every Google Calendar grant is
dead and needs reconnecting, and the OAuth consent screen's publishing status
should be checked first — if it is still **Testing**, new refresh tokens expire
after 7 days.

## A gap found while stripping Supabase, 2026-09-20

**Seventeen pages and components query Supabase directly**, bypassing
`src/lib/data/*` entirely — the dashboard, the meetings list, the app shell's
notification badge, the onboarding steps, the admin settings page, the public
booking page and others. They were never routed through `convexServes`, so
**no domain flag ever covered them**.

That means those screens have been reading Postgres in production throughout,
including after each domain was reported "cut over". The parity harness did
not catch it because it compares the data-layer FUNCTIONS against Convex; it
never rendered a page. A green harness and a green screen were not the same
claim, and the difference went unnoticed.

Nothing was lost: Supabase still holds the same rows, so those screens have
been correct, just served from the wrong place. The work to fix it is real
though — these are queries to port, not imports to delete.

## What deleting Supabase would actually take

Not reachable by setting variables. Two hard blockers, and one consequence
people forget:

1. **Supabase Auth is the identity provider.** *(Plan revised 2026-09-20 to
   **Convex Auth** rather than Clerk — the deciding constraint is no additional
   service. See `docs/decisions/auth-migration-runbook.md`.)* Convex validates Supabase-issued
   ES256 tokens; `sub` is `profiles.id`. Delete the project and nobody can sign
   in — every session, the `/verify` gate and password reset go with it. This is
   the Phase 4 work deferred on purpose, and `docs/decisions/auth-provider.md`
   names Clerk as the destination precisely because it can import the bcrypt
   hashes Supabase stores, so the move need not force a password reset.
2. ~~**Google refresh tokens live in `calendar_connections` on Supabase.**~~
   **Done — `convex/google.ts`.** Exchange, refresh, revoke, free/busy, event
   create and delete all run as Convex actions now, so a refresh token is used
   where it lives and never crosses back out. Nothing returns a token, not even
   a short-lived access token. Public entry points are scoped by a session or a
   booking reference; everything else is internal. Enable with `google` in
   `CONVEX_BACKENDS`.
3. **The signup confirmation email is sent by Supabase Auth**, from a template
   pasted into its dashboard (`src/emails/supabase/confirm-signup.html`), not by
   Resend. It moves only when auth moves.

Everything else — all fifteen tables and file storage — can run on Convex today.

### Email and calendar, checked 2026-09-20

**Resend is already independent of Supabase.** `meetrao.com` is verified with
sending enabled, so booking, cancellation and reminder mail does not depend on
anything being migrated. (The README's "until DKIM verifies, Resend delivers
only to the account owner" caveat is now stale.)

**Google Calendar is degraded, and it is not the migration's doing.** Three of
four connections are flagged `needs_reconnect`:

| Account | State |
| --- | --- |
| `faisalibnislam@yahoo.com` | healthy |
| `faisalibnislam@gmail.com` | `needs_reconnect` — "Bad Request" (already failing before any migration work) |
| `hellonafis@gmail.com` | `needs_reconnect` — "Token has been expired or revoked" |
| `airlystudio@gmail.com` | `needs_reconnect` — "Token has been expired or revoked" |

**Update, same day: all FOUR are dead.** Exercising the ported path against
`faisalibnislam@yahoo.com` — the one still marked healthy — produced Google's
`Token has been expired or revoked`. Its `needs_reconnect=false` only meant
nobody had tried to use it recently.

The first export of the day recorded one failing connection; by evening every
one had failed. No code path in this session revokes a Google grant, and the
migration only ever copied these rows. The likeliest explanation is the
standard one: **an OAuth client still in "Testing" publishing status issues
refresh tokens that expire after seven days.** The connections are 8–12 days
old, which fits exactly.

**Check the OAuth consent screen's publishing status before asking anyone to
reconnect** — if it is still Testing, the new tokens will die in another seven
days and it will look like the same bug.

The silver lining: this WAS a real test of the port. `google.busyForHost` read
the connection, attempted the refresh, received Google's rejection and flagged
`needs_reconnect` with the message — the same behaviour `accessTokenFor` has in
`src/lib/google/connection.ts`. Every part of the chain except a successful
API response is verified. A successful free/busy call cannot be tested until
one host reconnects.

## What still runs on Supabase, and why

Two things, both deliberate.

**1. Auth.** Supabase Auth remains the identity provider, exactly as
`docs/decisions/auth-provider.md` decided. Convex validates its ES256 tokens;
`sub` is still `profiles.id`. Nothing about that changed.

**2. `calendar_connections`, for reads.** This is the one table the application
needs privileged access to, because it holds Google refresh tokens, and the
app's server code has no privileged channel into Convex. The two ways to create
one are both worse than the problem:

  · ship a Convex admin key into the app — which hands every caller of any
    route the keys to the whole deployment; or
  · expose a public function that returns tokens — which is precisely the
    disclosure the policy-free table existed to prevent.

So `src/lib/google/connection.ts` still reads from Supabase, where the service
role already protects it, and Supabase is alive for auth regardless. **The rows
are mirrored into Convex and the internal functions are ready**, so the real
fix — moving the Google calls themselves into Convex actions, where tokens are
used without ever leaving — is a contained piece of work rather than a
rewrite. Deleting a connection already writes to both sides so the mirror
cannot outlive the real row.

## Storage

Migrated. The `avatars` bucket's two live objects were imported into Convex
storage and both profiles now resolve to `convex.cloud/api/storage/…`; no
profile points at a Supabase Storage URL any more.

The upload flow changed shape, and it is stricter than before. Supabase used a
public bucket with a policy requiring the first path segment to be the
uploader's own id — the client chose the path and the policy was the guard.
Convex has no path-based policies, so the client no longer chooses a path at
all: it asks for a one-time upload URL, posts the bytes, and gets back an
opaque storage id. **There is no path to forge.** Which storage a deployment
uses is decided by the server action, not by a `NEXT_PUBLIC` flag, so the
browser cannot disagree with the backend about it.

## Deviations from Postgres, recorded deliberately

`create_booking` (migration 0005) checked availability against **all** of a
host's `availability_rules`, ignoring which schedule the meeting points at —
so a meeting attached to schedule B could be booked in schedule A's hours.
`convex/publicBooking.ts` checks against **the meeting's own schedule**, via
`rulesForMeeting`. This is stricter and matches what the slot engine shows the
guest. It is a behaviour change, not a transcription, and is called out here
rather than buried: a booking Postgres would have accepted may now be refused.

**`get_busy_intervals` is public on Convex, where it was service-role only.**
Migration 0003 revoked it from `anon` because it returned any host's occupied
blocks over an arbitrary window. A Convex `internalQuery` cannot be reached
from the app's server code without shipping an admin key into the app, which
would be worse. So `publicBooking.busyForHost` is public and keeps 0003's teeth
as constraints instead: the host must exist and not be suspended, the window is
clamped and capped at 90 days, and only start/end are returned — never a guest
name, email or meeting. What it discloses is what the booking page already
discloses by showing which slots are gone. The stricter end state is to move
slot computation into Convex so intervals never leave at all.
