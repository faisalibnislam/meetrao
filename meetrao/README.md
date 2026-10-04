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
npx convex dev                 # signs you in to Convex, links the dev deployment,
                               # writes CONVEX_DEPLOYMENT + NEXT_PUBLIC_CONVEX_URL
cp .env.example .env.local     # then fill in the rest (merge, don't overwrite
                               # the two lines convex dev just wrote)
npm run setup:check            # names anything still missing
npm run dev
```

**Two lists of secrets, not one.** The code that talks to Google and sends the
sign-up and reset emails runs inside Convex, so its credentials live on the
Convex deployment, not in `.env.local` and not on Vercel. `setup:check` cannot
see them; `npx convex env list` can. `.env.example` names which is which.

`npm test` runs the suite. `npm run build` is the same build Vercel runs.

**Deploying.** Vercel builds `main` on merge, from the repository root — the
project's Root Directory is `meetrao`, so a CLI `vercel deploy` has to run from
**above** this folder or it looks for `meetrao/meetrao/`. Convex is separate and
Vercel does not deploy it: `npx convex deploy` with a production deploy key. When
a change touches both, **deploy Convex first** — the app reading a field an older
Convex deployment does not return is how a redirect loop took the site down once.

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
| `src/lib/google/` | The calendar consent URL, and a thin façade over `convex/google.ts` |
| `src/emails/` | The design's send-ready HTML, used as-is |
| `convex/` | The backend: schema, every query and mutation, auth, crons, and the Google calls |
| `convex/lib/auth.ts` | `currentUserId` — the ONE place an auth subject becomes a profile id |
| `convex/lib/emails.ts` | The sign-up confirmation and password-reset emails |
| `supabase/migrations/` | History only. Nothing runs — see `supabase/README.md` |

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

**An admin can change or retire a booking link.** `meetrao.com/<username>` is the
one part of an account that is public, unique product-wide and claimed
first-come-first-served, so it is the one part an operator eventually has to
intervene in — a squatted trademark, an impersonation, a host locked out of
their own name. Before `0018_admin_booking_link.sql` the only lever was removing
the account, which is not a proportionate answer to a bad URL.

Three things about it are deliberate:

*`profiles.username` is NOT NULL, so there is no "no link" state.* Removing a
link necessarily means replacing it. `admin_release_username` holds the old name
back in `reserved_usernames` and parks the host on a placeholder seeded from
`'host'` — never from the email address, because the replacement is public and
an email address is not.

*Retiring is not optional on a release.* Without it the host claims the name
straight back from Settings → Profile and the intervention achieved nothing. On
a plain rename it is a checkbox, defaulted on, because the admin might simply be
helping with a typo.

*A rename is not a deactivation.* Neither function touches `is_suspended`.
Turning a booking page off already has a switch, and merging the two would make
every rename a silent suspension.

Both functions are `security definer` and granted to `service_role` only —
`requireAdmin()` in `src/lib/actions/admin.ts` is the gate. That matters more
than it looks: Supabase grants EXECUTE on every function in `public` to `anon`
and `authenticated` *directly*, and revoking from `PUBLIC` does not touch a
direct grant, which is the whole reason `0003_rpc_grants.sql` exists.
`src/lib/admin-booking-link.test.ts` pins the revoke, the grant, and the fact
that both live in the same migration as the definitions — `create or replace`
resets a function's privileges to the defaults, so a later migration that edits
the body and leaves the grants behind quietly re-opens it.

The admin's field runs the same `usernameStatus()` as the host's own, which is
the only thing enforcing the reserved-word list, the 30-character cap and the
no-double-hyphen rule; the database constraint is looser on all three. An admin
path that skipped it could save a name the host could never edit back.

## Auth, and the settings the app cannot enforce

Convex Auth owns sign-in: email and password, and Google. Its session lives in
cookies the middleware refreshes; everything else reads Convex from the server.

**Google needs TWO redirect URIs on the one OAuth client.** Sign-in with Google
returns to the Convex deployment's own origin, and calendar consent returns to
this app. Both must be registered, for every origin in use, or the missing one
fails as `redirect_uri_mismatch` and nothing else:

- `https://<deployment>.convex.site/api/auth/callback/google` — sign-in
- `<origin>/api/google/callback` — calendar, for localhost, previews and production

Removing either to tidy the list breaks the other half of the product.

