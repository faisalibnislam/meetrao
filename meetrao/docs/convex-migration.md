# Supabase dependency audit & Convex migration plan

Audited 2026-09-20 against commit `d1b719c`, the 19 migrations in `supabase/migrations/`,
and the live project `gpighkgvdiphdtpqpsfr` (Meetrao, ap-northeast-1, Postgres 17.6).

Nothing in this document removes Supabase. It is the map and the order of work.

---

## Part 1 — What depends on Supabase today

### 1.1 Database tables and relationships

15 tables, all in `public`. Row counts are live as of the audit.

| Table | Rows | Key columns | Parent |
| --- | --- | --- | --- |
| `profiles` | 4 | `id` (PK = `auth.users.id`), `username`, `timezone`, `is_admin`, `is_suspended`, 5 notify flags | `auth.users` ⊗ cascade |
| `meeting_types` | 5 | `user_id`, `slug`, `duration_minutes`, `buffer_minutes`, `minimum_notice_minutes`, `booking_window_days` | `profiles` ⊗ cascade |
| `availability_schedules` | 5 | `user_id`, `name`, `is_default` | `profiles` ⊗ cascade |
| `availability_rules` | 30 | `user_id`, `schedule_id`, `weekday`, `start_minute`, `end_minute` | `profiles` ⊗ cascade, `availability_schedules` ⊗ cascade |
| `bookings` | 7 | `reference` (unique), `host_id`, `meeting_type_id`, `starts_at`/`ends_at`, `status`, `google_event_id`, `meet_url`, `guest_rsvp`, `page_view_id` | `profiles` ⊗ cascade, `meeting_types` → null, `booking_page_views` → null |
| `booking_invitees` | 0 | `booking_id`, `email` | `bookings` ⊗ cascade |
| `contacts` | 5 | `user_id`, `email`, `source` (`manual`/`booking`/`import`) | `profiles` ⊗ cascade |
| `notifications` | 1 | `user_id`, `kind`, `booking_id`, `read_at` | `profiles` ⊗ cascade, `bookings` → null |
| `calendar_connections` | 4 | `user_id` (unique), `access_token`, `refresh_token`, `token_expires_at`, `scopes[]`, `needs_reconnect` | `profiles` ⊗ cascade |
| `booking_page_views` | 23 | `host_id`, `meeting_type_id`, `opened_at` | `profiles` ⊗ cascade, `meeting_types` → null |
| `site_visits` | 85 | `visitor_hash`, `visited_at`, dimensions (country/path/referrer/device/os/browser) | — |
| `admin_activity` | 63 | `actor_id`, `kind`, `summary` | `profiles` → null |
| `platform_settings` | 1 | singleton (`id boolean primary key check (id)`) | — |
| `bootstrap_admins` | 1 | `email` (PK) | — |
| `reserved_usernames` | 8 | `username` (PK) | — |

Two enums: `booking_status` (`confirmed`/`cancelled`), `cancelled_by` (`host`/`guest`).

**Constraints that carry real behaviour, not just hygiene:**

- `bookings_no_overlap` — an `EXCLUDE USING gist (host_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status = 'confirmed')`. This is the double-booking guard, and it is enforced by Postgres, not by application code. Requires the `btree_gist` extension (the only non-default extension installed).
- `profiles_username_key` — `unique (lower(username))`.
- `availability_schedules_one_default` — partial unique index, one default schedule per user.
- `meeting_types_user_slug_key`, `contacts_user_email_unique`, `booking_invitees_unique`.
- ~20 `CHECK` constraints: username/slug regex, email shape, duration and buffer ranges, weekday 0–6, minute 0–1440, cancel-field consistency, RSVP enum.

14 indexes beyond the primary keys, mostly `(user_id, …)` and two partial ones on `bookings`.

### 1.2 Auth

Supabase Auth, used end to end. 4 users — 3 email identities, 2 Google identities.

