# Handoff: Meetrao — scheduling app + marketing site

## Overview

Meetrao is a scheduling product. A host connects their Google Calendar, defines one or more
bookable "meetings" (duration + rules), sets weekly availability, and shares a single link
(`meetrao.com/<username>`). Guests open that link, pick from times the host is genuinely free,
and get a confirmed booking with a Google Meet link. There is also an admin console for
platform operators, and a marketing site (desktop + mobile).

This bundle contains **24 product screens**, **6 dialogs**, and **2 landing pages**.

## About the design files

The files in this bundle are **design references created in HTML** — interactive prototypes that
show intended look and behaviour. They are **not production code to copy**.

They are built on an internal HTML component runtime (`.dc.html` files with a template + a
logic class, loaded by `support.js`). That runtime is a design tool, not a shippable framework.

**The task is to recreate these designs in the target codebase's existing environment** —
React, Vue, Svelte, SwiftUI, native, whatever the project already uses — following that
codebase's established patterns, component library, routing and state conventions. If no
codebase exists yet, pick the framework most appropriate for the project and implement there.

Open each `.dc.html` file in a browser to interact with the prototype. Every screen is reachable
from the "Prototype" bar pinned to the bottom of the app file, which also has a Desktop/Mobile
viewport switch. That bar is a prototype affordance — **do not build it**.

## Fidelity

**High-fidelity.** Colours, typography, spacing, radii, control heights, hover/focus states,
copy and interaction behaviour are all final and should be matched precisely. Every value in the
Design Tokens section below is taken from the actual source.

Two caveats:
- All data is mock data (see "Mock data" below). Real API wiring replaces it.
- Google Calendar / Google Meet integration is simulated with timers. Real OAuth and Calendar
  API work is required.

---

## Design tokens

Declared once as CSS custom properties on `:root`. Every file uses the same set.

### Colour

| Token | Value | Use |
| --- | --- | --- |
| `--ground` | `#E7E4DC` | Page background (warm greige). App shell, scroll areas, header. |
| `--surface` | `#FFFFFF` | Cards, tables, inputs, dialogs, popovers. |
| `--fill` | `#F2F1EC` | Table headers, inert fields, row hover, aside panels. |
| `--fill-2` | `#EAE8E1` | Secondary hover (ghost buttons, avatar chips), switch track off. |
| `--line` | `#E0DDD4` | Default border on cards, tables, dividers. |
| `--line-soft` | `#EDEBE4` | Internal row dividers, metric cell separators. |
| `--line-strong` | `#CFCBC0` | Input borders, secondary button borders, dashed empty states. |
| `--ink` | `#1A1917` | Primary text. Also the sidebar logo ink. |
| `--ink-2` | `#575550` | Secondary text, body copy, labels. |
| `--ink-3` | `#66635C` | Muted text: eyebrows, table headers, meta, placeholders. (4.7:1 on ground — do not lighten.) |
| `--accent` | `#14554A` | Primary actions, selected states, active icons, success. |
| `--accent-2` | `#0E4038` | Primary action hover. |
| `--accent-soft` | `#E4EDEA` | Accent tint: badges, avatar chips, selected menu row. |
| `--accent-line` | `#C2D6D0` | Border on accent-tinted surfaces. |
| `--red` | `#98291F` | Destructive actions, error text and icons. |
| `--red-soft` | `#F8E9E5` | Error/destructive panel background. |
| `--red-line` | `#E7D2CB` | Border on red-soft panels. |
| `--amber` | `#7D5406` | Warning icon + text. |
| `--amber-soft` | `#F7EFDD` | Warning banner background. |
| `--amber-line` | `#E5D6B4` | Border on amber-soft panels. |

Additional literals:
- Sidebar background: `#EFEDE7` (between ground and surface).
- Red button hover: `#7F221A`. Amber banner text: `#6A4705`. Red panel body text: `#77332B`.
- Focus ring: `box-shadow: 0 0 0 3px rgba(26,25,23,0.12)` (token `--ring`).
- Dropdown/dialog shadow (`--pop`): `0 1px 2px rgba(26,25,23,0.05), 0 14px 32px -10px rgba(26,25,23,0.22)`.
- Landing hero shadow: `0 1px 2px rgba(26,25,23,0.05), 0 30px 60px -24px rgba(26,25,23,0.34)`.

**Rule:** near-black `--ink` is for *text*; `--accent` green is for *primary actions and
selected state*. Destructive is always `--red`. Status colours never decorate.