**Publish the OAuth consent screen.** In **Testing**, refresh tokens expire
seven days after they are issued, so every connected calendar quietly dies a
week later. Google Cloud Console → APIs & Services → OAuth consent screen →
**Publish app**. Full verification is only needed to remove the "unverified
app" warning for other people; publishing alone stops the expiry.

**Only `/auth/callback` may be claimed by the auth middleware.** Convex Auth
takes every `?code=` it sees unless told otherwise, and when redemption fails it
strips the parameter and clears the session. `/verify`, `/reset` and the
calendar callback each redeem their own code. `src/proxy.ts` is an allow-list
for that reason; do not turn it back into a deny-list.

`NEXT_PUBLIC_SITE_URL` must be set on Vercel to the real origin. Without it,
`siteUrl()` falls back to Vercel's host variables, and the per-deployment one
changes on every push — an address that can never be registered with Google.

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

**The session is one round trip.** `whoami.session` returns the identity and
the profile together; it used to be two queries in sequence, the second
re-reading a row the first had already read. `requireSession`,
`contextChoices` and `activeContext` are wrapped in React `cache()`, which is
load-bearing rather than tidy: the layout, the page and every loader call
them, and a Convex query is a POST that Next does not dedupe.

**The proxy asks Convex nothing.** It used to call `isAuthenticated()`, a
network query, on every request that carried a session, public pages and API
routes included. It now acts on private paths only, and only reads the cookie:
Convex Auth's middleware has already refreshed a token near expiry, or cleared
the cookies if that failed, before the handler runs. A session revoked
elsewhere is caught by `requireSession`, which was always the boundary.
`src/proxy.test.ts` fails if a network check comes back.

**Every page reads in two rounds.** The session and the workspace together,
then one parallel burst for everything that needs either. The guest booking
page and the embed widget share one loader (`src/lib/data/booking-start.ts`)
that does exactly that; `/api/slots`, booking creation and rescheduling run
in phases too; a team page reads every member's calendars at once. The
sidebar and the page share one read of the meetings and the plan per request
(`src/lib/data/own.ts`). Two rounds is the floor while the second needs the
workspace the first resolves. `src/lib/round-trips.test.ts` pins all of it,
because one `await` in the wrong place restores a whole hop and no type check
or behaviour test notices.

**`regions: ["iad1"]` in `vercel.json`.** Functions run next to the database.
It was `hnd1` (Tokyo) while the database was Supabase in `ap-northeast-1`.
The database is now Convex in US East (N. Virginia), so the Tokyo pin put a
Pacific crossing, roughly 150–180 ms, on every query a page made. A single
region is allowed on Hobby; only multi-region is a paid feature. Check which
region served a request with `curl -sI https://www.meetrao.com/login | grep
x-vercel-id`: the region is the prefix.

## Mobile

Audited by loading every route at 320, 360, 390 and 430 against a stand-in
Supabase — 120 page loads — and measuring, not by reading the CSS.

**Horizontal scrolling was already handled** and stayed handled: `html, body {
overflow-x: clip }` plus `.scroll-x` on the wide tables. Note that `scrollWidth`
is a misleading metric here — it reports intrinsic width even when clipped, and
made two admin pages look broken when nothing could actually pan. The honest
test is to set `scrollLeft` and see whether it moved, and the honest defect is
content that overflows with no scrollable ancestor to reach it through. Both are
zero, at every width.

Three real clipping defects were found that way and fixed:

  · `minmax(360px, 1fr)` in the FAQ is a floor a track cannot go below, so on a
    320 or 360px screen the questions ran past the edge with no way to reach
    them. Now `minmax(min(360px, 100%), 1fr)` — same two columns wide, collapses
    when narrow. Same fix on the landing page's four grids and the help page's.
  · The nav's "Get started — Free" sat 21px off a 320px screen. The label
    shortens below 400px rather than the button shrinking.
  · The booking page's month stepper overflowed by 9px at 320. The row wraps.

