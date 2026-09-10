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
| `src/app/(app)/` | Dashboard, Bookings, Meetings, Contacts, Notifications, Availability, Settings |
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

**Adding a column to `profiles` needs a grant.** `authenticated` has no
table-level UPDATE on it — revoking a single column converted the grant into
per-column grants — so a new column starts unwritable and the failure reads as
`permission denied for table profiles`, naming the table rather than the
column. Grant it explicitly, or leave it ungranted deliberately, as
`welcomed_at` is.

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

**Timezone is detected at registration, once.** A new account used to sit on
UTC until someone reached onboarding step 4, and every slot, email and booking
page reads that column. The browser's zone now travels with the sign-up — a
hidden field for email, the OAuth return URL for Google — and the profile
trigger writes it, validated against the zones this app offers. `timezone_auto`
is what stops it happening twice: it is cleared the moment a host picks a zone
themselves, so signing in from a laptop abroad never moves someone who chose.

**Avg. reply time is real.** It measures booking-page-opened → booked, which
nothing recorded before, so `booking_page_views` and `avg_reply_minutes` were added.
With nothing measured yet the card shows "—" rather than an invented figure.

**Availability is per named schedule.** A host keeps as many weekly patterns as
they need and each meeting type points at one — migration 0010. `schedule_id`
on `meeting_types` is NULL for "follow my default", which is what makes the
change backward compatible: every existing meeting kept behaving exactly as it
did, and the backfill gave every profile a schedule called "Working hours"
holding the rules it already had.

Two invariants: a host always has at least one schedule, and exactly one is the
default. The partial unique index enforces the second; `deleteSchedule` refuses
the last schedule and refuses the default, which is what keeps the first true.
Deleting a schedule moves its meetings to the default rather than orphaning
them — that is `on delete set null` plus NULL-means-default, and the dialog says
how many will move before it asks.

**The booking door reads the meeting's schedule, not the host's rules.** This is
the same hole 0005 closed, reopened by having more than one set of hours: a host
with a weekend schedule on one meeting would otherwise accept weekend bookings
on all of them. Verified against the live database inside a rolled-back
transaction — a Wednesday slot that the host's *default* schedule allows is
refused for a meeting pinned to a weekend-only schedule, and the Saturday slot
is accepted.

**A host can schedule a meeting and invite several people.** The product ran
one way only — a guest opens the link and books. Migration 0011 adds the other
direction. `bookings` still carries exactly one guest column pair and the first
invitee is that guest, so the confirmation email, the `.ics`, the guest
cancellation page and the admin console all keep working on a row shaped as
before; extra invitees live in `booking_invitees`.

Two rules differ from the guest path, on purpose. **The host's availability
does not apply** — a host scheduling their own meeting has already decided they
are free, and refusing because it is Saturday would be the tool arguing with its
owner. **A clash still refuses**, because that is double-booking rather than a
preference, and `bookings_no_overlap` catches it whatever the app believes.

Inserted through the service role behind `requireOnboardedSession()`, because
`bookings` has no INSERT policy for `authenticated` — the guest door is
`create_booking`, which is SECURITY DEFINER — and adding one would open a table
that has stayed closed on purpose.

Cancelling emails **every** invitee, not just the guest of record. A meeting for
three people that tells one of them it is cancelled leaves two sitting in an
empty Meet.

**Contacts fill themselves in, from the database.** A trigger on `bookings` and
another on `booking_invitees` mint a contact for every guest and every invitee.
A trigger rather than application code because bookings arrive through three
doors — `create_booking` called by `anon`, the host's scheduling action on the
service role, and the invitees table — and app code would have to remember all
three. A trigger cannot forget one.

A name is only ever filled in, never overwritten: a host who corrected
`ada@example.com` to "Ada Lovelace" should not have it reverted by the next
booking where the guest typed "ada". Email is the identity, lowercased, unique
per host.

**The upsert needs a plain unique constraint, not the functional index.** 0012
enforced uniqueness with `unique index on (user_id, lower(email))`, which is
correct but cannot be named as an `ON CONFLICT` target — Postgres answers 42P10.
Adding a contact by hand and importing a CSV both go through that upsert, so
both would have failed on the first duplicate. 0013 moves the invariant onto the
column (`check (email = lower(email))`) so a plain `unique (user_id, email)` is
exactly as strong, and can be named. Found by testing the real statement against
the live database rather than by reading it.