### Typography

Three families, strictly divided by role:

| Family | Weights | Role |
| --- | --- | --- |
| **DM Sans** | 400, 500, 600, 700 | All product UI: labels, buttons, tables, body. Default `body` font. |
| **Instrument Serif** | 400 only | Display moments only: landing headlines, auth titles, onboarding titles, public booking page title, "You're booked!", and the dashboard greeting. |
| **DM Mono** | 400, 500 | Machine strings and micro-labels: booking URLs, Meet links, table column headers, metric labels, eyebrows, timestamps, reference IDs. |

Loaded from Google Fonts. Icons are **Font Awesome 6 Sharp** (from the Airly design system
bundle at `_ds/…/tokens/fonts.css`), used at Light 300 for object/navigation glyphs and Solid
900 for status/close/check glyphs — 8–18px, referenced by codepoint (e.g. `\uf133` calendar,
`\uf03d` video, `\uf00c` check, `\uf06a` error, `\uf071` warning, `\uf002` search).

Product type scale (px):

| Role | Size / weight / tracking | Notes |
| --- | --- | --- |
| Page title (h1) | 19 / 600 / -0.012em | line-height 1.35 |
| Dashboard greeting | clamp(30, 3.4vw, 38) / 400 / -0.012em | **Instrument Serif**, line-height 1.08 |
| Section heading (h2) | 14.5 / 600 | |
| Body | 13.5 / 400 | line-height 1.5–1.6 |
| Table cell | 13 / 400 | primary cell text 13.5 / 600 |
| Field label | 12.5 / 600 | |
| Helper / meta | 12–12.5 / 400 | `--ink-3` |
| Table column header | 10 / 400 / 0.07em, uppercase | **DM Mono** |
| Eyebrow / metric label | 10–10.5 / 0.07–0.08em, uppercase | **DM Mono** |
| Metric value | 20 / 600 / -0.015em | |
| Badge / pill | 11.5 / 600 | |

Landing type scale: hero h1 `clamp(46, 7.4vw, 92) / 400` Instrument Serif at -0.022em,
line-height 0.98; section h2 `clamp(30, 3.6vw, 44) / 400`; split h3 `clamp(26, 3vw, 36) / 400`;
body 14.5–17.5. Mobile: hero `clamp(40, 11.5vw, 50)`, h2 `clamp(28, 7.6vw, 34)`.

### Spacing, radii, controls

- **Control heights:** 26 (table row action), 28 (compact), 30 (small), 32 (secondary), 34
  (standard select/input), 36–38 (form primary), 40–44 (auth/landing CTA), 46–50 (mobile CTA).
- **Radii:** 4px badges · 5px small controls and menu rows · 6px buttons, inputs, nav items ·
  7px landing CTAs · 8px cards, panels, dialogs, sections · 12px page-level surfaces and
  screenshot frames · 14px CTA band · 20px mobile screenshot frames · 50% avatars/dots.
- **Gaps:** 1–2px (nav items, menu rows) · 6–10px (inline groups) · 12–16px (form fields) ·
  18–26px (page sections) · 34–46px (landing sections).
- **Page padding:** desktop `24px 26px 90px`, mobile `18px 16px 90px`. Content column
  `max-width: 1120px; margin: 0 auto`. Narrow forms centre at 600–780px.
- **Header padding:** desktop `46px 26px 16px`, mobile `44px 16px 14px` (the tall top padding
  is intentional breathing room above the page title).
- **Sidebar:** 218px wide, `padding: 14px 12px 58px`, `border-right: 1px solid var(--line)`.

### Motion

- 120–140ms `ease` for colour, background, border and box-shadow transitions.
- 160ms `mu-in` (`opacity 0→1`, `translateY(5px→0)`) for dialogs, toasts, popovers.
- 460–500ms `cubic-bezier(.22,1,.36,1)` `mu-up` for landing hero/screenshot entrances.
- 140ms `cubic-bezier(.3,1.2,.6,1)` for switch thumb travel.
- 700ms linear infinite for the button spinner.
- All wrapped in `@media (prefers-reduced-motion: reduce)` which zeroes durations.

### Layout rules

- Sibling groups use flex/grid + `gap`, never margins between items.
- Tables scroll horizontally inside a bordered card (`overflow-x: auto`, `min-width` 640–820px
  per table) rather than reflowing.
- Everything below fixed-format contexts is fluid: `max-width` not `width`,
  `repeat(auto-fit, minmax(…, 1fr))` grids, `flex-wrap` on action rows.