**Touch targets were the real problem.** The design is drawn at 28–36px, which
is right under a mouse and wrong under a thumb: 360 controls measured below 44px
across 22 screens. `globals.css § Touch targets` sets a 44px floor, and three
things about it are deliberate enough to be guarded by
`src/app/touch-targets.test.ts`:

  · Keyed on `pointer: coarse`, not a width breakpoint — what decides the size
    of a target is what is pointing at it. A narrow desktop window keeps its
    dense controls; a 1024px tablet gets the roomy ones. Verified: computed
    `min-height` is 0px under a mouse and 44px under a finger.
  · Height only. The booking calendar is seven cells across a 320px screen, so a
    44px floor on WIDTH would push the grid off the edge and break the layout
    this exists to protect. Icon buttons opt into width with `.tap-square`.
  · The switch and the carousel dots keep their paint. The switch takes a 44px
    hit area from a pseudo-element (hit-tested: a tap 18px to either side lands
    on it). The dots take padding instead, because six dots 6px apart would have
    given overlapping hit areas — a wrong target is worse than a small one.

What is left, and why: 13 switches (paint 34×20, hit area 44×44), 8 `sr-only`
inputs that are not controls, and 9 inline text links — breadcrumbs, "View all",
the wordmark. WCAG 2.5.8 exempts inline links by name, stretching one to 44px
would break the line box around it, and each of those destinations is reachable
from the sidebar as well.

Type sizes were left alone. The 10–10.5px eyebrows are design tokens transcribed
from the handoff, they are micro-labels rather than reading copy, and body text
is 12.5px and up.

## Email authentication, and why mail lands in junk

Measured from a public resolver, not from the Resend dashboard — the dashboard
shows what it asked for, DNS shows what is actually there:

| record | state |
| --- | --- |
| `resend._domainkey.meetrao.com` | DKIM, complete 1024-bit key. Signs `d=meetrao.com`, so it aligns with a `From:` on the root domain. |
| `send.meetrao.com` TXT | `v=spf1 include:amazonses.com ~all` |
| `send.meetrao.com` MX | `feedback-smtp.us-east-1.amazonses.com` |
| `meetrao.com` MX | `inbound-smtp.us-east-1.amazonaws.com` — receiving, unrelated to sending |
| `_dmarc.meetrao.com` | **missing** |
| `meetrao.com` TXT (SPF) | **missing** |

Resend sends with the envelope sender on `send.meetrao.com`, which is why SPF
lives there rather than on the root — SPF authenticates the envelope, not the
`From:` header, and `send.meetrao.com` aligns with `meetrao.com` under relaxed
alignment. That part is correct and does not need changing.

**DMARC is the gap.** There is no record at `_dmarc.meetrao.com`, and there
never has been. Gmail and Yahoo have expected one from senders since February
2024; without it a young domain sits permanently closer to the junk threshold,
and any change to the sending pattern — a new `From:` address, a jump in volume
— is more likely to tip it over. Add, at the Vercel DNS panel:

    Type   TXT
    Name   _dmarc
    Value  v=DMARC1; p=none; rua=mailto:<a real inbox you read>

`p=none` is monitor-only and cannot itself cause a message to be rejected, so
it is safe to add immediately. Move to `p=quarantine` once the aggregate
reports show only legitimate senders.

A root SPF record (`v=spf1 include:amazonses.com ~all` at `@`) is belt and
braces: not required, because the envelope domain is what SPF checks, but it
helps filters that wrongly check the header `From:` domain. Only ever publish
**one** SPF record per name — several is a permerror, which is worse than none.

**The sign-up and password-reset emails are rendered inside Convex**, in
`convex/lib/emails.ts`, not from `src/emails/`. Convex Auth sends them from an
action, and Convex cannot read from disk, so `lib/email/send.ts` cannot reach
them. They read `EMAIL_FROM` and `EMAIL_POSTAL_ADDRESS` from the **Convex**
deployment's environment, and throw rather than send when the postal address is
missing — a footer with no address is not a compliant footer. Both go through
Resend from meetrao.com, so the DKIM, SPF and DMARC above apply to them.

They used to be Supabase's, pasted by hand into its dashboard, which is how they
went out for weeks with a footer reading only "Meetrao" and an unsubscribe link
to a page the reader could not open. Neither message carries an unsubscribe now:
both are transactional, and nobody may opt out of the email that lets them into
their own account.

**Diagnosing a junked message.** Open it, view the original, and read
`Authentication-Results`. `spf=pass` and `dkim=pass` there means authentication
is fine and the problem is reputation or content; a `fail` on either is a
different and more urgent fault. Guessing from the outside is not possible —
this table is what DNS says, not what a mailbox provider decided.

