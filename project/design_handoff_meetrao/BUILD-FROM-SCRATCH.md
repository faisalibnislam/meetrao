# BUILD FROM SCRATCH — Meetrao

**A greenfield build brief.** `README.md` in this folder is the design specification — every
screen, token, interaction and state. This file is the engineering plan: stack, order, data model,
and the parts that are harder than they look.

Read this, then `README.md`. `CHANGELOG.md` is optional but contains the diagnosis of every bug
found during design and a previous implementation — worth reading the entries for an area before
you build it.

## What you are building

A scheduling product. A host connects their Google Calendar, defines one or more bookable
"meetings" (name, duration, a few rules), sets weekly availability, and shares one link —
`meetrao.com/<username>`. Guests open it, pick from times the host is genuinely free, and get a
confirmed booking with a Google Meet link on both calendars. Plus an admin console and a marketing
site.

**Scope: 25 screens, 7 dialogs, 1 landing page, 4 standalone public pages, 6 transactional
emails.** All specified in `README.md`.

## Stack — decided, not open

**The owner has chosen the infrastructure: Vercel, Supabase, Resend, Google Cloud.** Those four
are fixed. The rest of this table is the framework layer that fits them, and is what a previous
implementation of this same design used successfully.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js (App Router)** | Server components suit this: most screens are data-read-then-render, and the public booking page benefits from server rendering |
| UI | **React + TypeScript** | |
| Styling | **Tailwind 4** with the design tokens as CSS custom properties, re-exported via `@theme inline` | The design's values are irregular by intent (13.5px, 12.5px, half-pixel steps) — tokens plus arbitrary values beat a scale that rounds them |
| Data + auth | **Supabase** (Postgres, Auth, RLS, Storage) | Auth, row-level security and file storage in one, and its Auth already issues email-confirmation tokens |
| Dates | **date-fns** + **@date-fns/tz** | Timezone conversion and DST correctness is the single most failure-prone part of this product |
| Email | **Resend** | Takes raw HTML in one parameter; the templates in `emails/` drop straight in |
| Tests | **Vitest** | |

**The four services are not negotiable.** Within them, if you want to deviate on the framework
layer, say so and why first — except the token approach, which is fixed: a utility framework that
cannot express `13.5px` will fight this design on every screen.

## Build order

Each step should end with the app running and the previous steps still working.

**0. Scaffold and provision.** Before any UI. Create the Next.js app, then set up the four
services and get `.env.local` complete and validated. Details in "Infrastructure setup" below.
End this step with the app booting and an env-check script passing — not with a styled page.

**1. Tokens and primitives.** Transcribe the colour, type, spacing, radius, elevation and motion
values from `README.md` § "Design tokens" into CSS custom properties. Do not re-derive or "improve"
them. Then build: Button (4 variants × 9 sizes — the sizes are real, see README), Icon, Spinner,
Input/Textarea/Field, Checkbox, Switch, ChoiceChip, MenuSelect, Card, Badge, Avatar, Toast, Modal,
Eyebrow.

MenuSelect is the one with real behaviour — README has its full spec. It flips upward when there is
no room, becomes searchable above 12 options, and scrolls the current value into view.

**2. The three layouts.** App shell (218px sidebar + header + centred 1120px content column),
marketing layout (global nav + footer), and the auth/public layout. **Build each once.** The design
prototypes duplicate the nav and footer across five files because the design tool has no layout
primitive — do not copy that.

**3. Data model and auth.** See below. Get sign-up, log in, sign-out and the email verification
gate working before any product screen.

**4. Host screens.** Dashboard → Bookings → Meetings → Create/edit meeting → Availability →
Settings (5 panels). Availability and the meeting form are the two with real complexity.

**5. Google Calendar.** OAuth connect/disconnect, free/busy read, event creation with the guest as
an attendee, and the failure paths. Do not skip the failure paths — see "Hard parts".

**6. Public booking flow.** Booking page → guest details → confirmed → cancelled. This is the
revenue path and the most-visited surface; it is also the only one that must work for someone with
no account, on a phone, from an email link.

**7. Admin console.** Dashboard, Users, User detail, Bookings, Booking detail, Settings, plus
suspend/reactivate and account removal.

**8. Emails.** `emails/*.html` are send-ready — copy them in, substitute the merge fields, send.
Do not rebuild them in JSX or a component library. Details below.

**9. Legal, Help, Support pages.** Static content, on the marketing layout.

**10. Landing page.** Build last. It is the largest single page and depends on nothing else.

**11. Responsive.** README § "Responsive behaviour". Leave it until the layouts are settled.

**12. Deploy.** Push to a fresh repo, import into Vercel, set the variables, add the resulting
URL to Google Cloud's redirect URIs, then open the deployed site on a real phone. That last step
is not ceremony — it is where this design's mobile work either holds up or does not.

## Infrastructure setup

Do this in step 0. Each service needs something from the owner; ask for all of it at once rather
than blocking four separate times.

