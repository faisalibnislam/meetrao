# Meetrao — handoff

> Read this first if you are a Claude (or any agent) picking this project up, on this Mac or another one. Then read CLAUDE.md / AGENTS.md. Keep this file current: after every change to the project, update "Current state", "Next steps" and "Change log", and commit it.

Last updated: 2026-11-27 (calendar feed) · Written on: Faisal's MacBook Pro M5

## 1. What this is

Meetrao is a scheduling product (a Calendly-style booking tool). A host adds their calendar's private iCal feed
(for conflicts) and their own video link, defines bookable
meetings, sets weekly availability (several named schedules), and shares one link, `meetrao.com/<username>`.
Guests pick from times the host is really free and get a confirmed booking; host and guest each get an emailed
calendar invite (.ics) carrying the host's video link. Meetrao has no Google Calendar access (removed 2026-11-27). Hosts can also schedule a meeting and invite several people. Companies (workspaces) own a custom domain
and give members branded links; there is an admin console, contacts (auto-filled, CSV import/export), notifications,
reminders, analytics, a public REST API (`/api/v1`), an embeddable booking form, and inbound support mail.

Plans (from `meetrao/docs/decisions/business-plan-companies.md`): Free, Pro ($3/month, $30/year, 1 company) and
Business ($9/month, $99/year, 10 companies). Billing through Polar.

Platforms and status:
- **Web** (`meetrao/`, Next.js on Vercel, backend on Convex): **shipped**, live at `https://meetrao.com` (per the
  README and the iOS defaults; not re-checked for this handoff).
- **iOS host app** (`ios/`, SwiftUI, iOS 26+, iPhone and iPad, "Next meeting" widget): built and tested in the
  Simulator, **not released**, no signing team set, Sign in with Apple and push switched off.
- Overall: **dormant since 2026-10-31** (last commit). Most work happened 2026-09-06 to 2026-10-17.

## 2. Where it lives

- GitHub: `https://github.com/faisalibnislam/meetrao` (remote `origin`). Default branch `main`; current branch on
  this Mac `main`, in sync with `origin/main`.
- Path on this Mac: `/Volumes/Corsair/Github External/Airly Studio External/meetrao` (external Corsair drive), also
  `~/Documents/GitHub/Airly Studio/meetrao` (symlinked folder).