## Receiving support mail

`hello@meetrao.com` is the address the contact form delivers to, and it is a
Resend receiving address — the domain has `Receiving: enabled` and its MX record
(`inbound-smtp.us-east-1.amazonaws.com`, priority 9, at the root) is verified.

**Resend inbound is not a mailbox.** There is no IMAP, no POP, no webmail. A
received message lands in Resend's store and is visible under Emails →
Receiving; nothing tells a person it arrived. Without the piece below, mail to
hello@meetrao.com is *received* and never *read*.

`POST /api/resend/inbound` closes that gap: it verifies Resend's Svix signature,
fetches the message, and forwards it to a real inbox with `Reply-To` set to
whoever wrote in, so replying answers them directly rather than the app. Two
variables switch it on, both optional — unset, the route no-ops and nothing
else changes:

- `RESEND_WEBHOOK_SECRET` — the `whsec_…` signing secret, shown once when the
  webhook is created. Unset, nothing is processed at all: an unverified webhook
  body is an anonymous stranger asking Meetrao to send mail.
- `SUPPORT_INBOX` — where forwards go. **Not an address on meetrao.com.**
  Receiving is enabled at the *root* of the domain, so every address on it
  routes back into Resend and forwarding there loops forever; `refuseToForward`
  rejects that rather than discovering it in production.

The webhook itself is created in the Resend dashboard under Webhooks, pointed at
`<origin>/api/resend/inbound` and subscribed to `email.received`.

**The webhook is an envelope, not a message.** `email.received` carries the
sender, the recipients, the subject, the message id and attachment *metadata* —
and no body. There is no `text` and no `html` anywhere in the payload, which is
confirmed three ways: two live deliveries captured from this endpoint, and
Resend's own `ReceivedEmailEventData` type, which declares neither field.

That was not obvious, and it shipped broken. The route built its forward
straight from the webhook, so `mail.text` and `mail.html` were always `""`, and
every forwarded support email arrived reading *"This message arrived with no
readable body."* — envelope only, for a week, with nobody the wiser because the
forward itself looked like it worked. Attachments went the same way: the payload
names them but does not carry them, and the send never asked for them.

So the route now makes two more calls before forwarding:

- `emails.receiving.get(id, { html_format: "data_uri" })` for the real body.
  `data_uri` embeds inline images in the HTML rather than leaving broken `cid:`
  references, which is also why `chooseAttachments()` drops inline parts from
  the attachment list — attaching them again shows every signature logo twice.
- `emails.receiving.attachments.get()` per file, for a signed `download_url`
  that is handed to the send as `attachments[].path`. Resend fetches the file
  itself, so a 12 MB PDF never occupies this function's memory and never crosses
  the wire twice.

Attachments are budgeted at 15 MB total, well under Resend's 40 MB ceiling: a
webhook that tries to move 40 MB is a webhook that times out and gets retried,
moving it again each time. Anything over budget is *named* in the forwarded
body rather than dropped in silence.

Neither extra call may lose the mail. Both are wrapped so a failure narrows what
gets sent — envelope without body, or body without files — rather than aborting
the forward, on the same principle as the rest of the module: a support address
that silently drops mail is worse than no support address.

Forwarding is deliberately dumb — it does not parse, thread or file anything. It
turns an API-only inbox back into ordinary email and stops there.

## Analytics

Two independent things, and the distinction is the whole design:

**The first-party counter** is always on and needs no configuration. A client
beacon (`components/analytics/beacon.tsx`) posts a path and, once, a referrer to
`POST /api/analytics/collect`; the route derives the country from Vercel's edge
headers, the device from the user-agent, and a visitor hash from
sha256(salt · UTC date · IP · user-agent), then writes one row to `site_visits`
with the service role. **The IP never becomes a column.** The date is inside the
hash, so the pseudonym dies at midnight UTC and "did this person come back last
week" is unanswerable by construction. Nothing is written to the visitor's
device, which is why this half needs no consent. The signed-in product is not
counted at all — see `SKIP` in beacon.tsx.

`site_visits` has an admin-only SELECT policy and **no insert policy and no
grant to anon**: a browser that could insert there could invent a country. The
route is the only writer. Rows are deleted after 400 days by `analytics_prune()`,
called on roughly one request in five hundred because this plan has no
scheduler.