**Supabase.** New project. You need the project URL, the anon key and the service-role key. Enable
email/password auth **and** Google as an OAuth provider. Turn email confirmation **on** — the
verification gate is built on Supabase's own `email_confirmed_at`, not a second token you issue.
Write migrations as SQL files in the repo from the first table; do not click the schema together in
the dashboard, or it exists nowhere you can review or replay.

**Google Cloud.** New project, OAuth consent screen, Web application credentials. You need the
client ID and secret. Two separate concerns, and confusing them costs a day:
- **Sign-in with Google** — handled by Supabase Auth. Its callback goes in the Supabase dashboard.
- **Calendar access** — handled by us. Scope must be **write-with-attendees**, not read-only
  free/busy, because the guest is an attendee on the event. Its redirect URI is our own route and
  must be registered for **every** origin: `http://localhost:3000`, the Vercel preview domain, and
  production. A missing one fails as `redirect_uri_mismatch` and nothing else.

**Resend.** API key, and `meetrao.com` added as a domain with SPF and DKIM records. **Until DKIM
verifies, Resend delivers only to the account owner's own address** — which is indistinguishable
from working code in development. Say so explicitly when you report step 0 done.

**Vercel.** Import the repo. Set every environment variable in the dashboard — `.env.local` is
gitignored and does not travel. If the app is in a subdirectory, **Root Directory must point at
it**; left at the default the build finds no `package.json` and deploys nothing.

**Never put a secret in a tracked file** — not in `vercel.json`, not in a README, not in a commit
message. Validate the environment with a script (`src/lib/env.ts` plus an `npm run setup:check`)
so a missing variable fails at boot with a useful message rather than at runtime in production.

## Data model

Entities, not a schema — design the columns to suit your queries.

- **profile** — one per user. Name, job title, email, username (unique, this is the public link),
  timezone, avatar, `verified_at`, suspended state, admin flag, five notification-preference
  booleans, and the booking defaults (default duration, default minimum notice).
- **meeting_type** — belongs to a profile. Name, description, duration, slug (unique per profile),
  active flag, and the booking rules: buffer, minimum notice, booking window.
- **availability** — one weekly schedule **per profile**, not per meeting type. Seven days, each
  enabled or not, each with **one or more** time ranges. Multiple ranges per day is the requirement
  that makes a naive single start/end column wrong.
- **booking** — belongs to a meeting_type. Guest name, guest email, optional note, start and end
  instants, the host's timezone at time of booking, status (confirmed/cancelled), a public
  reference for the guest-facing URL, the Google event id and Meet URL, and the guest's RSVP state.
- **calendar_connection** — belongs to a profile. Encrypted OAuth tokens, scope granted, account
  email.
- **platform_settings** — singleton for the admin console: app name, support email.

**Store instants in UTC and convert at the edges.** Store the host's timezone as a string on the
profile; never store a wall-clock time without one.

**Row-level security from the start, not retrofitted.** A guest reads a host's public booking data
with no session at all; a host reads only their own; an admin reads everything. Retrofitting RLS
onto working queries is how you get either a leak or a week of debugging.

## API surface

Server actions for anything a signed-in user does. Route handlers for the two things that are
genuinely public or external: the slot query the booking page calls, and the booking creation
endpoint. Plus the Google OAuth connect and callback routes, and an `.ics` download for the guest.

## The hard parts

Everything above is ordinary CRUD. These five are not, and they are where a rebuild goes wrong.

**1. Slot computation.** Given a host's weekly availability, their meeting's duration and rules,
their calendar's busy periods, and a guest's timezone: produce the bookable slots for a date.
Buffer applies both sides. Minimum notice cuts the near end. The booking window cuts the far end.
Weekends and days outside availability produce nothing. **Write this as a pure function with unit
tests before wiring any UI to it** — it is the one piece where a bug silently offers times the host
cannot make.

**2. Timezones and DST.** The host sets hours in their own zone; guests see them converted to
theirs. A slot that crosses a DST boundary must not shift. Ninety-four zones, correct through DST.
Use `@date-fns/tz`; do not hand-roll offsets.

**3. Double-booking.** Check availability again inside the transaction that creates the booking,
and return a 409 the UI can render. The design has this state built — a guest who was filling in
the form when someone took the slot sees "That time is no longer available … Nothing has been
scheduled." Without the re-check that message is a lie.

**4. Google Calendar.** The event is created with the **guest as an attendee**, so it lands on both
calendars as one event. That requires a write-with-attendees scope, not read-only free/busy.
Handle: token expired, scope insufficient, API down, event already deleted. A silent calendar-write
failure on a live booking is the worst outcome in the product.

**5. Email verification.** Supabase Auth already issues a confirmation token and sets
`email_confirmed_at`. **Build the gate on that** rather than issuing your own token. Google sign-up
arrives verified and skips the gate. Enforce server-side on every authenticated endpoint — a
client-side gate is a convenience, not a boundary.

## Emails

`emails/*.html` — six files, send-ready, table-based, inline styles, under 10KB each, tested
against real mail clients.

- **Use them as-is.** Do not regenerate them in JSX or a mail-component library.
- They carry **literal example values**, not `{{…}}` placeholders — they were written as worked
  examples. The **field names are documented per template in `Meetrao Emails.dc.html`**.
