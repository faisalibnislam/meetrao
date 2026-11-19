# Meetrao — handoff

> Read this first if you are a Claude (or any agent) picking this project up, on this Mac or another one. Then read CLAUDE.md / AGENTS.md. Keep this file current: after every change to the project, update "Current state", "Next steps" and "Change log", and commit it.

Last updated: 2026-11-19 · Written on: Faisal's MacBook Pro M5

## 1. What this is

Meetrao is a scheduling product (a Calendly-style booking tool). A host connects Google Calendar, defines bookable
meetings, sets weekly availability (several named schedules), and shares one link, `meetrao.com/<username>`.
Guests pick from times the host is really free and get a confirmed booking with a Google Meet link on both
calendars. Hosts can also schedule a meeting and invite several people. Companies (workspaces) own a custom domain
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

Accounts: GitHub (faisalibnislam), Convex (`faisal-islam/meetrao`), Vercel, Google Cloud (one OAuth client, two
redirect URI families), Resend (domain meetrao.com), Polar, optionally Google Analytics.

## 4. Architecture

Stack: Next.js 16.3 (App Router) + React 19 + Tailwind 4 + TypeScript; Convex as database, auth provider
(`@convex-dev/auth`, email + password with bcrypt verification for migrated users, Google, optional Apple), file
storage, cron host and the place Google Calendar tokens live and are used; Resend for email; Polar for billing;
Vercel Speed Insights; date-fns/tz; Vitest. Supabase was the original backend and was fully removed by 2026-09-20
(`meetrao/supabase/migrations/` is history only).

Key paths (inside `meetrao/`):
- `src/app/(marketing)/` landing, Terms, Privacy, Help, Support; `(auth)/` log in, sign up, forgot, reset, verify,
  suspended; `onboarding/[step]/` five setup steps; `(app)/` dashboard, bookings, meetings, contacts,
  notifications, availability, settings; `(admin)/` admin console; `(public)/` guest booking page, confirmation,
  cancellation, `.ics`.
- `src/app/api/` — `slots`, `bookings` (+ `reschedule`), `google/connect` + `google/callback`, `polar/webhook`,
  `resend/inbound`, `analytics/collect`, `contacts/export`, `me`, `app/bookings/*` (used by the iOS app for cancel
  and move), `v1/` (public API).
- `src/lib/booking/slots.ts` — the pure slot engine (unit-tested). `src/lib/google/` consent URL + facade over
  `convex/google.ts`. `src/lib/env.ts` all env reads. `src/lib/custom-domain.ts`, `src/lib/csv.ts`,
  `src/lib/ios/sync.test.ts` (checks every Convex function the Swift code names still exists).
- `src/components/ui/` primitives (Button, Icon set in-house, MenuSelect, Modal, Toast); `src/emails/` the design's
  send-ready HTML; `src/app/globals.css` verbatim design tokens.
- `convex/` — `schema.ts`, `auth.ts`/`auth.config.ts`/`authCrypto.ts`, `bookings.ts` (double-booking guard
  `findOverlap`), `publicBooking.ts`, `availability.ts`, `meetingTypes.ts`, `companies*.ts`, `billing.ts`
  (`applyPolarSubscription`), `google.ts` + `calendarConnections.ts` (all internal), `reminders.ts`, `rsvp.ts`,
  `push.ts`/`pushNode.ts` (APNs), `webhooks.ts`, `apiKeys.ts`/`apiPublic.ts`, `crons.ts`, `http.ts`,
  `lib/auth.ts` (`currentUserId`, the one place an auth subject becomes a profile id), `lib/emails.ts`.
- `docs/` — `convex-migration.md` (plan), `convex-migration-status.md`, `decisions/` (auth provider, auth migration
  runbook, business plan/companies), `spikes/`.
- `ios/` — `Meetrao/` app, `MeetraoWidget/`, `Shared/`, `MeetraoTests/`, `project.yml`, `README.md`.

Data flow: browsers and the iOS app talk to Convex directly. Guest booking: `/api/slots` computes free slots
(availability + Google free/busy), booking creation re-runs the slot engine server-side and Convex re-checks inside
its own transaction; either returns 409 on a clash. Google token exchange, refresh and revoke happen only inside
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
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_RESEND_KEY`, `EMAIL_FROM`, `EMAIL_POSTAL_ADDRESS`, `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`, `ANALYTICS_INGEST_SECRET`, optional `APPLE_BUNDLE_ID`, `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APNS_BUNDLE_ID` | Convex deployment env (`npx convex env list`), separately for dev and production |
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
- Google OAuth has two redirect families on one client (Convex Auth's `/api/auth/callback/google` and the app's
  `/api/google/callback` per origin); removing either breaks half the product.
- Cancelling is a POST behind a confirm step (mail scanners fetch GET links).
- `convex/lib/auth.ts` `currentUserId` is the only place an auth subject maps to a profile; keep sign-in and reset
  responses generic (no account enumeration).
- Copy style: one date style, no promises of a page at a bare name, no em dashes in recent copy (commit "Take the em
  dashes out of the comments too").
- Commit messages end with the Claude co-author line; PRs from `claude/*` branches.

## 9. Current state (as of 2026-11-19)

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
6. `@convex-dev/auth` is pre-1.0 (0.0.95): plan the migration when 2.0 ships.

## 11. Gotchas

- The repo root is the design bundle; the app is in `meetrao/`. Run npm commands inside `meetrao/`, but `vercel`
  CLI from the root.
- Two secret stores (Vercel and Convex). A variable set in the wrong place fails at runtime as "unset".
- Deploy order: Convex first, then Vercel (redirect-loop outage happened once).
- iOS Debug builds talk to **production** Convex unless overridden.
- ConvexMobile has arm64 slices only; `EXCLUDED_ARCHS` drops x86_64 simulators.
- The generated `Meetrao.xcodeproj` is committed; re-run `xcodegen` after adding files and commit it.
- Port 3000 is shared with other projects on this Mac.
- Google `redirect_uri_mismatch` means an origin's `/api/google/callback` is not registered on the OAuth client.
- Resend delivers every domain's received mail to every `email.received` webhook on the shared account.
- `project/github.md` (2026-09-07) says this repo was "no longer the target"; that is outdated, the app was built
  here afterwards.

## 12. Change log

- 2026-11-19 — Handoff created.