**CSV is parsed properly, not split on commas.** `src/lib/csv.ts` handles quoted
fields, embedded commas and newlines, doubled quotes and Excel's BOM, because
those are what a real address book contains — a company called "Acme, Inc.", a
note with a line break. `line.split(",")` mangles all three silently, and an
importer that quietly corrupts data is worse than one that refuses. Thirteen
tests, including a round-trip through the serialiser.

**Notifications are written by triggers, never by the app.** Bookings arrive and
change through several doors — the guest RPC granted to `anon`, the host's own
scheduling action on the service role, the cancel action, the guest cancellation
page — and application code would have to remember every one. Three kinds:
booked, cancelled, moved. The times are rendered in the host's own zone by
`local_when()`, because a notification that says 09:00 UTC to someone in Dhaka
is worse than none.

A booking the host scheduled themselves raises nothing. They already know.

`read_at` is a timestamp rather than a boolean, so "mark all as read" is one
statement and the moment stays recoverable.

**Not wired: declines.** `bookings.guest_rsvp` exists but nothing syncs it from
Google, so a "guest declined" notification would never fire. It is left unbuilt
rather than added as a kind that never appears.

## Supabase Auth settings that the app cannot enforce

**Confirm email must be ON.** Authentication → Providers → Email → *Confirm
email*. With it off, Supabase creates every account already confirmed — it
stamps `email_confirmed_at` within a tenth of a second of `created_at`, leaves
`confirmation_sent_at` null, and sends nothing. The app's verification gate
then works exactly as written and lets the user straight through, because
Supabase is telling it the address is verified. Both halves of "no verification
email, and no gate" are that one switch.

**Paste the confirmation template.** Authentication → Email Templates → Confirm
signup, replaced with `src/emails/supabase/confirm-signup.html`. That email is
sent by Supabase, not by this app, so it is the design's only email that is not
already wired.

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

**The app renders 1.3x on desktop.** `.app-scale` in `globals.css`, on the app
shell only — the marketing side is untouched. As built the dashboard's content
stopped 622px down a 900px window and left ~280px of bare ground under it; at
1.3x it ends at 894px. `zoom` rather than rewriting several hundred literal
pixel values across forty components, because the tokens are transcribed
verbatim from the handoff and are meant to stay that way.

Three things about it are not arbitrary. The switch is **1066px, not 820px**:
media queries do not see zoom, the app's own breakpoint is 820px, and
820 × 1.3 = 1066, so the two rules meet exactly with no band where a scaled
layout is asked to behave like a narrow one. The **height is divided back out**
— `vh` is unaffected by zoom, so an unscaled `h-screen` inside a 1.3x box
computes 130vh and the shell overflows. And the **toast is scaled separately**
via `body:has(.app-scale)`, because it is mounted by the root layout, outside
the shell, and would otherwise pop at 1x beside a 1.3x app.

Phones and tablets are excluded deliberately: at 1.3x the dashboard grows from
1566px to 2294px of scrolling for the same day.

Measured, not assumed — zoom flips at exactly 1066/1065, the shell stays one
screen tall with no page scroll, and fixed overlays still cover the viewport,
so modals are unaffected.

## The component gallery

`/preview` renders every UI primitive in every state it ships in — the token
table, the type scale, all 49 icons, the full button matrix, panels, controls,
table, overlays. One request, no session.

It exists because the alternative is booting an authenticated screen and hunting
for the one component you changed. Seeing the whole vocabulary at once is what
makes an inconsistency findable at all.

Two rules keep it honest, and both are load-bearing:

- **It enumerates from the source.** Icons come from `ICON_NAMES`, buttons from
  `BUTTON_VARIANTS × BUTTON_SIZES`, colours are read live out of the cascade by
  the swatch components. A list retyped into the page is a list that goes stale,
  and a gallery that lies about the system is worse than no gallery. Adding an
  icon or a button height shows up there without editing the page.
- **It adds no colour, size or radius of its own.** Everything on it is a token
  or a component.

**Two doors.** `previewEnabled()` in `src/lib/preview.ts` opens it in `next dev`
and on Vercel preview deployments, and refuses whenever `VERCEL_ENV` is
`production` — that variable is set by the platform and cannot be overridden in
project settings, so it is the one to trust when it and `NODE_ENV` disagree. On
production the page then falls back to an admin check: a signed-in admin sees
the gallery, everyone else gets `notFound()`.

`notFound()` rather than a redirect, deliberately — a stranger should not learn
the route exists. The page also carries `robots: { index: false }`.

The admin door is not a weaker gate, it is the one that makes the tool usable:
the gallery is most valuable exactly when you are away from a terminal, and a
404 nobody can get past is a tool nobody opens. `src/lib/preview.test.ts` covers
the environment half.

