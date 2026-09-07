# START HERE — a diff against this repo, not a rebuild

**For Claude Code working in `faisalibnislam/meetrao` (app lives in `meetrao/`).**

Read this file. Then `CHANGELOG.md` for the reasoning behind each change. `README.md` is the full
spec — use it as reference for a screen you are touching, not as a build list.

## The situation

**This repo already implements an earlier pass of this design.** `src/app/globals.css` carries the
tokens transcribed verbatim, `button-style.ts` has the nine button sizes with the design's exact
heights, the Font Awesome subset is built, and `--ink-3` even carries the "do not lighten" note.
Someone did a careful job.

So this is **not** a rebuild, and not a generic "bring the codebase up to the design" pass either.
It is a **change list**: nine areas moved after that implementation. Everything else in the repo
is correct and should be left alone.

**Do not** touch routing, Supabase schema and queries, auth, the booking/slots engine, or the
build setup unless a change below explicitly requires it.

**Delete or ignore `project/` at the repo root.** It is a stale snapshot of the design project —
`Meetrao.dc.html`, `Meetrao Landing Mobile.dc.html`, `Dropdown.dc.html`,
`MeetUp Prototype.dc.html`. Those predate the rename and several rounds of change. Reading them
will actively mislead you. `design_handoff_meetrao/` is current.

---

## The nine changes

Ordered so each is independently shippable. Do them as separate commits.

### 1. Font: DM Sans → Instrument Sans  *(global, do first)*

`globals.css` sets `--font-sans: var(--font-dm-sans), …`. The design moved to **Instrument Sans**
for all product UI. DM Mono and Instrument Serif are unchanged.

- Swap the `next/font` import in `src/app/layout.tsx` and the `--font-sans` line in `globals.css`.
- Instrument Sans has **no optical-size axis** — if the font loader requests `opsz`, drop it.
- Nothing else should need touching: every component already goes through `font-sans`.

Instrument Sans is OFL. Do this first — it changes metrics everywhere and you want one commit that
shows only the font moving.

### 2. Settings: add a Notifications panel

`src/lib/settings-tabs.ts` has four tabs. The design has **five** — Notifications sits between
Booking and Account.

Five switch rows: New booking, Booking changed, Booking cancelled (all default on), Daily agenda,
Product news (default off). Footnote: *"Turning everything off does not stop the emails your guests
receive, or password and security emails."*

- `settings-tabs.ts` — add the tab.
- `settings-panels.tsx` — add the panel; `controls.tsx` already has the Switch.
- **New API + data model:** five boolean columns on the user, read before every host email.
  Guest-facing email is never suppressed by these.

### 3. Email verification gate  *(new route + backend)*

`(auth)` has login, signup and forgot. The design adds a **verify** screen between sign-up and
onboarding, and gates the app behind it.

- New route under `(auth)`, plus the flow changes: email sign-up → verify; verified → onboarding
  step 1; **Google sign-up skips it** (the address arrives verified); an unverified login attempt
  bounces to the gate with a warn toast.
- Settings → Account gains an Email address row with a Verified/Unverified badge.
- **Backend:** verification token (24h expiry), `verified_at` column, resend endpoint with rate
  limiting, and **server-side enforcement on every authenticated endpoint** — the client gate is a
  convenience, not the boundary.

Spec: README § "Auth · Verify email".

### 4. Six transactional emails  *(new, drop-in)*

`design_handoff_meetrao/emails/*.html` are **real send-ready HTML** — the only files in this bundle
you use as-is. Table-based, inline styles, under 10KB each.

`verify-email` · `welcome` · `booking-new-host` · `booking-new-guest` · `booking-changed` ·
`booking-cancelled`.

- Wire to your provider; merge fields are listed per template in `Meetrao Emails.dc.html`.
- The logo is drawn in type because a repo-relative asset will not resolve for a recipient —
  **swap in a hosted https PNG** before sending; the cell is sized for a 22px square.
- Transactional mail (verification, guest confirmations, password) must ignore unsubscribe;
  welcome and product news must honour it.
- Add an idempotency key so a retried webhook does not double-send.
- `booking-changed.html` has **no flow behind it** — there is no reschedule in the product. Either
  build reschedule or hold that template.

### 5. Calendar events now invite the guest  *(changes booking creation)*

`src/lib/google/calendar.ts` creates the event. The design now puts **the guest on it as an
attendee**, so it lands on both calendars as one event rather than two.

- Guest confirmation screen drops "Add to Google Calendar" for a green *"This is already on your
  calendar"* panel; `.ics` stays as the non-Google fallback.
- Booking detail dialog gains a Calendar row; the connect dialog and onboarding step 2 disclose it.
- **This widens the OAuth scope** from read-only free/busy to write-with-attendees. Expect a
  scarier Google consent screen and more drop-off — `src/lib/google/oauth.ts`.
- **Two open decisions:** both parties will see each other's email address on the event (inherent
  to an attendee invitation, disclosed in the Privacy Policy); and a guest declining in Google does
  **not** cancel the Meetrao booking, with RSVP responses now arriving on the host's event and
  nowhere in the UI to show them.

### 6. Admin: remove an account  *(new dialog + backend)*