---

## Files

| File | What it is |
| --- | --- |
| `Meetrao.dc.html` | The product: all 24 screens, 6 dialogs, toasts, prototype bar. |
| `Meetrao Landing.dc.html` | Desktop marketing page. |
| `Meetrao Landing Mobile.dc.html` | Mobile marketing page. |
| `MenuSelect.dc.html` | Custom select/dropdown component used throughout the product. |
| `support.js` | The design-tool runtime. **Not for production.** |
| `assets/meetrao-logo.svg` | Logo (mark + wordmark, 576×127). Wordmark ink is `#1A1917`, mark green `#16554A`/`#268574`. |
| `assets/google-g.svg` | Google "G" for the OAuth button. |
| `assets/shot-*.png` | Desktop product screenshots used on the landing page. |
| `assets/m-*.png` | Mobile product screenshots used on the mobile landing page. |

---

## Screens

### Auth (3)

**Log in / Sign up / Forgot password.** One two-column card, `max-width: 940px`, radius 12px.
Left column (`padding: 40px`): logo, Instrument Serif title (38px), one-line blurb, then fields.
Right column (`padding: 40px`, `background: var(--fill)`, left border): a serif value-prop
headline plus three green-check bullets — hidden entirely on mobile (`grid-template-columns: 1fr`).

- Fields: 38px tall, 1px `--line-strong`, radius 6px. Focus → `--accent` border + `--ring`.
- Log in: Work email, Password (with a "Forgot?" link right-aligned in the label row).
- Sign up: adds Full name above; password helper "At least 8 characters."
- Forgot: email only, no password block, no Google button, CTA "Send reset link".
- Primary CTA 40px, `--accent` fill, white text, hover `--accent-2`; shows an inline spinner
  while submitting (700ms) then routes on.
- Divider row: hairline / "or" in DM Mono uppercase / hairline. Then "Continue with Google"
  (40px, white, `--line-strong` border, 16px Google G).
- Footer line switches mode: "New to Meetrao? Create an account" ↔ "Already have an account? Sign in".
- Sign-up and Google both route into onboarding step 1; log in routes to the dashboard.
- The logo links back to the landing page.

### Onboarding (5 steps)

Fixed top rail (`padding: 13px 22px`, bottom border) holding the logo and a **step tracker**:
"Step N / 5" in DM Mono, then five nodes connected by 2px lines. Completed nodes are
`--accent`-filled with a white check glyph (18px); the current node is 22px, `--accent`-filled,
white number, with a `0 0 0 3px var(--accent-soft)` halo and its name spelled out beside it
(Welcome / Calendar / Meeting / Hours / Ready); upcoming nodes are 18px, white, `--line-strong`
border, `--ink-3` number. Connector fills green up to the current step. On mobile the labels
hide and connectors shorten to 10px.

Body: one white card, `max-width: 580px`, radius 12px, `padding: 34px`, containing an
Instrument Serif title (32px), a blurb, the step's content, then a divider with 20px of space
above the action row.

1. **Welcome** — copy only. CTA "Get started".
2. **Calendar** — a bordered `--fill` row (Google Calendar, status text, Connected/Disconnected
   badge), two green-check reasons, CTA "Connect Google Calendar" (or "Continue" once
   connected), secondary "Skip for now". Connecting shows a spinner for 1200ms then flips to
   connected and fires a success toast. The failure path renders a red-soft panel: "Couldn't
   connect to Google / Google didn't confirm the permission. Try again and allow calendar access."