- On a new Mac: `git clone https://github.com/faisalibnislam/meetrao.git`.
- Repo layout (the root is not the app):
  - `meetrao/` — the Next.js web app and the Convex backend (`meetrao/convex/`). Vercel's Root Directory.
  - `ios/` — the SwiftUI host app (XcodeGen `project.yml`, generated `Meetrao.xcodeproj` committed).
  - `project/` — the Claude Design source files (`*.dc.html` prototypes, emails, assets) and
    `project/design_handoff_meetrao/` (the design spec: `README.md`, `START-HERE.md`, `BUILD-FROM-SCRATCH.md`,
    `CHANGELOG.md`). The `.dc.html` files are the authority for values and copy.
  - `chats/chat1.md` — the original design conversation. Root `README.md` is the design-bundle README ("coding
    agents read this first"), not app documentation.
- Related: none in other repos. The Resend account is shared with the owner's other apps (e.g. macloving.app).

## 3. Setting up on a new Mac

Toolchain: Node 22+ (this Mac has 24.22.2; no `.nvmrc`), **npm** (the app uses `package-lock.json`, not pnpm),
Xcode 26+ and XcodeGen (`brew install xcodegen`) for iOS. The Convex Swift package (`convex-swift` 0.8.1) ships
arm64 only, so no Intel simulators.

```bash
git clone https://github.com/faisalibnislam/meetrao.git && cd meetrao/meetrao
npm install
npx convex dev            # log in to Convex (project faisal-islam/meetrao); writes CONVEX_DEPLOYMENT + NEXT_PUBLIC_CONVEX_URL
cp .env.example .env.local  # then MERGE in the rest; don't overwrite what convex dev wrote
npm run setup:check       # names anything still missing (prints names only)
npm run dev               # http://localhost:3000
```

Config names (values are not in git):
- `meetrao/.env.local` on this Mac currently has: `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`,
  `NEXT_PUBLIC_CONVEX_SITE_URL`, `VERCEL_OIDC_TOKEN` (written by the Vercel CLI). `setup:check` also wants
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `NEXT_PUBLIC_SITE_URL`.
- Full list of web-side names: `meetrao/src/lib/env.ts` and `meetrao/.env.example`. Convex-side names: see section 7.
- Convex dev deployment named in `docs/convex-migration-status.md`: `festive-meerkat-460`. Production deployment
  (from `ios/project.yml`): `avid-dotterel-109`.
- Vercel: the repo root and `meetrao/` both have a `.vercel` link (gitignored). Re-link with `vercel link` from the
  repo root (Root Directory is `meetrao`).

Signing (iOS): `DEVELOPMENT_TEAM` is empty and bundle IDs are `com.meetrao.app` / `.widget` / `.tests` (see Next
steps: move to team 7K32QQ2FX8 and `app.meetrao.*`).

Accounts: GitHub (faisalibnislam), Convex (`faisal-islam/meetrao`), Vercel, Google Cloud (one OAuth client, used
for Sign in with Google only), Resend (domain meetrao.com), Polar, optionally Google Analytics.

## 4. Architecture

Stack: Next.js 16.3 (App Router) + React 19 + Tailwind 4 + TypeScript; Convex as database, auth provider
(`@convex-dev/auth`, email + password with bcrypt verification for migrated users, Google, optional Apple), file
storage, cron host, and where host calendar feeds are fetched (ical.js) and cached; Resend for email; Polar for billing;
Vercel Speed Insights; date-fns/tz; Vitest. Supabase was the original backend and was fully removed by 2026-09-20
(`meetrao/supabase/migrations/` is history only).

Key paths (inside `meetrao/`):
- `src/app/(marketing)/` landing, Terms, Privacy, Help, Support; `(auth)/` log in, sign up, forgot, reset, verify,
  suspended; `onboarding/[step]/` five setup steps; `(app)/` dashboard, bookings, meetings, contacts,
  notifications, availability, settings; `(admin)/` admin console; `(public)/` guest booking page, confirmation,
  cancellation, `.ics`.
- `src/app/api/` — `slots`, `bookings` (+ `reschedule`), `polar/webhook`,
  `resend/inbound`, `analytics/collect`, `contacts/export`, `me`, `app/bookings/*` (used by the iOS app for cancel
  and move), `v1/` (public API).
- `src/lib/booking/slots.ts` — the pure slot engine (unit-tested). `src/lib/calendar/` feed facade over
  `convex/calendarFeed.ts` and the iTIP invite builder (`invite.ts`). `src/lib/env.ts` all env reads. `src/lib/custom-domain.ts`, `src/lib/csv.ts`,
  `src/lib/ios/sync.test.ts` (checks every Convex function the Swift code names still exists).
- `src/components/ui/` primitives (Button, Icon set in-house, MenuSelect, Modal, Toast); `src/emails/` the design's
  send-ready HTML; `src/app/globals.css` verbatim design tokens.
- `convex/` — `schema.ts`, `auth.ts`/`auth.config.ts`/`authCrypto.ts`, `bookings.ts` (double-booking guard
  `findOverlap`), `publicBooking.ts`, `availability.ts`, `meetingTypes.ts`, `companies*.ts`, `billing.ts`
  (`applyPolarSubscription`), `calendarFeed.ts` (+ `lib/icalFeed.ts` parser), `revokeGoogleCalendar.ts` (one-off), `reminders.ts`,
  `push.ts`/`pushNode.ts` (APNs), `webhooks.ts`, `apiKeys.ts`/`apiPublic.ts`, `crons.ts`, `http.ts`,
  `lib/auth.ts` (`currentUserId`, the one place an auth subject becomes a profile id), `lib/emails.ts`.
- `docs/` — `convex-migration.md` (plan), `convex-migration-status.md`, `decisions/` (auth provider, auth migration
  runbook, business plan/companies), `spikes/`.
- `ios/` — `Meetrao/` app, `MeetraoWidget/`, `Shared/`, `MeetraoTests/`, `project.yml`, `README.md`.

Data flow: browsers and the iOS app talk to Convex directly. Guest booking: `/api/slots` computes free slots
(availability + the host's calendar feed, cached 5 minutes in `calendar_feeds`), booking creation re-runs the slot
engine server-side and Convex re-checks inside its own transaction; either returns 409 on a clash. The feed URL is a
secret: stored only in Convex, shown masked, fetched only inside
Convex. Emails: booking/welcome mail from the Next.js side (`RESEND_API_KEY`), verification and reset mail from
Convex (`AUTH_RESEND_KEY`). Polar's webhook hits a Next route that verifies the signature and calls a Convex mutation.

## 5. Build, run, test

From `meetrao/meetrao` (the app folder):
```bash
npm run dev               # next dev, port 3000
npm test                  # vitest run
npm run lint              # eslint
npm run build             # the same build Vercel runs
npm run setup:check       # env names check
npx convex dev            # push functions to the dev deployment while developing
```
Scripts against a real deployment (they create and clean up their own data; point them at dev, not production):
`node scripts/booking-core-check.mjs`, `node scripts/signup-flow-check.mjs`, `node scripts/reset-flow-check.mjs`
(exact arguments unverified; read each file's header first).

`.claude/launch.json` (repo root) has `meetrao-dev` (`npm --prefix meetrao run dev`, port 3000).

iOS:
```bash
cd ios && xcodegen && open Meetrao.xcodeproj
xcodebuild test -project Meetrao.xcodeproj -scheme Meetrao -destination 'platform=iOS Simulator,name=iPhone 18 Pro'
```
Debug builds point at production Convex by default (`MEETRAO_CONVEX_URL` in `project.yml`); override with
`SIMCTL_CHILD_MEETRAO_CONVEX_URL` / `SIMCTL_CHILD_MEETRAO_SITE_URL` for a local backend. Integration tests run only
with `TEST_RUNNER_MEETRAO_IT_*` variables set (see `ios/README.md`); never against production.

## 6. Release / deploy

- **A push/merge to `main` deploys the website**: Vercel's git integration builds `main` from the repo with Root
  Directory `meetrao`, region `iad1` (`meetrao/vercel.json`). Work has gone through PRs (`claude/*` branches,
  squash-merged) and the last commit went straight to `main`.
- **Convex is deployed separately and by hand**: `npx convex deploy` with the production deploy key. When a change
  touches both, **deploy Convex first**, then merge to `main` (an app reading a field older Convex did not return
  once caused a redirect loop that took the site down).
- A CLI `vercel deploy` must run from the repo root, not from `meetrao/` (otherwise it looks for `meetrao/meetrao/`).
- No GitHub Actions, no version scheme beyond `package.json` 0.1.0.
- iOS: no release process yet (no team, no App Store Connect app). Global rules apply once it exists: ask before any
  TestFlight upload or App Store submission.

## 7. Secrets and accounts (locations only, never values)

| Secret / setting | Where it lives |
| --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_RESEND_KEY`, `EMAIL_FROM`, `EMAIL_POSTAL_ADDRESS`, `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`, `ANALYTICS_INGEST_SECRET`, `CONVEX_SERVER_SECRET` (same value also on Vercel), optional `APPLE_BUNDLE_ID`, `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APNS_BUNDLE_ID` | Convex deployment env (`npx convex env list`), separately for dev and production |
| `NEXT_PUBLIC_CONVEX_URL`, `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `SUPPORT_INBOX`/`SUPPORT_EMAIL`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER`, `POLAR_PRODUCT_MONTHLY/YEARLY`, `ANALYTICS_SALT`, `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` (custom domains), `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_APPLE_SIGN_IN`, `NEXT_PUBLIC_SITE_URL` | Vercel project env (see `src/lib/env.ts` for which are optional) |
| Polar product ids per tier (Pro/Business, monthly/yearly) | `platform_settings` in the Convex database, set from the admin console |
| Production Convex deploy key | Convex dashboard (generate when deploying); not stored in the repo |
| Local dev values | `meetrao/.env.local` (gitignored, this Mac only). Recreate with `npx convex dev` + `vercel env pull` or by hand |
| Vercel CLI link + OIDC token | `.vercel/` folders and `VERCEL_OIDC_TOKEN` in `.env.local`; recreate with `vercel link` |

`EMAIL_FROM` and `EMAIL_POSTAL_ADDRESS` have code defaults on the web side; a stale dashboard value overrides them.
The Convex side has no default for `EMAIL_POSTAL_ADDRESS` and throws without it. Never copy values between
machines in plain text; use the dashboards.

## 8. Rules and conventions

Read `meetrao/README.md` ("Decisions worth knowing"), `meetrao/AGENTS.md` (Next.js 16 has breaking changes: read
`node_modules/next/dist/docs/` before unfamiliar APIs; `meetrao/CLAUDE.md` just includes it), `project/CLAUDE.md`
(design files: every design change appends to `project/design_handoff_meetrao/CHANGELOG.md` right after the intro's
`---`) and `ios/README.md`. Most likely to break:
- The `.dc.html` design files are the authority for every value and piece of copy; tokens in `globals.css` are
  verbatim and irregular on purpose (`--ink-3` is `#66635C` for contrast; do not lighten it).
- Deploy Convex before merging web changes that depend on it.
- Secrets live in two places (Vercel and Convex); `setup:check` sees only the local file.
- Google OAuth is used for Sign in with Google only (Convex Auth's `/api/auth/callback/google`). Google Cloud
  project `meetup-507707` (account faisal@airlystudio.com, `authuser=1`): Audience "In production", External;
  Data access is only `userinfo.email` + `userinfo.profile` (no sensitive scopes, so no verification needed);
  branding verified; the OAuth client's redirect URIs are only the two `<deployment>.convex.site/api/auth/callback/google`
  ones (dev `festive-meerkat-460`, prod `avid-dotterel-109`). Adding any sensitive scope reopens Google review.
- Cancelling is a POST behind a confirm step (mail scanners fetch GET links).
- `convex/lib/auth.ts` `currentUserId` is the only place an auth subject maps to a profile; keep sign-in and reset
  responses generic (no account enumeration).
- Copy style: one date style, no promises of a page at a bare name, no em dashes in recent copy (commit "Take the em
  dashes out of the comments too").
- Commit messages end with the Claude co-author line; PRs from `claude/*` branches.

## 9. Current state (as of 2026-11-19, operator change and speed pass 2026-11-27)

- **Google Calendar replaced (2026-11-27, PR #75):** Meetrao no longer has any Google Calendar access, which
  makes Google's sensitive-scope verification for project `meetup-507707` unnecessary. The user sends Google the
  "no longer need these scopes" reply themselves. What replaced it:
  - **Calendar feed for conflicts.** The host pastes a private iCal address in Settings → Calendar or onboarding
    step 2. It lives in `calendar_feeds` (Convex). It is read by `convex/calendarFeed.ts` and parsed by
    `convex/lib/icalFeed.ts` (ical.js: RRULE/EXDATE/overrides, transparent and cancelled events skipped, all-day
    and floating times in the host's zone). Only busy start/end times are cached, for 5 minutes, covering yesterday
    to a year out. `busyForHost` is server-only (`CONVEX_SERVER_SECRET`).
  - **The feed URL is a secret.** The client sees only `url_hint`, nothing logs it, and the account purge deletes
    it.
  - **Unreadable feed.** Booking falls back to Meetrao's own bookings (`calendarChecked: false`), and Settings and
    the dashboard show "unreachable".
  - **Invites by email.** Every booking email carries an iTIP `.ics` built by `src/lib/calendar/invite.ts`. The UID
    is `<reference>@meetrao.com`, SEQUENCE is the booking `revision`, and a cancellation sends `METHOD:CANCEL`.
    The guest's copy is organised by the host. The host's copy is organised by Meetrao (support@), with the host
    shown as already accepted.
  - **Video link.** `profiles.video_link` (Settings → Calendar, onboarding). The stored location value
    `google_meet` means "Video call". The link is copied onto each booking's `meet_url`. With no link, booking or
    scheduling a video call is refused and saving a video meeting is blocked. The dashboard, meeting form and
    onboarding show the prompt.
  - **Removed.** The OAuth connect/callback routes, `src/lib/google/*`, `convex/google.ts`,
    `calendarConnections.ts`, `lib/googleApi.ts`, `rsvp.ts` and its cron, and all event writes.
    `convex/revokeGoogleCalendar.ts` is a one-off. The `calendar_connections` table stays in the schema until
    that has run on prod.
  - **Fixed alongside.** "Moved" emails had never sent: their Resend idempotency key held an en dash.
  - **Verified on dev** with a throwaway host and a real public feed (`ics.fixtur.es`). Busy slots were hidden,
    409 was returned on busy slots, and the invites (request, move SEQUENCE 2, cancel) parsed correctly. The
    fixtures are `testCleanup:seedFeedHostFixture` / `purgeFeedHostFixture` and `calendarFeed:saveFor`.
  - **Production at the switch:** 2 hosts, 3 meetings (all video calls), no `video_link` yet. Their video meetings
    stay unbookable until each host saves a link.
  - **Deployed 2026-11-27.** Convex prod was deployed first, with a temporary uncommitted `google.ts` shim so the
    old site kept booking. Then PR #75 was merged and Vercel went live. Then Convex prod was redeployed from `main`
    without the shim. `revokeGoogleCalendar:run --prod` revoked 1 grant, found 1 already invalid, and left 0. On
    dev it found 3 already invalid and left 0. meetrao.com was checked: the pages return 200, the booking page shows
    "Video call", the Privacy feed section is live, and `/api/google/connect` returns 404.

- **DNS and email (2026-11-27):** meetrao.com DNS moved from Vercel DNS to **Cloudflare** (Free plan, zone in the
  faisalibnislam@gmail.com account; Namecheap nameservers `carol.ns.cloudflare.com` / `doug.ns.cloudflare.com`).
  Web records are DNS-only: apex `A 76.76.21.21`, `www CNAME cname.vercel-dns.com`. Resend re-added meetrao.com
  (us-east-1, sending + receiving, all verified): `send`/`rsend` CNAMEs to `*.forge.rmta.net`, apex
  `MX 9 receive.forge.rmta.net`, same DKIM as before. Stale `_domainconnect` CNAME left in Cloudflare (harmless).
- **Security pass (2026-11-27):** `publicBooking.busyForHost`, `google.busyForHost` and
  `publicBooking.recordPageView` accept only calls carrying `CONVEX_SERVER_SECRET` (`convex/lib/serverSecret.ts`;
  separate values for dev and prod, set on each Convex deployment and on Vercel: Production = prod value,
  Preview/Development = dev value, because previews use dev Convex). `recordPageView` also checks the host and
  meeting exist and allows 60 per host per minute. `admin.purgeAccount` deletes page views in batches of 1,000 and
  schedules `admin.purgePageViews` for the rest. The public API sends the raw key to `convex/apiPublic.ts`, which
  hashes it there (`hash` is no longer accepted), `resolveKey` was removed, and `touchKey` writes at most once a
  minute. `LEGACY_CALLERS_ALLOWED` in `serverSecret.ts` is a deploy-only switch: committed false.
- **Speed pass (2026-11-27):** `/help` is static (nav reads the session in the browser); `optionalSession` and
  `/api/me` skip Convex when there is no session token; guest booking page and `/api/slots` reuse the hours that
  come back with the meeting; `google.busyForHost` reads host + connection in one internal query and calls the token
  logic directly instead of nested `runAction`s; `companyPlaceOf` reads the host's memberships (`by_user`) instead of
  every company member; `rate_limits` has a `by_window_start` index and the sweep batches until done. Locked in by
  `src/lib/round-trips.test.ts`. Production numbers before: booking page 558 ms median / 800 ms p95, `/help` 865 ms
  p95. Convex prod insights were healthy; queries take 5-15 ms warm, so the remaining booking-page time is the Google
  call, Vercel cold starts (low traffic) and render.

- **Operator (2026-11-27):** Meetrao is operated by **Space Cherries LLC**, 5242 Elbetee Lane, Alexandria, VA 22312,
  USA (www.spacecherries.com). One definition in `meetrao/src/lib/contact.ts` (`POSTAL_ADDRESS`, `OPERATOR_NAME`,
  `OPERATOR_URL`, `OPERATOR_LINE`). Terms: Virginia law, Fairfax County courts. Privacy: controller Space Cherries
  LLC, operated from the US. Footer, JSON-LD, pricing and comparison copy, iOS Account screen and the design files
  all name it; the "built by one person" line is gone. Convex `EMAIL_POSTAL_ADDRESS` set to `OPERATOR_LINE` on dev
  (`festive-meerkat-460`) and prod (`avid-dotterel-109`).
- Git: `main` at `cf81234`, equal to `origin/main`. No stashes; no extra worktrees (`.claude/worktrees/` is empty).
- **1 uncommitted file, only on this Mac:** `.gitignore` (generic "local junk & regenerable caches" block from a
  2026-11-11 cleanup). Harmless.
- `graphify-out/` was created on 2026-11-19 for this handoff (untracked).
- 49 local branches. Local-only: `gitbutler/workspace` (1 "GitButler Workspace Commit", 2026-09-21, tool artefact).
  `claude/feature-batches` (also on GitHub) holds 15 commits from 2026-09-28 to 10-02 that are not on `main` as the
  same patches (reschedule, reminders, per-meeting questions, phone/room locations, date overrides, group slots,
  round robin, embed, webhooks/feeds, paid plan); `main` has files for most of these features, so they probably
  landed another way (guess; compare before deleting). Five branches (`claude/company-analytics`, `copy-and-labels`,
  `elsewhere-skew`, `empty-state-workspace`, `project-setup-c0221a`) show "ahead 1" of their remotes only because
  of squash merges; nothing unique.
- Recent activity (newest first): 2026-10-31 inbound mail ignores mail not addressed to meetrao.com (the shared Resend
  account delivered macloving.app support mail here); 2026-10-17 PRs #69 to #71 (web changes: editable meeting links
  that keep old ones working, Meet warning, custom duration, Terms with three plans, sign-in screens redesigned in
  two panels); 2026-10-16 PRs #66 to #68 (native iOS host app, beige ground, company dashboard); 2026-10-05 new link
  preview image; 2026-10-04 PRs #43 to #64 (companies with domains and branding, Business plan, company roles and
  analytics, design and engineering audits, iad1 region).
- What works (per docs and commit history): the full web product on Convex; 405 tests passed at the 2026-09-20
  migration checkpoint (current count unverified). Not verified for this handoff: that production is up and that
  Convex production matches `main`.
- Half-done: iOS app needs a paid team for Sign in with Apple and push (written and tested server-side, switched off).

## 10. Next steps / open work

00. **Optional Meet links (user wants this later):** a "Create a Meet link for each booking" switch using the
    Google Meet REST API (`spaces.create`, scope `meetings.space.created`, sensitive, needs a smaller Google
    review). Not built.
01. Both prod hosts must add a video link (Settings → Calendar) or their video meetings stay unbookable. They can
    add a calendar feed there too.
02. `revokeGoogleCalendar:run --prod` has reported `remaining: 0` (2026-11-27), so it is now safe to delete `convex/revokeGoogleCalendar.ts` and the
    `calendar_connections` table from `schema.ts`. The booking columns `google_event_id` and `guest_rsvp*` are
    unused now (the API still returns `guest_rsvp`); drop them with a migration when convenient. Remove the Google Cloud side was
    cleaned up on 2026-11-27 (calendar scopes and `/api/google/callback` redirect URIs removed).
03. Guest booking page: a video meeting from a host with no link is refused only when the guest submits. Hiding it
    up front would be nicer. Also, the guest's "Moved" subject line shows the host's time zone (pre-existing).
04. Group meetings now give the host one invite per seat (they used to share one Google event).

0. Vercel `EMAIL_POSTAL_ADDRESS` was updated to `OPERATOR_LINE` on 2026-11-27 (Production, Preview, Development);
   it applies from the next production deploy.
   Also: the App Store seller name comes from the Apple Developer enrollment (Individual, "Abu Mohammad Faisal");
   showing Space Cherries LLC needs an Organization enrollment.
1. iOS signing per the account conventions: set `DEVELOPMENT_TEAM: 7K32QQ2FX8` in `ios/project.yml`, rename bundle
   IDs from `com.meetrao.app` to `app.meetrao.Meetrao` (widget `app.meetrao.Meetrao.MeetraoWidget`), keychain group
   `com.meetrao.shared` accordingly, and update `APPLE_BUNDLE_ID` / `APNS_BUNDLE_ID` on Convex. The app is
   unreleased, so the rename costs nothing on the App Store; it does reset any Simulator/dev install's keychain items.
2. Then turn on Sign in with Apple and push (`ios/README.md` steps; push uses the team APNs key `5PG87M528M`, the
   `.p8` stored only as Convex env `APNS_PRIVATE_KEY`), and decide on TestFlight (ask the owner first).
3. Decide what to do with `claude/feature-batches` (verify each feature is on `main`, then delete) and clean up the
   ~45 merged local branches (owner's call).
4. Update stale docs: `docs/convex-migration-status.md` (says "Not yet deployed"), README "Decisions worth knowing"
   sections that describe Supabase SQL grants and RPCs, and `docs/decisions/business-plan-companies.md` ("nothing
   built", but companies shipped on 2026-10-04).
5. Resend: inbound mail is shared across apps; consider a separate inbound address/domain filter per app (the
   2026-10-31 fix drops non-meetrao mail).
6. `@convex-dev/auth` is 0.0.95 and 2.1.0 is out (needs `convex ^1.48`; installed 1.46.0): upgrade `convex`
   first, then auth, on a branch, testing sign-in, `src/proxy.ts` and `convexAuthNextjsToken`.
7. From the 2026-11-27 Convex audit, still open (the three security items were fixed the same day, see Current
   state):
   - `reminders.claimDue` and `rsvp.due` use `take(200)` over a window then filter in JS; past 200 bookings in the
     window, reminders/RSVP syncs are skipped. Query narrower index ranges or paginate.
   - `booking_page_views` is never pruned (now rate-limited and server-only); decide a retention period.
   - Low: `bookings.listForScreen` and `contacts` collect a host's whole history; admin counts scan whole tables.

## 11. Gotchas

- The repo root is the design bundle; the app is in `meetrao/`. Run npm commands inside `meetrao/`, but `vercel`
  CLI from the root.
- Two secret stores (Vercel and Convex). A variable set in the wrong place fails at runtime as "unset".
- Deploy order: Convex first, then Vercel (redirect-loop outage happened once).
- iOS Debug builds talk to **production** Convex unless overridden.
- ConvexMobile has arm64 slices only; `EXCLUDED_ARCHS` drops x86_64 simulators.
- The generated `Meetrao.xcodeproj` is committed; re-run `xcodegen` after adding files and commit it.
- Port 3000 is shared with other projects on this Mac.
- Google's iCal feed can lag by hours; Outlook and iCloud are quicker. A host who says "it booked over my event"
  probably added the event minutes earlier.
- Resend delivers every domain's received mail to every `email.received` webhook on the shared account.
- `project/github.md` (2026-09-07) says this repo was "no longer the target"; that is outdated, the app was built
  here afterwards.

## 12. Change log

- 2026-11-27: Google Cloud: calendar scopes and calendar redirect URIs removed; Sign in with Google is in
  production for all users with non-sensitive scopes only, so Google verification is no longer required.

- 2026-11-27: Google Calendar replaced by a private iCal feed (conflicts) and emailed iTIP invites. Added a host
  video link. The Google Calendar OAuth, scopes, event writes and RSVP sync are removed, and stored grants are
  revoked by a one-off migration. Copy, Help, Terms and Privacy are updated. Move emails, which had never sent,
  now do (PR #75).

- 2026-11-27 — Security pass: server-only secret on busy-time lookups and page views, page-view validation and rate
  limit, batched page-view purge, API key hashed inside Convex.

- 2026-11-27 — DNS moved to Cloudflare; Resend domain re-added and verified. Speed pass: static Help Centre, no
  Convex call for signed-out session checks, fewer booking-page reads, single-step Google busy check, indexed
  member lookup and rate-limit sweep.

- 2026-11-27 — Space Cherries LLC named as operator everywhere (site, legal pages, emails, iOS, design files);
  Convex and Vercel email footer env updated; demo time zones, placeholders and fixtures
  no longer point at the old location.
- 2026-11-19 — Handoff created.
