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

**Double-booking has two independent guards.** The slot engine re-runs server-side
against fresh availability and busy periods immediately before writing, and
`create_booking` re-checks inside its own transaction behind a Postgres exclusion
constraint. Either returns 409, which the UI renders as the design's "That time is
no longer available … Nothing has been scheduled."

**Cancelling is a POST behind a confirm step.** Mail clients and link previewers
fetch every URL in an email; a GET that cancelled would cancel meetings nobody
meant to.

**Calendar tokens live behind the service role.** `calendar_connections` has RLS
enabled and no policy, so no browser session can reach it. Everything that touches
it goes through `src/lib/google/connection.ts`.

**Avg. reply time is real.** It measures booking-page-opened → booked, which
nothing recorded before, so `booking_page_views` and `avg_reply_minutes` were added.
With nothing measured yet the card shows "—" rather than an invented figure.

## Still open

- **Google redirect URIs.** The credentials are set, but
  `<origin>/api/google/callback` has to be registered in Google Cloud for
  **every** origin — localhost, each Vercel preview domain, production. A
  missing one fails as `redirect_uri_mismatch` and gives no other signal.
- **Photography.** The six Use cases cards render labelled frames until photos
  exist. Dropping `public/use-cases/<id>.jpg` is the whole wiring — the page
  reads the directory at build time, so a partial set degrades one card at a
  time. `public/use-cases/README.md` has the ids and the two crops each photo
  has to survive. Stock or generated images were explicitly not a substitute.
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