Read back through three aggregate functions — `analytics_overview`,
`analytics_daily`, `analytics_top` — all `security invoker`, so the RLS policy is
the only access rule and a non-admin sees zeroes rather than an error. The screen
is `/admin/analytics`.

- `ANALYTICS_SALT` — set it on the **Convex** deployment. It salts the daily
  visitor hash; rotating it resets that day's unique-visitor count, which is
  the point of keeping it stable.

**Google Analytics** is off unless `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set, and
then it still does not load until a visitor presses Accept. Not "loaded with
consent mode denied" — not loaded: no script from googletagmanager.com is on the
page and no request reaches Google. Measured, in a real browser: 0 requests to
Google before Accept, 1 after, 0 after "No thanks". With the variable unset there
is no banner either, because there is nothing to consent to.

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` — optional, `G-XXXXXXXXXX`.

GA4's own `page_view` fires once when the tag loads, so `send_page_view: false`
is set and the event is fired per pathname change instead — this is a
client-side router, and without that every page but the landing page would be
invisible.

## SEO, and the signed-in nav

**The nav.** The landing page, Terms and Privacy show the account menu to a
signed-in host, and they are still statically prerendered. Those two facts are
in tension — reading a cookie on the server turns a page dynamic — so the
session is read in the BROWSER instead
(`components/marketing/site-account-live.tsx`). The static HTML carries "Log in"
and "Get started", which is right for almost every visitor a search engine
sends, and a signed-in host sees it swap to their avatar about 300ms after
hydration, measured against a production build. /help and /support keep
resolving the session on the server — they are dynamic anyway — so those two
have no swap at all.

A profile read that fails renders the signed-out nav rather than a nameless
avatar chip. That is a decision, not an accident: see `accountFrom`.

**/pricing exists because "is it actually free" is a query.** The page has one
tier and no plan grid — three columns of ticks where two are empty is a layout
that exists to make an upsell legible, and inventing one for a product with no
upsell would be theatre. The section order is the argument, the same as on the
comparison pages: the number, then everything included, then **what it cannot
do**, and only then the invitation to sign up. Somebody who needs Outlook should
learn that in ten seconds rather than after connecting a calendar.

`lib/pricing-claims.test.ts` guards the claim rather than the layout. It fails
on "free forever" and four variants anywhere in shipped copy — with comments
stripped first, because three files explain at length why Meetrao does not say
it, and the first version of the test failed on all three. It also fails if the
page stops linking to `/terms#t-price`, if that anchor disappears from the
Terms, if the limits section moves below the call to action, or if a limit stops
reading as one. That last rule came from mutating the test: renaming "No
rescheduling yet" to "Rescheduling" passed a substring check while inverting the
meaning, so a limits section could quietly gain a feature.

**Titles put the category first and the brand last.** "Meetrao" is a word
nobody is searching for yet, so spending the front of a 60-character title on it
buys nothing; "free meeting scheduling app" is what somebody types who would
want this. The home page therefore reads *Free Meeting Scheduling App &
Appointment Booking · Meetrao*, and the order flips only once people search the
name. Both /vs pages lead with the query rather than the comparison — *Free
Calendly Alternative — Meetrao vs Calendly* — for the same reason.

Two mechanics decide the shape of these, and both are easy to get backwards:

- `title.template` in the root layout applies to **child** segments and never to
  `title.default`. So `TITLE` already ending in "· Meetrao" is correct, not a
  duplication — Next's own docs say so, and it was checked against the build
  output rather than believed.
- A page that spells the brand in its own title gets it twice. *"Help Centre —
  how Meetrao scheduling works"* rendered as *"… how Meetrao scheduling works ·
  Meetrao"*, which reads as a mistake and wastes the scarcest line on the page.

`seo-invariants.test.ts` computes the *rendered* title for every public page and
fails on any that runs past 60 characters, names the brand twice, or duplicates
another page's. Descriptions are held between 80 and 155 characters — 155 is
roughly where a snippet is cut, and both /vs descriptions were over it. The same
file checks the sitemap lists every public page: `/login` is excluded by name
with a reason, so a page missing by oversight cannot pass as a page missing on
purpose.

**What is indexable.** `robots.ts` disallows the signed-in product (a crawler
gets a redirect to /login there, so fetching it is pure waste). The guest
booking pages are a different problem and get a different tool: `/booking/<ref>`
shows a named guest and a time, so it carries `noindex` in its own metadata and
is deliberately NOT disallowed — a disallowed page is one a crawler never
fetches and therefore one whose `noindex` it never reads.

