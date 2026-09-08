# Meetrao

A scheduling product. A host connects their Google Calendar, defines bookable
meetings, sets weekly availability, and shares one link — `meetrao.com/<username>`.
Guests open it, pick from times the host is genuinely free, and get a confirmed
booking with a Google Meet link on both calendars.

Built from the Claude Design handoff in `../project/design_handoff_meetrao/`.
That folder is the authority for every value and every piece of copy; where its
`README.md` and a `.dc.html` disagree, the `.dc.html` wins.

## Running it

```bash
npm install
cp .env.example .env.local     # then fill it in
npm run setup:check            # names anything still missing
npm run dev
```

`npm test` runs the slot-engine suite. `npm run build` is the same build Vercel runs.

## What is where

| Path | What it is |
| --- | --- |
| `src/app/(marketing)/` | Landing page, Terms, Privacy, Help, Support |
| `src/app/(auth)/` | Log in, sign up, forgot, reset, the verification gate, suspended |
| `src/app/onboarding/[step]/` | The five setup steps |
| `src/app/(app)/` | Dashboard, Bookings, Meetings, Availability, Settings |
| `src/app/(admin)/` | The admin console |
| `src/app/(public)/` | The guest path: booking page, confirmation, cancellation, `.ics` |
| `src/app/api/` | The slot query, booking creation, Google OAuth |
| `src/components/ui/` | Primitives — Button, Icon, MenuSelect, Modal, Toast, table parts |
| `src/lib/booking/slots.ts` | The slot engine. Pure, unit-tested |
| `src/lib/google/` | OAuth, connection storage, Calendar API |
| `src/emails/` | The design's send-ready HTML, used as-is |
| `supabase/migrations/` | Schema and the guest-facing booking API |

## Decisions worth knowing

**Design tokens are verbatim.** `src/app/globals.css` carries them exactly as the
spec lists them — 13.5px, 12.5px, half-pixel steps — re-exported to Tailwind via
`@theme inline`. They are irregular on purpose. `--ink-3` is `#66635C` and was
darkened to clear 4.5:1 on ground, surface and fill; do not lighten it.

**Icons are an in-house SVG set**, not Font Awesome 6 Sharp, which is licensed and
is not shipped here. `src/components/ui/icon.tsx` maps every codepoint the designs
reference to a replacement and keeps the weight convention — Light 300 for objects
and navigation, Solid 900 for status, check and close. Swapping in a licensed set
means changing that one file.

**Anchors styled as buttons pin `box-sizing`.** The UA gives `<button>` border-box
and `<a>` content-box, so one shared style string with a height and a border
computes two different heights. `buttonClass()` in `src/components/ui/button.tsx`
is the shared helper and `box-border` is the pin.

**Layouts are built once.** Three of them — app shell, marketing, auth/public. The
prototypes duplicate their chrome across five files because the design tool has no
layout primitive; that is an artefact, not a pattern.

**The database is the last line of defence, not the app.** `create_booking` is
granted to `anon` — it is the guest-facing door, and the publishable key ships
to every browser — so anything the slot engine enforces has to be enforced
again in SQL. It re-checks the host, the meeting type, minimum notice, the
booking window, the weekly availability, the buffer and the overlap. Skipping
the availability check was a real hole: a direct RPC call booked 03:00 on a
Sunday for a Monday-to-Friday host.

**Double-booking has two independent guards.** The slot engine re-runs server-side
against fresh availability and busy periods immediately before writing, and
`create_booking` re-checks inside its own transaction behind a Postgres exclusion
constraint. Either returns 409, which the UI renders as the design's "That time is
no longer available … Nothing has been scheduled."

**Cancelling is a POST behind a confirm step.** Mail clients and link previewers
fetch every URL in an email; a GET that cancelled would cancel meetings nobody
meant to.

**Privilege flags and the audit log are service-role only.** `is_admin` and
`is_suspended` are not in the `authenticated` UPDATE grant, because
`profiles_update_own` would otherwise let a suspended user clear their own
suspension — suspension does not invalidate their JWT. `admin_activity` has no
INSERT policy for the same reason: an audit log a browser session can write to
is one an admin could forge entries in. Both writes go through
`src/lib/actions/admin.ts` behind `requireAdmin()`.

**Calendar tokens live behind the service role.** `calendar_connections` has RLS
enabled and no policy, so no browser session can reach it. Everything that touches
it goes through `src/lib/google/connection.ts`.

**Avg. reply time is real.** It measures booking-page-opened → booked, which
nothing recorded before, so `booking_page_views` and `avg_reply_minutes` were added.
With nothing measured yet the card shows "—" rather than an invented figure.

## Supabase Auth URL configuration

Set these in the Supabase dashboard under **Authentication → URL Configuration**.
They are not in a migration because they are project settings, not schema.

- **Site URL** — an origin that actually serves this app.
- **Redirect URLs** — must include `<origin>/**` for every origin that signs
  people in: production, each preview domain, and `http://localhost:3000/**`.

This matters more than it looks. Supabase does not reject a `redirectTo` that
is missing from the allow-list — it silently substitutes the Site URL, which is
a bare origin with no path. The browser then lands on `/` holding `?code=…`,
nothing exchanges it, and sign-in looks like it did nothing. `auth.flow_state`
is where to check: its `referrer` column shows the URL Supabase actually chose,
and a bare origin there means the allow-list rejected ours.

`NEXT_PUBLIC_SITE_URL` must be set on Vercel to that same origin. Without it,
`siteUrl()` falls back to Vercel's host variables, and the per-deployment one
changes on every push — an address that can never be allow-listed.

## Still open

- **Google redirect URIs.** The credentials are verified working, but which
  origins are registered cannot be checked from outside — Google validates the
  authorization code before the redirect URI, so every probe returns the same
  error. `<origin>/api/google/callback` must be registered for **every** origin
  by hand: localhost, each Vercel preview domain, production. A missing one
  fails as `redirect_uri_mismatch` and gives no other signal.
- **The calendar privacy copy overstates what the grant enforces.** /help, the
  FAQ and the footer all say Meetrao never reads event titles, guests or
  descriptions. That is true of the code — `busyPeriods` calls freeBusy and is
  the only read — but `calendar.events` is required to invite the guest as an
  attendee, and it permits reading them. Verified: with the granted scopes,
  listing event details returns 200. Google's consent screen will describe the
  broader access, right after the page promising the narrower one. Either soften
  the copy or say plainly what Google will ask for.
- **Photography rights.** The photographs are in and wired, but they are of
  identifiable people, and the assets bundle's own README says the design work
  assumed they were placeholders. Confirm the right to use each one
  commercially. Replacing one is a matter of overwriting the file — see
  `public/use-cases/README.md`. The featured panel would also like a 1600px
  source rather than 1024 to be crisp at 2×.
- **`EMAIL_POSTAL_ADDRESS`** is set to a city and state. CAN-SPAM wants a full
  physical address — street line, or a registered PO box.
- **Five legal decisions** are visible amber callouts on `/terms` and `/privacy`,
  including a cookie-consent banner that does not exist and that EU/UK visitors
  legally require.
- **No reschedule flow.** Guests cancel and rebook. `booking-changed.html` and
  `sendRescheduled()` exist, unwired, for whenever it is built.
- **Avatar upload** is stubbed; it needs Supabase Storage wiring.
- **The verification email** is sent by Supabase, not by us. Paste
  `src/emails/supabase/confirm-signup.html` into the Supabase dashboard to use the
  design rather than Supabase's default.