- **Providers**: email + password (`signUp`, `signInWithPassword`, `resetPasswordForEmail`, `updateUser`, `resend`, `verifyOtp`) and Google OAuth (`signInWithOAuth`, `exchangeCodeForSession`).
- **Session transport**: cookies via `@supabase/ssr`. Three clients in `src/lib/supabase/`: `client.ts` (browser, publishable key), `server.ts` (request-scoped, RLS applies), `admin.ts` (service role, bypasses RLS).
- **`src/proxy.ts`** (Next.js 16 middleware) refreshes the session cookie on every non-asset request and does the optimistic redirects. It calls `auth.getUser()` — a network round-trip to Supabase on every request — and reads `email_confirmed_at` to drive the `/verify` gate. It also rescues a stranded OAuth `?code=` that landed on `/`.
- **`handle_new_user()`** — an `AFTER INSERT ON auth.users` trigger that creates the profile, generates a username, sets `is_admin` from `bootstrap_admins`, and writes an `admin_activity` row. **Account creation is a database trigger, not application code.**
- **Account deletion** — `admin_remove_account()` deletes from `auth.users` and reserves the username.
- **Email templates**: `src/emails/supabase/confirm-signup.html` is pasted into the Supabase dashboard; the confirmation email is sent by Supabase, not by the app's Resend integration.

### 1.3 RLS policies

RLS is enabled on all 15 tables. 24 policies, following three shapes:

- **Owner**: `user_id = (select auth.uid())` — `meeting_types`, `availability_rules`, `availability_schedules`, `contacts`, `notifications`, `bookings` (via `host_id`), `booking_invitees` (via a subquery to `bookings`), `booking_page_views`.
- **Admin**: `public.is_admin()` — read-across on nearly every table, write on `profiles` and `platform_settings`.
- **Deliberately policy-free**: `calendar_connections`, `bootstrap_admins`, `reserved_usernames`, `site_visits` (insert-only via definer). RLS on with no policy means *no session can read it* — reachable only through the service role. The Google refresh tokens live here, and that is the whole design.

Column-level grants matter too: `revoke update (is_suspended)` and `revoke update (welcomed_at)` from `authenticated`, and `grant update (timezone_auto)` as the single exception.

### 1.4 Storage

One bucket: **`avatars`**, public, 4 objects.

- `src/components/app/avatar-upload.tsx` uploads WebP from the browser with the user's session (`.storage.from("avatars").upload(path, blob, { upsert: true })`).
- `src/lib/actions/avatar.ts` resolves `getPublicUrl()`, writes the result into `profiles.avatar_url`, and prunes stale files with `list()` + `remove()` via the service role.

`profiles.avatar_url` stores a **fully-qualified Supabase URL**, so every historical row embeds the project hostname.

### 1.5 Edge functions

**None.** The live project has zero deployed edge functions and there is no `supabase/functions/` directory. All server work runs in Next.js route handlers and server actions on Vercel.

### 1.6 Realtime subscriptions

**None.** No `.channel()`, no `postgres_changes`, no table added to the `supabase_realtime` publication. The notification bell reads on render; there is no live update anywhere.

### 1.7 Cron jobs

**None.** `pg_cron` is not installed, `vercel.json` has no `crons` key.

The one recurring job that *should* be scheduled isn't: `analytics_prune()` is called opportunistically from the `/api/analytics/collect` route on ordinary visitor traffic. Its own comment says so: *"Called from the collect route, not a cron."* If traffic stops, pruning stops.

### 1.8 Environment variables

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser, server, proxy, admin | also the hostname baked into `avatar_url` values |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser, server, proxy | ships to every browser |
| `SUPABASE_SERVICE_ROLE_KEY` | `admin.ts` | **and** silently doubles as the analytics hash salt |

Validated by a Zod schema in `src/lib/env.ts`; `npm run setup:check` reports the same.

> **Trap, partly corrected 2026-09-20.** `analyticsSalt()` in
> `src/app/api/analytics/collect/route.ts:147` returns
> `ANALYTICS_SALT || SUPABASE_SERVICE_ROLE_KEY`. The audit first reported the
> variable as unset — that was read from a `vercel env pull --environment=development`
> and was true only of Development. **Production has had `ANALYTICS_SALT` set
> since 2026-09-12**, so the service-role fallback was never live there and no
> visitor-hash reset was ever pending in production. Development and Preview
> genuinely lacked it and were given their own salt on 2026-09-20. Production's
> value was left untouched, deliberately: rewriting it is what *would* have
> reset the hashes.