3. **First meeting** — Meeting name, Description (+ helper "Guests see this on your booking
   page."), Duration as four chips (15/30/45/60 min; selected = `--accent` fill, white text),
   and a locked Location row (`--fill`, Google Meet, right-aligned note "Only option in this release").
4. **Availability** — Timezone select (searchable, 94 zones, helper "Detected from your
   browser.") plus the seven-day editor (see App · Availability).
5. **Ready** — booking link in a `--fill` row with a Copy button, a three-row summary card
   (meeting + duration, days/start time, calendar status — each with a check or warning glyph),
   and, when the calendar is not connected, an amber banner with a "Connect now" button.
   CTA "Go to dashboard", secondary "View booking page".

### App shell

- **Sidebar** (218px, `#EFEDE7`): logo (+ an "ADMIN" mono chip in admin mode), nav list, and a
  bottom account row (26px `--accent-soft` initials chip, name, email, log-out icon button)
  separated by a top border.
- **Nav item:** 32px tall, radius 6px, 10px gap, 15px icon column. Active = white fill, 1px
  `--line` border, `--ink` text at 600, `--accent` icon, plus a 1px shadow. Inactive = `--ink-2`
  text at 500, `--ink-3` icon; hover paints `rgba(255,255,255,0.55)`. Optional count badge
  (min-width 18px, 17px tall, radius 4px; ink fill + white text when active, `--fill-2` +
  `--ink-2` otherwise).
- **User nav:** Dashboard · Bookings (count = upcoming) · Meetings · Availability · Settings.
  **Admin nav:** Dashboard · Users · Bookings · Settings.
- **Header:** `--ground` background, bottom border, contents in the same 1120px centred column
  as the page body. Optional breadcrumb (link · chevron · current), the page title, optional
  subtitle, and right-aligned actions. Mobile collapses the sidebar into a horizontal scrolling
  rail above the content and hides the account row (log out moves to Settings → Account).

### App · Dashboard

No page title. The header instead carries the **greeting block**: Instrument Serif
`clamp(30, 3.4vw, 38)` "Good morning/afternoon/evening, Faisal." (switches on the real clock),
then a meta row — today's date and the current time in DM Mono, separated by a 3px dot, then an
`--accent-soft` pill "Next at 3:00 PM" (or "Next <day>" / "Nothing booked today"). The clock
re-renders every 30s. Header actions: "Copy link" (see below) — no "New meeting" here.

Body:
- Amber banner when the calendar is disconnected: "**Google Calendar isn't connected.** Meetrao
  can't check for conflicts or add bookings to your calendar." + a "Connect" button that opens
  the connect dialog.
- Metric strip: one bordered white card, `repeat(auto-fit, minmax(148px, 1fr))`, cells divided by
  `--line-soft` left borders. Upcoming · Today · Active meetings · Show-up rate (96%).
- **Today** section (heading + "N meetings"): rows with a 112px time column, guest name +
  "type · N min", a ghost "Details" button and an ink "Join" button with a video glyph.
- **Later this week** (heading + "View all" link): same rows but the left column stacks day
  label over time, and there is no Join.
- Empty state (dashed border, `--line-strong`): "No upcoming meetings / Your scheduled meetings
  will appear here." + a "Create meeting" button.

### App · Bookings

Tab row on a bottom border: Upcoming / Past, each with a count badge; active tab has a 2px
`--ink` underline (`margin-bottom: -1px`) and `--ink` text. Right-aligned 230px search field
("Search guest or email...") filtering on guest name + email.

Table (`min-width: 700px`): Guest (name 13.5/600 over email 12 `--ink-3`) · Meeting · Date ·
Time (`3:00 – 3:30 PM · 30m`, the duration in `--ink-3`) · Status badge · actions. Header row is
`--fill` with DM Mono uppercase labels. Rows divided by `--line-soft`, hover `--fill`.
Status badges: Confirmed = `--accent-soft`/`--accent-line`/`--accent` with a 5px dot;
Cancelled = the red equivalent. Actions: "Join" (only when not cancelled and not past) +
"Details". Empty states differ for search-miss vs. genuinely empty, and for Past vs. Upcoming.

### App · Meetings (meeting types)

Header actions: "Copy link" + an ink "New meeting" button.
Table (`min-width: 640px`): Meeting (name over a 2-line description, max 270px; the name drops
to `--ink-2` when inactive) · Duration · Booking link · Active · actions.
- Booking link is a clickable `--fill` chip in DM Mono (max 168px, ellipsis) with a copy glyph
  that becomes a check for 1800ms after copying.
- Active is a 34×20 switch: track `--accent` when on / `--fill-2` when off, 14px white thumb,
  140ms spring travel. Toggling fires a toast.
- Actions: "Preview" (opens the public booking page for that meeting) + "Edit".
- Footnote: "Inactive meetings stay in this list but can't be booked from your link."

### App · Create / edit meeting

`max-width: 600px`, breadcrumb "Meetings › New|Edit", three hairline-divided sections:
1. **Meeting details** — Name (required; invalid → red border + "Give the meeting a name guests
   will recognise."), Description, Duration chips.
2. **Location** — locked Google Meet row. Copy: "Every booking gets its own Google Meet link."
3. **Booking rules** — three selects in an auto-fit grid: Buffer between meetings (None/5/10/15
   minutes), Minimum notice (1/2/4/12/24 hours), Booking window (7/14/30/60 days ahead); then an
   "Active" row with a switch and the note "Guests can book this meeting from your link."

Footer: "Create meeting"/"Save changes" (spinner 700ms → returns to the list + toast) and a
ghost "Cancel". Saving is blocked while the name is empty.

### App · Availability

`max-width: 660px`. Top row: Timezone select + the note "Guests always see these hours converted
into their own timezone.", on a bottom border. Then one bordered white card with seven day rows
(`--line-soft` dividers; disabled days get a `--fill` background):
- 136px toggle button: 16px checkbox (radius 4px; `--accent` filled with a white check when on,
  white with `--line-strong` border when off) + day name.
- Enabled: one or more time ranges — two 110px selects with "to" between them and a 26px remove
  button (hover turns it red) — plus an "Add hours" link button in `--accent`.
- Disabled: the word "Unavailable" in `--ink-3`.
- Defaults: Mon 09:00–12:00 + 14:00–17:00; Tue–Thu 09:00–17:00; Fri 09:00–15:00; Sat/Sun off.
- Removing the last range on a day switches the day off.

Footer: "Save availability" (spinner 700ms) and a status label — "Unsaved changes" in `--ink-3`,
flipping to "All changes saved" in `--accent`. Any edit marks it dirty again.

### App · Settings

`160px + 1fr` grid, 34px gap, `max-width: 780px`, centred. Left is a sticky sub-nav: 30px rows
with a 2px left border that turns `--ink` when active (mobile: a horizontal chip row).
Four panels:
- **Profile** — 42px initials avatar + "Upload photo", then Name / Job title / Email / Username
  in an auto-fit grid; the username field shows the resulting link in DM Mono beneath it.
- **Calendar** — the Google Calendar row with a status badge and a Connect/Disconnect button
  (disconnecting warns via toast), plus the Timezone select.
- **Booking** — Default duration and Default minimum notice selects. Copy: "Applied to every new
  meeting you create."
- **Account** — a Password row ("Last changed 4 months ago." + "Change"), a red-soft
  **Delete account** panel ("Removes your booking page and cancels every upcoming meeting."),
  and a "Log out" button.

All Save buttons flip their label to "Saved" and fire a toast.

### Public · Booking page

`max-width: 940px`, a logo row above ("Booking page" in DM Mono, right-aligned), then a white
card, radius 12px, split `0.78fr / 1fr`:
- **Left aside** (`--fill`, right border, 30px): 38px initials avatar + host name and job title,
  the meeting name in Instrument Serif 31px, the description, and three glyph rows pushed to the
  bottom — duration, "Google Meet", and "Times shown in <timezone>".
- **Right** (30px): "SELECT A DATE" eyebrow with month nav (28px prev/next icon buttons, disabled
  at the range ends, 118px centred month label), a 7-column calendar with DM Mono day initials
  and 38px cells, then a legend (Today = `--accent` outline · Selected = `--accent` fill ·
  Available = `--line` outline). Cell states: empty (invisible), disabled (`--ink-3`, 45%
  opacity, not clickable — weekends and out-of-window days), open (white, `--line` border),
  today (`--accent` border + `--accent` text), selected (`--accent` fill, white).
  Below a divider: "AVAILABLE TIMES" + the selected date, then a
  `repeat(auto-fill, minmax(96px, 1fr))` grid of 38px slot buttons (selected = `--accent` fill).
  Slots: 09:00–11:30 and 14:00–16:30 on the half hour.
- **No-slots state:** dashed panel "No times on this day / Faisal is not taking bookings then.
  Try another date."
- **Race condition (built deliberately):** clicking the 11:30 AM slot simulates someone else
  booking it — the slot disappears, a red-soft notice appears ("That time was just booked by
  someone else. The list below is up to date."), and a toast fires. Selecting any other slot
  advances to the guest form.

### Public · Guest details

`max-width: 520px` white card, `padding: 30px`. Instrument Serif 28px "Confirm your details",
then a `--fill` summary box (meeting + duration, then the long date and time range). Fields:
Full name (required), Email (must contain `@`; helper "The confirmation and Meet link go here."),
optional Note. Invalid fields get a red border and an inline error with a warning glyph.
Primary "Schedule meeting" (42px, spinner 900ms) and a ghost "Back to times".

**Failure path (built deliberately):** confirming the 4:30 PM slot fails once — a red-soft panel
appears ("That time is no longer available / Someone booked it while you were filling this in.
Nothing has been scheduled.") with a "Pick another time" button, plus a toast. Any other slot
(or a retry) succeeds.

### Public · Confirmed

`max-width: 520px` card, animating in. A 32px `--accent` circle with a white check beside
Instrument Serif 30px "You're booked!", then "A confirmation is on its way to <email>. The invite
includes the Google Meet link." A `--fill` detail block (hairline-divided rows: Meeting, Host,
When, Duration, Where — the Meet URL in DM Mono). Then "Join Google Meet" (42px ink), a row with
"Add to Google Calendar" and ".ics", and the line "Need to change plans? Cancel this meeting."

### Public · Cancelled

`max-width: 460px` card. A red-soft circle with an × glyph, Instrument Serif 27px "Meeting
cancelled", the line "Your meeting with Faisal Rahman on <Month D> is cancelled. The calendar
event has been removed and the time is free again.", and a "Book another time" button.

### Admin (6)

- **Dashboard** — a four-cell metric strip (Total users 1,248 · Total bookings 4,832 · Upcoming
  142 · Meetings 86) and a "Recent activity" card: 16px glyph column, activity text, relative
  timestamp right-aligned.
- **Users** — a 280px search field (name/email/username), a right-aligned "N users" count, and a
  table (`min-width: 800px`): User (28px `--fill-2` initials chip + name over email) · Timezone ·
  Meetings (right) · Bookings (right) · Status badge (Active/Suspended) · Joined · "View".
  Empty state: "No users found / No account matches that name, email or username."
- **User detail** — breadcrumb, a header row (42px avatar, name, email, status badge, and a
  Suspend/Reactivate button — red when suspending), a Profile grid of six labelled cells (1px
  gaps over a `--line-soft` background), a Meetings list, and a Recent bookings list.
- **Bookings** — search + a 150px date filter (All dates / Upcoming / Past) + count, and a table
  (`min-width: 820px`): Host · Guest (name over email) · Meeting · Date · Time · Status · "View".
- **Booking detail** — `max-width: 620px`. Header: meeting name, status badge, and the reference
  ID in DM Mono right-aligned. Then four labelled groups (Host, Guest, Schedule, Google Meet) of
  key/value rows with a 92px key column; emails and the Meet URL are DM Mono. Footer: "Copy Meet link".
- **Settings** — Platform (App name, Support email) and Admin account (Name, Email) sections,
  then "Save changes" + "Log out".

---

## Dialogs (6)

All share one shell: a `rgba(26,25,23,0.34)` scrim (click-outside to dismiss), a white card
(radius 10px, `--pop` shadow, `mu-in` animation, `max-width` 400px or 460px for booking detail),
a header (title, optional subtitle, 26px close button) on a bottom border, a body, and a `--fill`
footer with a ghost secondary on the left of an emphasised primary. Escape closes.

| Dialog | Primary | Secondary | Body |
| --- | --- | --- | --- |
| Booking detail | Join Google Meet (accent) | Cancel meeting → cancel confirm | Guest, Email, When, Duration, Status, Meet — plus the guest's note in a `--fill` box when present |
| Cancel meeting | Cancel meeting (red) | Keep it → back to detail | "This cancels <meeting> with <guest>. They will be notified, the calendar event is removed, and the slot opens back up." |
| Connect Google Calendar | Allow access (accent) | Later | The two check reasons + "Meetrao never reads the contents of your events." |
| Change password | Update password (accent) | Cancel | Current password, New password (+ helper) |
| Delete account | Delete account (red) | Keep my account | "This removes your booking page, meetings and availability for good. Upcoming meetings will be cancelled and your guests notified. This cannot be undone." |
| Suspend account | Suspend user (red) | Keep active | "Suspending <name> blocks sign-in and stops new bookings. Existing bookings stay on their calendar." |

## Toasts

Bottom-right (`bottom: 58px; right: 18px`), max-width 320px, white, `--line` border, `--pop`
shadow, `mu-in` entrance, auto-dismiss after 3200ms, with a manual dismiss button. Four tones,
each with its own glyph and colour: ok (`\uf058`, `--accent`), bad (`\uf06a`, `--red`), warn
(`\uf071`, `--amber`), neutral (`\uf05a`, `--ink-3`). Title 13/600 over a 12.5 body.

Fired on: copy link, calendar connect/disconnect (and failure), meeting enable/disable, meeting
created/saved, availability saved, settings saved, password updated, account deleted, user
suspended/reactivated, booking cancelled, slot-taken and booking-failed, "Join" (stubbed), and
the password-reset email.

## The "Copy link" control

A single button when 0–1 meetings are active — one click copies `meetrao.com/faisal`, the label
flips to "Copied" with a check for 1800ms, and a toast fires.

When **more than one** meeting is active it becomes a dropdown (caret rotates 180°). The panel
(min-width 272px, radius 8px, `--pop`) lists "Copy a booking link" as a DM Mono eyebrow, then
"All meetings" (`meetrao.com/faisal`) followed by one row per active meeting with its own
`meetrao.com/faisal/<slug>` link in DM Mono. Each row shows a copy glyph that becomes a green
check once copied. Click-outside closes.

## MenuSelect (custom select)

Used for every dropdown in the product. Trigger: full width, 34px (or 28px in `sm`), white,
`--line-strong` border, radius 6px, 13.5px/500 label, chevron that rotates 180° when open;
open state gets an `--accent` border + `--ring`.

Panel: `min-width: 100%`, `width: max-content`, `max-width: 320px`, white, `--line` border,
radius 8px, `--pop` shadow, 120ms `mu-pop` entrance. Rows are 34px, radius 6px, 3px apart, with
the selected row on `--accent-soft` at 600 weight plus an `--accent` check.

Behaviour: opens downward by default but **flips upward** when there is not enough room (measured
against the nearest scrolling ancestor, with a configurable bottom inset); becomes **searchable**
automatically above 12 options (or on request), with a search field in the panel header; scrolls
the current value into view on open; closes on click-outside or Escape; opens on ArrowDown.

Props: `options` (strings or `{value,label}`), `value`, `onChange`, `placeholder`, `size`
(`sm`/`md`), `placement` (`auto`/`down`/`up`), `searchable`, `bottomInset`.

## Timezones

94 IANA zones, sorted by UTC offset, labelled `GMT±HH:MM  City` (offsets computed at runtime via
`Intl.DateTimeFormat` with `timeZoneName: 'shortOffset'`, so they follow DST). Default
`Asia/Dhaka`. Displayed as "Detected from your browser." — in production, actually detect it.

## Landing pages

Both use the product's tokens and type system. Every CTA links into the app.

**Desktop** (`max-width: 1160px`): sticky blurred nav (logo, Features/How it works/For guests,
Log in, "Get started") → centred hero (beta pill, Instrument Serif `clamp(46,7.4vw,92)`
headline "Stop asking 'what time works for you?'", sub-paragraph, two CTAs — "Create your free
account" (accent) and "See a live booking page" (white) — a reassurance line, then the booking-page
screenshot on a 12px-radius bordered card with a soft green radial glow behind it) → a `--fill`
proof strip of four DM Mono check items → three features in a 1px-gap grid (glyph tile, title,
body) → an availability split (copy + three checks | screenshot) → a full-bleed dashboard
screenshot with a "Live product" tag → three rule-topped numbered steps → a guest section with
capability chips and the confirmation screenshot → an `--accent` CTA band (radius 14px) → footer.

**Mobile** (`max-width: 440px` column): sticky top bar (logo, Log in, Sign up) → hero with two
full-width stacked 50px CTAs → proof list → stacked features → three screenshot sections
(availability with checks, dashboard, confirmation) in 20px-radius frames → numbered steps →
guest chips → CTA band → footer → **a sticky bottom action bar** ("Claim your link /
meetrao.com/you" + a "Get started" button). Every link target is ≥44px tall.

Copy is deliberately factual about what the product does — there are no invented customer logos,
testimonials or growth statistics. If marketing wants social proof, it needs real content.

---

## Interactions & behaviour

**Navigation.** Sidebar switches screens; breadcrumbs go back; the logo on auth/public screens
returns to the landing page. The prototype simulates deep links via URL hash
(`Meetrao.dc.html#signup`) — in production these are real routes. Suggested map:
`/login`, `/signup`, `/forgot`, `/onboarding/1…5`, `/`, `/bookings`, `/meetings`,
`/meetings/new`, `/meetings/:id/edit`, `/availability`, `/settings/:tab`,
`/:username`, `/:username/:slug`, `/booking/:id/confirmed`, `/booking/:id/cancelled`,
`/admin`, `/admin/users`, `/admin/users/:id`, `/admin/bookings`, `/admin/bookings/:id`, `/admin/settings`.

**Async simulation** (replace with real requests): auth 700ms · calendar connect 1200ms ·
save meeting / availability 700ms · guest booking 900ms. Each shows a spinner in its button and
disables nothing else — the button label also changes ("Saving…", "Scheduling…").

**Validation.** Meeting name required. Guest name required. Guest email must contain `@`.
Errors appear only after a submit attempt (`touched` semantics), as a red border plus inline
message with a warning glyph. Production needs proper email validation, length limits, and
server-side checks.

**Error states to implement for real.** Calendar OAuth failure; slot taken while browsing; slot
taken between form-fill and submit. All three are prototyped and all three are real race
conditions — the booking endpoint must re-check availability inside a transaction and return a
409 the UI can render.

**Responsive.** The prototype has an explicit Desktop/Mobile switch (mobile = a 412px frame).
Mobile changes: sidebar → horizontal rail (account row hidden), auth aside hidden, booking page
stacks, settings sub-nav → chip row, page padding tightens to 16px. Tables keep horizontal scroll
rather than collapsing into cards.

## State

Prototype state, as a guide to what the real app must track:

- **Session/route:** current screen, admin vs. user.
- **Calendar:** connected, connecting, failed, attempt count.
- **Profile:** name, job title, email, username, timezone.
- **Meeting types:** id, name, description, duration, slug, active — plus the edit form
  (name, description, duration, buffer, notice, window, active) and a `touched` flag.
- **Availability:** seven days each with `on` and an array of `{start, end}` ranges; a
  dirty/saved flag.
- **Bookings:** the list, plus `tab` (upcoming/past), a search query, and cancelled ids.
- **Public booking:** month, selected date, selected slot, taken slots, guest name/email/note,
  submitting, and two error flags.
- **Admin:** user search, booking search, date filter, selected user id, selected booking id,
  suspended and reactivated ids.
- **UI:** open dialog (+ subject id), toast (tone, title, text), copied-key, copy-menu open,
  and a clock ticking every 30s for the dashboard greeting.

**Data the backend must provide:** host profile and username; meeting types; weekly availability
+ timezone; bookings (both directions, with status and Meet URL); free/busy from Google Calendar;
admin aggregates and activity feed.

## Mock data

All content in the prototype is fabricated for demonstration: host "Faisal Rahman"
(`faisal@studioatlas.co`, username `faisal`), 5 bookings, 3 meeting types (30 Minute
Consultation / Project Deep Dive / Intro Call), 6 admin users, 6 admin bookings, 5 activity
entries, and metric figures. The public calendar is hard-coded to a September–October 2026 window
with weekends closed. None of it is real; replace all of it.

## Assets

- `assets/meetrao-logo.svg` — supplied by the user. The wordmark shipped as `fill="black"` and was
  remapped to `#1A1917` to match the ink token; the green mark is untouched. Use the SVG as-is.
- `assets/google-g.svg` — Google's "G" for the OAuth button. Google brand assets have their own
  usage terms; use the official asset from Google's identity guidelines in production.
- `assets/shot-*.png`, `assets/m-*.png` — screenshots of these very prototypes, used only on the
  landing pages. Regenerate them from the real app once it exists.
- **Icons:** Font Awesome 6 Sharp (Light 300 + Solid 900), referenced by codepoint. This is a
  licensed family — use your own licensed copy, or substitute an equivalent icon set and keep the
  weight convention (light for objects/navigation, solid for status/close/check).
- **Fonts:** DM Sans, DM Mono, Instrument Serif — all open-source (OFL), available from Google Fonts.

## Notes and open questions

1. **Location is Google Meet only.** The UI says so explicitly ("Only option in this release").
   Adding Zoom/phone/in-person later means the locked row becomes a select.
2. **Availability is one weekly schedule per account**, not per meeting type. Date overrides and
   holidays are not designed yet.
3. **No rescheduling flow.** Guests can cancel; they cannot move a booking. Worth confirming.
4. **No notification settings, no team/round-robin, no payments, no analytics.** Out of scope here.
5. **Admin actions are limited to view + suspend/reactivate.** No impersonation, refunds or edits.
6. **Show-up rate (96%)** on the dashboard has no defined source — either compute it or drop it.
7. **Accessibility:** `--ink-3` was darkened to `#66635C` specifically to clear 4.5:1 on all three
   backgrounds — do not lighten it. Keep the 3px focus ring (it is `:focus-visible` in spirit),
   the `role="switch"` + `aria-checked` on switches, `role="listbox"`/`role="option"` +
   `aria-selected` in MenuSelect, and the ≥44px touch targets on mobile.
