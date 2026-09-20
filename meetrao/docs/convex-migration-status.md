# Convex migration — status

Updated 2026-09-20. Companion to `docs/convex-migration.md` (the plan) and
`docs/decisions/auth-provider.md` (the auth call).

**Supabase is still the system of record. Nothing has been removed, and the
running app still reads and writes Postgres.** What exists now is a complete,
deployed, data-loaded Convex backend running beside it.

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