- **Escape every merge value.** A guest controls their own name and the note field; unescaped, a
  note can close a table cell and rewrite the email.
- **Host mail respects the five notification preferences. Guest mail never does** — confirmations,
  cancellations, verification and password resets are transactional. The cleanest way to guarantee
  that: guest senders take no preference parameter at all.
- Default to **sending** when the preference row cannot be read. A database blip should not
  silently mute a notification nobody turned off.
- **Idempotency key per booking event and recipient**, so a retried webhook sends once.
- The logo is drawn in type because a repo-relative asset will not resolve for a recipient. Swap in
  a hosted https PNG; the cell is sized for a 22px square.
- **`booking-changed.html` has no trigger** — there is no reschedule flow. Ship it unwired or build
  reschedule.
- In `booking-changed.html` the **struck-through row is the superseded time**. That is correct.

## Traps

Each of these cost real time in the previous build or the design work.

- **When styling an anchor as a button, set `box-sizing: border-box`.** The UA stylesheet gives
  `<button>` border-box and `<a>` content-box, so one shared style string with a `height` and a
  border computes two different heights — the button correct, the anchor taller by twice the border.
  A shared `buttonClass`-style helper across `<button>` and `<a>` is the right pattern and this is
  its one trap. **Three separate defects in this project were this**, including a sticky rail whose
  `height:100%` plus padding overflowed the viewport.
- **Text never below 10px.** Icon glyphs at 8–9px are fine; text is not. This regressed three times
  during design.
- **`--ink-3` is `#66635C`.** Darkened specifically to clear 4.5:1 on ground, surface and fill.
  Do not lighten it.
- **Touch targets ≥44px on mobile.** A standalone link in a row needs it; a link inside a sentence
  does not. Every failure of this in the design was the first kind authored as the second.
- **Instrument Serif only in display moments** — landing headlines, auth titles, onboarding titles,
  the public booking page title, "You're booked!", the dashboard greeting. Never a section heading,
  never body copy.
- **If you grant Postgres `UPDATE` column by column, every new column needs an explicit grant.**
  The failure is silent: the write does nothing and PostgREST reports permission denied.
- **A menu's contents depend on role, not just breakpoint.** The admin console has Settings as a
  nav row; an account menu that also offers Settings gives admins two identical adjacent rows, the
  second dropping them out of the console.
- **Tables scroll on desktop but must become card lists below ~640px**, not restyled tables.
- **Read your framework's own docs before writing routing code** if you are on a recent major —
  App Router conventions have changed more than once.

## Photography and licensing

- **Ten `<image-slot>` placeholders on the landing page need real photography** — host avatars, a
  message thread, six use-case panels. They are labelled empty frames in the design. Do not
  substitute stock or generated images; ship the frames until real photos exist.
- **Font Awesome 6 Sharp is licensed.** Use your own licence or an equivalent set, keeping the
  weight convention: Light 300 for objects and navigation, Solid 900 for status, check and close.
  Subsetting to the ~31 codepoints actually used takes 5MB of OTFs to under 10KB.
- **Instrument Sans, DM Mono, Instrument Serif** are OFL.
- **Google's "G" mark** follows Google's brand terms.

## Out of scope

Do not build, and do not infer: notification channels beyond email · team or round-robin booking ·
payments · analytics dashboards · calendar providers other than Google · meeting locations other
than Google Meet · date-specific availability overrides · admin impersonation or refunds ·
rescheduling (guests cancel and rebook).

Availability is **one weekly schedule per account**.

## Decisions the owner must make

Do not invent answers. Surface these as visible callouts where they appear, as the design does.

**Legal** — five items, rendered as amber "Needs a decision" blocks on `/terms` and `/privacy`:
legal entity and company number · minimum age (drafted at 16) · liability cap · cross-border
transfers (no EU adequacy decision applies — EU data needs SCCs signed and real hosting regions
named, before launch) · **a cookie-consent banner, which does not exist and which EU/UK visitors
legally require**.

**Product** — both parties see each other's email address on the calendar event, inherent to an
attendee invitation · a guest declining in Google does not cancel the booking, and RSVP responses
have nowhere in the UI to surface · admin removal: data export first? freed username
re-registrable? · **Avg. reply time** on the dashboard needs booking-page-view telemetry that does
not exist — build it or drop the card.

## Done means

- Every screen in `README.md` matches on measured values, not impression: computed font, size,
  weight, colour, padding, gap, border, radius, element order.
- Every piece of copy is verbatim. The copy is specified, not suggested.
- Every error and empty state is reachable, including the three race conditions: calendar OAuth
  failure, slot taken while browsing, slot taken between form-fill and submit.
- The slot engine has unit tests covering buffers, notice, window, multiple ranges per day, and a
  DST boundary.
- No text under 10px. No touch target under 44px on mobile. `--ink-3` unchanged.
- It is deployed, and the deployment has been opened on a real phone.
- A booking has been made end to end against real services: guest picks a slot → confirmation
  renders → the event appears on both Google Calendars with a Meet link → both parties receive
  their email. Until that round trip works once, the product is not built.