Adjacent but not Supabase: `GOOGLE_CLIENT_ID`/`SECRET`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`, `EMAIL_FROM`, `EMAIL_POSTAL_ADDRESS`.

### 1.9 Frontend and server queries

38 non-test modules call Supabase. Grouped by how hard they are to move:

**Guest path (anonymous, `anon` grants) — highest risk**
| File | Touches |
| --- | --- |
| `lib/data/public-booking.ts` | `get_public_host`, `get_public_meeting_types`, `get_meeting_availability`, `get_busy_intervals` |
| `app/api/bookings/route.ts` | `create_booking`, `bookings`, `profiles` |
| `lib/data/guest-booking.ts` | `get_booking_by_reference` |
| `lib/actions/guest-cancel.ts` | `cancel_booking_by_reference`, `bookings`, `profiles` |
| `app/(public)/[username]/[slug]/page.tsx` | `record_booking_page_view` |

**Host app (session + RLS)**
`lib/data/{session,bookings,contacts,notifications,schedules,availability,timezone}.ts`,
`lib/actions/{availability,bookings,contacts,meetings,notifications,onboarding,schedule,settings,avatar,support}.ts`,
`app/(app)/{dashboard,meetings,availability,bookings/new}`, `components/app/app-shell.tsx`,
`app/onboarding/[step]/page.tsx`.

**Admin** — `lib/data/admin.ts` (15 calls), `lib/actions/admin.ts` (11), `app/(admin)/admin/settings/page.tsx`.

**Analytics** — `lib/data/analytics.ts` (`analytics_daily`, `analytics_overview`, `analytics_top`), `app/api/analytics/collect/route.ts` (`site_visits`, `analytics_prune`).

**Auth/infra** — `proxy.ts`, `app/auth/callback/route.ts`, `app/auth/confirm/route.ts`, `lib/actions/auth.ts`, `lib/actions/auth-client.ts`, `lib/email/welcome-once.ts`, `lib/google/connection.ts`.

### 1.10 The part that isn't in any of those buckets: 36 SQL functions and 17 triggers

This is the largest hidden dependency and the one most likely to be under-estimated.

**36 `SECURITY DEFINER` functions** carry real business logic in PL/pgSQL — `create_booking` alone validates host, suspension, meeting type, minimum notice, booking window, weekday availability in the host's timezone, and buffer overlap before inserting.

**17 triggers fire behaviour that no application code requests:**

| Trigger | Does |
| --- | --- |
| `on_auth_user_created` | creates the profile + username + admin flag |
| `bookings_notify_created` / `_changed` | writes `notifications` rows |
| `bookings_make_contact`, `booking_invitees_make_contact` | upserts `contacts` |
| `bookings_log_created` / `_cancelled`, `meeting_types_log_created`, `calendar_connections_log_created` | writes `admin_activity` |
| `profiles_reject_reserved_username` | blocks reserved usernames |
| 6 × `touch_updated_at` | maintains `updated_at` |

**Convex has no triggers.** Every one of these becomes an explicit call inside a mutation, and a missed one is a silent data bug, not a crash.

---

## Part 2 — Migration plan to Convex

### 2.1 The shape of the problem

The good news is the data: **4 users, 7 bookings, 85 visits.** Data migration is a scripted afternoon, not a project. Backfill can be re-run from scratch as many times as needed.

Essentially all the risk is in code, and it concentrates in five places:

1. **RLS disappears.** Convex has no row-level security. All 24 policies become explicit authorization code inside Convex functions. A forgotten check is a data leak, and nothing fails loudly.
2. **Triggers disappear.** 17 of them, listed above.
3. **Unique constraints disappear.** Convex indexes do not enforce uniqueness. `lower(username)`, `(user_id, slug)`, `(user_id, email)`, and the one-default-schedule rule all need re-implementing.
4. **The overlap guard disappears** — but this is the one that gets *better*. **Tested and confirmed, 2026-09-20** (§2.6): the `EXCLUDE` constraint becomes ~10 lines of TypeScript with the same guarantee.
5. **Auth is a one-way door — or it was.** Supabase Auth can stay on as Convex's identity provider (`customJwt`, ES256), which keeps `sub` equal to `profiles.id` and removes the irreversible step from the critical path. See `docs/decisions/auth-provider.md`.

Free upgrades on arrival: reactivity (the notification bell and bookings list become live with no polling), proper cron scheduling for `analytics_prune`, and end-to-end TypeScript types replacing hand-written RPC shapes.

New gaps to cover: Convex has **no built-in rate limiting**, and public Convex functions are internet-callable by default. `create_booking` is currently granted to `anon` and is already the abuse surface — it must not get quieter on the way over.

### 2.2 Mapping

| Supabase | Convex |
| --- | --- |
| Tables + FKs | `convex/schema.ts`, `v.id("table")` references. **No cascade** — write explicit cleanup |
| RLS owner policies | a `withUser` wrapper that resolves the caller and asserts ownership |
| RLS admin policies | an `assertAdmin(ctx)` helper reading `profiles.isAdmin` |
| Policy-free tables (`calendar_connections`) | `internalQuery`/`internalMutation` only — not reachable from a client at all. Cleaner than today |
| `SECURITY DEFINER` RPC | `query` / `mutation` |
| RPC granted to `anon` | public `query`/`mutation` + argument validators + rate limiting |
| Triggers | explicit calls in mutations, or `convex-helpers` `customMutation` wrappers |
| `EXCLUDE … gist` | read-then-insert inside one mutation (serializable) |
| Unique indexes | check-then-insert inside one mutation; or a lookup table keyed by the unique value |
| `CHECK` constraints | Convex validators + guard clauses |
| `auth.users` | Convex Auth, or Clerk / WorkOS |
| Storage bucket | `ctx.storage`, `storageId` in place of a URL |
| Aggregates (`analytics_*`) | JS reduction over an indexed read; the `@convex-dev/aggregate` component if `site_visits` grows |
| `analytics_prune` from a route | `convex/crons.ts` — an actual schedule |
| `@supabase/ssr` cookie refresh in `proxy.ts` | the auth provider's middleware; `preloadQuery`/`fetchQuery` in server components |

### 2.3 Phases

Supabase stays the system of record until Phase 6. Everything before that is additive.

**Phase 0 — Decide and de-risk (no production code)**
- Set `ANALYTICS_SALT` explicitly in Vercel **now**, before anything else (§1.8).
- ~~Choose the auth provider.~~ **Worked up — see `docs/decisions/auth-provider.md`.** Proposed: keep Supabase Auth as Convex's JWT provider for the migration (proven in `docs/spikes/convex-supabase-jwt/`), with Clerk as the eventual destination. This moves Phase 4 off the critical path. **Awaiting a decision.**
- ~~Spike the concurrency proof.~~ **Done — passed. See §2.6.**
- Decide the fate of `availability_rules.schedule_id` — the two-migration history (`set null` then `cascade`) should be settled before the schema is transcribed.

**Phase 1 — Scaffolding (Supabase untouched)**
- Add `convex/` with `schema.ts` transcribing all 15 tables and every index.
- Add `NEXT_PUBLIC_CONVEX_URL` / `CONVEX_DEPLOYMENT`; keep all Supabase vars.
- Write a one-shot backfill script (Postgres → Convex) that is idempotent and re-runnable.
- Port `src/lib/booking/slots.ts` verbatim — it is already pure and unit-tested, and its 405 tests are the safety net for Phase 3.

**Phase 2 — Leaf domains behind a flag**
Order chosen by blast radius, lowest first: **analytics → contacts → notifications → admin activity log.**
Each gets its Convex functions, a read-path flag, and a parity test against the Supabase result. `site_visits` is append-only with no foreign keys — it is the ideal first move, and it retires the piggybacked prune in favour of `crons.ts`.

**Phase 3 — The booking core (highest risk)**
Port `create_booking`, `cancel_booking_by_reference`, `get_booking_by_reference`, `get_public_*`, `get_meeting_availability`, `get_busy_intervals`, and every `bookings`/`meeting_types`/`availability_*` path — plus, explicitly, the 6 triggers that hang off `bookings`. Run **dual-write** here: write to both, read from Supabase, and reconcile nightly until the diff is empty for a week. Add rate limiting to the public booking mutation in this phase, not later.

**Phase 4 — Auth cutover (the one-way door)**
Migrate the 4 users, force a password reset, keep Google sign-in continuous by matching on email. Replace `proxy.ts`'s Supabase session refresh with the provider's middleware. Re-point `app/auth/callback` and `app/auth/confirm`. Re-implement `handle_new_user` as an explicit "create profile on first sign-in" mutation. Move the signup confirmation email off the Supabase dashboard template onto Resend, which the app already uses for everything else. **Schedule this for a quiet window and tell the 4 users first.**

**Phase 5 — Storage**
Move 4 avatar objects to Convex storage. `profiles.avatar_url` becomes `avatarStorageId`; keep the old column populated during transition so nothing renders a broken image, and write a fallback that serves the legacy URL when the new field is null.

**Phase 6 — Decommission (explicitly out of scope for now)**
Only once dual-run has been clean for a sustained period. Keep the Supabase project paused-but-alive for a rollback window, and keep `supabase/migrations/` in the repo as the historical record of intent.

### 2.4 Risk register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| A missed RLS policy becomes a data leak | **High** | Enumerate all 24 policies as a checklist; one test per policy asserting a non-owner is refused |
| A missed trigger silently stops writing rows | **High** | The 17-row table in §1.10 is the checklist; assert side effects in mutation tests |
| Double-booking regression | ~~**High**~~ → Medium | Phase 0 spike passed (§2.6); residual risk is the port of the *predicate*, covered by the existing 405 slot tests |
| Google refresh tokens exposed by a wrong function type | **High** | `calendar_connections` is `internal*`-only; lint against importing it from a public function |
| Password reset for all users | ~~Medium~~ → avoidable | Supabase stays as the IdP during migration; Clerk imports bcrypt hashes later. Verify both before relying on it |
| Username uniqueness race | Medium | Check-then-insert in one mutation; keep `reserved_usernames` semantics |
| `avatar_url` breaks | Low | Dual-field transition in Phase 5 |
| Analytics hash reset | Low — but irreversible | Set `ANALYTICS_SALT` in Phase 0 |

### 2.5 What to do first

1. Set `ANALYTICS_SALT` in Vercel.
2. Pick the auth provider.
3. ~~Run the concurrency spike.~~ **Done, passed — §2.6.**

---

### 2.6 Spike result — the double-booking guard holds

Run 2026-09-20 against a **real Convex backend** (v1.46.0, local anonymous
deployment, the actual OCC engine — not `convex-test`, which mocks the database
and runs mutations sequentially and therefore cannot prove anything about
concurrency). Code and instructions: `docs/spikes/convex-concurrency/`.

The mutation reads with a **narrow index range**, not a table scan — the harder
case for OCC, since a wider read set makes conflicts easier to detect.

| Test | Result |
| --- | --- |
| 25 concurrent requests, identical slot | 1 won, 24 cleanly rejected `slot taken`, **1 row committed** |
| 10 concurrent requests staggered inside a 15-min buffer | 2 committed, **no pair conflicts** (see below) |
| 20 concurrent non-overlapping requests | **all 20 committed** — no over-rejection |
| 30 repeated trials × 8 racers (240 racers) | **30 winners, 0 double-bookings** |

**Verdict: the gate passes.** A read-then-insert inside one Convex mutation
gives the same guarantee as the `EXCLUDE USING gist` constraint. Losers receive
the ordinary `slot taken` error — the OCC retry is invisible to the client, and
no internal conflict error ever surfaced.

Two things worth carrying forward:

- **The spike's value was catching a wrong assertion, not a wrong engine.** The
  buffer test first asserted "exactly one winner" and failed with 2. Both
  winners were exactly buffer-adjacent — legal. Cross-checked against Postgres
  on the live database: `a_end + 15min > b_start` is **false** at a 15-minute
  buffer and **true** at 16. The two engines agree on the predicate; the test
  was wrong. Assert *no pair conflicts*, never a winner count.
- **Retries are invisible, which cuts both ways.** Nothing surfaced a conflict
  error at this contention level, but Convex does bound its retries. A mutation
  that becomes slow or reads a wide range could start surfacing conflicts under
  load. Keep the booking read range narrow, and do not add unrelated writes to
  the booking mutation.

**Not covered by this spike**, and still open: behaviour on a multi-node cloud
deployment under sustained load, and rate limiting for the public booking
mutation (Convex has none built in — Phase 3).