The sitemap lists Meetrao's own pages and deliberately not the hosts'. Every
`/<username>` page is public and individually indexable, but a sitemap
enumerating them is a machine-readable roster of everybody who uses the product
— each username is already public on its own, and publishing the complete set is
a different thing. A test fails if the sitemap ever starts reading from the
database.

`src/app/seo-invariants.test.ts` pins both, plus the two defects found while
writing this: every page in the app inherited a canonical pointing at the home
page, and five pages that set their own `openGraph` shipped without an image,
because Next replaces the parent object rather than merging into it. It also
fails if a new route group appears under `(app)` without a matching disallow.

**Structured data** lives in `lib/seo.ts` and renders on every page: an
Organization (address from `lib/contact.ts`, so there is still one spelling of
it), a WebSite, and a SoftwareApplication with `offers.price: "0"`. No
`aggregateRating` and no `review` — both would produce stars in a search result
and both would be invented. The landing page adds a FAQPage built from the same
`FAQS` array the page renders, so the machine-readable answers cannot drift from
the human ones.

`FAQS` lives in `lib/faq.ts`, not in `faq.tsx`, and that matters: a Server
Component importing a plain value from a `"use client"` module gets a client
reference, not the value, which looks fine until something calls `.map` on it.

**The comparison pages** (`/vs/calendly`, `/vs/cal-com`) are the highest-intent
pages on the site. `lib/comparisons.ts` holds the content and three rules: every
claim about another product is checkable and dated, nothing is derogatory, and
the section on where the other tool is better comes FIRST. That last one is not
manners — it is the only reason a reader believes the rest of the page.

> **Re-check the competitor figures.** They carry `checkedOn` and it is printed
> on the page. They were taken from third-party pricing trackers rather than
> from Calendly's and Cal.com's own pages, which were unreachable from the
> machine that wrote them. Verify against the linked pricing pages, and again
> whenever the date on the page starts to look old.

**The free claim** is "free, no card, no trial countdown" everywhere and never
"free forever", because Terms §5 says paid plans may follow. Marketing copy that
contradicts your own Terms is how a rich result gets pulled.

**What is not automated, and needs a person:**

- **Google Search Console.** Verify meetrao.com, submit `/sitemap.xml`, and
  request indexing for `/`, `/vs/calendly` and `/vs/cal-com`. Verification
  tokens are per-account, so there is deliberately no `verification` block in
  the root metadata — add one there if you choose the meta-tag method.
- **Host booking pages are not in the sitemap.** Each `/<username>` is
  individually indexable and has real metadata, but listing them all would
  publish a machine-readable roster of everybody using the product. That is a
  decision to make with users, not for them.

## Still open

- **Google redirect URIs.** Which origins are registered cannot be checked from
  outside — Google validates the authorization code before the redirect URI, so
  every probe returns the same error. Both URIs in *Auth* above must be
  registered by hand, for every origin in use.
- **`vercel.json` pins functions to Tokyo** while the database is in Virginia —
  see *Why navigation is fast*. One line to change, and a production decision.
- **Preview deployments use the DEV Convex deployment.** `NEXT_PUBLIC_CONVEX_URL`
  on Vercel's Preview environment points at `festive-meerkat-460`. That is
  reasonable for previews, but it means a preview build can never be promoted
  to production — it would point meetrao.com at the dev database.
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
- **A lawyer has still not read `/terms` and `/privacy`.** Both were rewritten
  for publication: the amber draft banner and the five open callouts are gone,
  because each question behind them has been answered (sole proprietor in
  Cumilla; minimum age 16; SCCs for EU/UK transfers; liability capped at the
  greater of fees paid in twelve months or US$50; a consent banner that now
  exists). Those are defensible answers, not reviewed ones — worth an hour of a
  Bangladeshi lawyer's time before anyone relies on the cap.
- **No reschedule flow.** Guests cancel and rebook. `booking-changed.html` and
  `sendRescheduled()` exist, unwired, for whenever it is built.
- **Vercel Hobby allows ~100 deployments a day**, counting every PR preview and
  every production build. Pushing and merging after each small fix hit it twice
  in one day and left a live bug stranded behind it. Batch changes.