`suspend-user.tsx` exists; removal does not. Admin → User detail gains a red-soft *"Remove this
account"* panel and a dialog spelling out the consequence.

Suspension is reversible, removal is not — keep them visibly separate.

- **Backend:** hard delete cascading across users, meeting types, availability, bookings and
  calendar tokens.
- **Two open decisions:** whether a GDPR-style export is offered first, and whether the freed
  username becomes immediately re-registrable.

### 7. Mobile: sidebar becomes a hamburger drawer

`src/components/app/sidebar.tsx` turns into a horizontal rail on mobile. The design replaces that
with a 44px hamburger opening a full-width drawer.

Also fixes a real dead-end: **Settings and Log out are currently unreachable on mobile** because
the account block is hidden at that breakpoint. The drawer ends with the account block plus
Settings · Help centre · Contact support · Log out, all 44px.

**Gate the drawer's Settings row on `!isAdmin`** — admin already has Settings as a nav row, and
without the gate admins get two identical adjacent rows, the second dropping them out of the admin
console. The same gate belongs on the desktop account popover.

### 8. Four new public pages

None exist in the repo. All four are static content and need the global nav and footer.

| Route | Notes |
| --- | --- |
| `/terms` | Terms of Service. Sticky contents rail. **3 items need legal sign-off** |
| `/privacy` | Privacy Policy. Sticky contents rail. **2 items** — one legal, one to build |
| `/help` | Help centre, nine sections + FAQ. Sticky contents rail |
| `/support` | Contact form. Needs a submit endpoint |

**Build the nav and footer once** as a shared layout. The prototype duplicates them across five
files because it has no layout primitive — do not copy that.

The five legal items: legal entity and company number · minimum age (draft says 16) · liability cap
· cross-border transfers (Bangladesh has no EU adequacy decision — EU data needs SCCs signed and
real hosting regions named, **before launch**) · **cookie-consent banner, which does not exist**
(EU/UK visitors must be able to refuse analytics cookies before they are set).

### 9. Landing page, rebuilt

`src/app/page.tsx` predates the redesign entirely. The current design is a different page: dark
animated hero, four-step walkthrough, live product tables, a use-case carousel, a cost calculator,
a 14-question FAQ and a tall footer carrying the CTA.

Two things to know before starting:

- **Every product visual is live UI, not a screenshot.** The `shot-*.png` and `m-*.png` files in
  `assets/` are unused leftovers — safe to delete. What the page does need is **real photography for
  ten `<image-slot>` placeholders** (host avatars, the message thread, six use-case panels).
- Below 640px the two live tables are **replaced** by card lists, not restyled.

Spec: README §§ hero, walkthrough, product, use cases, FAQ, footer.

---

## Things that are easy to get wrong

All three were bugs during the design work; `CHANGELOG.md` has the diagnoses.

- **Text never below 10px.** Icon glyphs at 8–9px are fine; text is not. This regressed three times.
- **`--ink-3` is `#66635C`.** Darkened specifically to clear 4.5:1 on ground, surface and fill.
  `globals.css` already says this. Do not lighten it.
- **Touch targets ≥44px** on mobile — menu rows and table row actions included.
- **A menu's contents depend on role, not just breakpoint** (see change 7).

## Out of scope

Not designed, deliberately: notification channels beyond email, team or round-robin booking,
payments, analytics dashboards, calendar providers other than Google, meeting locations other than
Google Meet, date-specific availability overrides, admin impersonation and refunds.

Availability stays **one weekly schedule per account**, not per meeting type.

## Before you ship

- **Font Awesome 6 Sharp is licensed.** The repo already ships a 9.6KB subset of 31 codepoints —
  that is your own licensing question, not a design one.
- **Google's "G" mark** is subject to Google's brand terms.
- **Ten `<image-slot>` placeholders** on the landing page need real photography.
- **Avg. reply time** on the dashboard measures booking-page-opened → booked. That telemetry does
  not exist. Build it or drop the card.

## Deploying

You asked for this to happen automatically. Two cautions:

Changes **2, 3, 5 and 6 need backend work** (columns, endpoints, a widened OAuth scope, a cascading
delete) and change 3 gates the whole app behind verification. Do not auto-deploy those to
production without a staging pass — a bad verification gate locks out every existing user, and the
OAuth scope change forces every connected host to re-consent.

Changes **1, 7, 8 and 9** are presentational and safe to ship continuously.

## The files

| File | What it is |
| --- | --- |
| `START-HERE.md` | This file. |
| `CHANGELOG.md` | Every change and why, newest first, with the bug diagnoses. |
| `README.md` | The full spec — tokens, every screen, dialog, interaction and state. |
| `emails/*.html` | **Send-ready.** Use as-is. |
| `Meetrao App.dc.html` | All 25 screens and 7 dialogs. Open in a browser; the bottom bar jumps between screens and pins Desktop/Mobile. |
| `Meetrao Landing.dc.html` | The landing page. |
| `Meetrao Terms/Privacy/Help/Support.dc.html` | The four new public pages. |
| `Meetrao Emails.dc.html` | Email gallery with subjects, recipients, triggers and merge fields. |
| `MenuSelect.dc.html` | The custom select. Repo already has `ui/menu-select.tsx`. |
| `support.js`, `image-slot.js` | Prototype runtime. **Not for production.** |