## Why navigation is fast, and what keeps it that way

A tab click used to take one to two seconds, and — worse — showed nothing at all
while it did. Measured against a local production build with a stand-in Supabase
that adds a fixed delay per call, the two causes were separable:

| | before | after |
|---|---|---|
| render work with no database latency | ~20 ms | ~20 ms |
| sequential Supabase round trips per navigation | ~4 | ~3 |
| click → first pixel changes (at 100 ms a hop) | 445 ms | 9–19 ms |

**The app was never the slow part.** Twenty milliseconds of rendering sat behind
four *sequential* round trips to a database in another region, and nothing on
screen moved until all four finished.

**`loading.tsx` on every app route.** Next skips prefetching a dynamic route that
has no loading boundary, and paints nothing until the server answers — its own
docs call the result "the impression that the app is not responding". Every route
in `(app)` is dynamic, and none had a boundary. Each sidebar destination now has
its own, rendering the **real** header (every title and subtitle is a static
string) over a shimmering body, so the header never moves when content arrives.
`src/app/app-loading-boundaries.test.ts` fails if a new route ships without one.

**One fewer round trip in the session.** `current_profile()` (migration 0015)
filters by `auth.uid()` inside Postgres, so the profile read no longer waits on
`getUser()` for an id — the two run together. `requireSession` is wrapped in React
`cache()`, and that is load-bearing rather than tidy: the layout and the page both
call it, Next dedupes identical GET fetches but an RPC is a POST and is not
deduped, so without it the profile would be fetched twice per navigation.

**`regions: ["hnd1"]` in `vercel.json`.** The Supabase project is in
`ap-northeast-1` (Tokyo). Vercel functions default to `iad1` (Washington), which
put a Pacific crossing — roughly 150–180 ms — on every one of those hops. Pinning
the functions to Tokyo is the largest single win here and needs no code. Check it
after a deploy: `curl -sI https://www.meetrao.com/login | grep x-vercel-id` — the
region is the prefix. To undo it, delete the `regions` key.

**Still open, deliberately.** The proxy calls `auth.getUser()` on every request,
and that is the remaining fourth hop. `getClaims()` would verify the token
in-process instead — but only when the project signs with *asymmetric* JWT keys;
with a symmetric key `auth-js` falls back to a network `getUser()` and nothing is
saved. Deriving the verified flag from claims is also not free: it lives in
`user_metadata`, which the user can write. Confirm the signing key type under
Settings → JWT Keys before touching this.

## Receiving support mail

`support@meetrao.com` is the address the contact form delivers to, and it is a
Resend receiving address — the domain has `Receiving: enabled` and its MX record
(`inbound-smtp.us-east-1.amazonaws.com`, priority 9, at the root) is verified.

**Resend inbound is not a mailbox.** There is no IMAP, no POP, no webmail. A
received message lands in Resend's store and is visible under Emails →
Receiving; nothing tells a person it arrived. Without the piece below, mail to
support@meetrao.com is *received* and never *read*.

`POST /api/resend/inbound` closes that gap: it verifies Resend's Svix signature,
and forwards the message to a real inbox with `Reply-To` set to whoever wrote
in, so replying answers them directly rather than the app. Two variables switch
it on, both optional — unset, the route no-ops and nothing else changes:

- `RESEND_WEBHOOK_SECRET` — the `whsec_…` signing secret, shown once when the
  webhook is created. Unset, nothing is processed at all: an unverified webhook
  body is an anonymous stranger asking Meetrao to send mail.
- `SUPPORT_INBOX` — where forwards go. **Not an address on meetrao.com.**
  Receiving is enabled at the *root* of the domain, so every address on it
  routes back into Resend and forwarding there loops forever; `refuseToForward`
  rejects that rather than discovering it in production.

The webhook itself is created in the Resend dashboard under Webhooks, pointed at
`<origin>/api/resend/inbound` and subscribed to `email.received`.

Forwarding is deliberately dumb — it does not parse, thread or file anything. It
turns an API-only inbox back into ordinary email and stops there.

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
- **Five legal decisions** are visible amber callouts on `/terms` and `/privacy`,
  including a cookie-consent banner that does not exist and that EU/UK visitors
  legally require.
- **No reschedule flow.** Guests cancel and rebook. `booking-changed.html` and
  `sendRescheduled()` exist, unwired, for whenever it is built.
- **The verification email** is sent by Supabase, not by us — see the Auth
  settings section above for the template and the Confirm email switch.
