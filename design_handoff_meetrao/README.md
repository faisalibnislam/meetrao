# Meetrao — design spec

**Read `START-HERE.md` first.** It says how to apply this (an update to an existing project, not
a rebuild), what order to work in, what is new, and what decisions are still open. This file is
the spec: what every screen should look like and do once you are done.

## Overview

Meetrao is a scheduling product. A host connects their Google Calendar, defines one or more
bookable "meetings" (duration + rules), sets weekly availability, and shares a single link
(`meetrao.com/<username>`). Guests open that link, pick from times the host is genuinely free,
and get a confirmed booking with a Google Meet link. There is also an admin console for
platform operators, and a marketing site (desktop + mobile).

This bundle covers **25 product screens**, **7 dialogs**, **1 responsive landing page**, **4
standalone public pages** (Terms, Privacy, Help, Support) and **6 email templates**.

## About the design files

The files in this bundle are **design references created in HTML** — interactive prototypes that
show intended look and behaviour. They are **not production code to copy**.

The email templates are the exception — `emails/*.html` are real, send-ready HTML.

The rest are built on an internal HTML component runtime (`.dc.html` files with a template + a
logic class, loaded by `support.js`). That runtime is a design tool, not a shippable framework.

**The task is to bring the existing codebase up to this design** — in its own framework, its own
component library, and its own routing and state conventions. Update what is there; add only the
screens listed as new in `START-HERE.md`. Nothing here should be ported verbatim.

Where this spec and the existing implementation differ, this spec is the intent — but the
*mechanism* stays yours. If the codebase already has a Button, use it and restyle it; do not add a
second one because the prototype inlines its styles.

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
| `--fill` | `#F4F3EE` | Table headers, inert fields, row hover, aside panels. |
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
- Dropdown/dialog shadow (`--pop`): `0 1px 2px rgba(26,25,23,0.05), 0 16px 34px -12px rgba(26,25,23,0.24)`.
- Landing hero shadow: `0 1px 2px rgba(26,25,23,0.05), 0 30px 60px -24px rgba(26,25,23,0.34)`.

**Rule:** near-black `--ink` is for *text*; `--accent` green is for *primary actions and
selected state*. Destructive is always `--red`. Status colours never decorate.

### Typography

Three families, strictly divided by role:

| Family | Weights | Role |
| --- | --- | --- |
| **Instrument Sans** | 400, 500, 600, 700 | All product UI: labels, buttons, tables, body. Default `body` font. |
| **Instrument Serif** | 400 only | Display moments only: landing headlines, auth titles, onboarding titles, public booking page title, "You're booked!", and the dashboard greeting. |
| **DM Mono** | 400, 500 | Machine strings and micro-labels: booking URLs, Meet links, table column headers, metric labels, eyebrows, timestamps, reference IDs. |

Loaded from Google Fonts. Icons are **Font Awesome 6 Sharp**, loaded in the prototype from the
Meetrao design-system bundle (`_ds/…/tokens/fonts.css`) — see the licensing note in
`START-HERE.md`. Used at Light 300 for object/navigation glyphs and Solid
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
- **Header padding:** the dashboard header uses `46px 26px 16px` desktop / `44px 16px 14px`
  mobile (deliberate breathing room above the greeting). Every other screen's header uses
  `16px 26px` / `14px 16px`.
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
| `Meetrao App.dc.html` | The product: all 25 screens, 7 dialogs, toasts, prototype bar. |
| `Meetrao Landing.dc.html` | The marketing page. One responsive page — the earlier separate mobile version has been retired. |
| `MenuSelect.dc.html` | Custom select/dropdown component used throughout the product. |
| `CHANGELOG.md` | What has changed since the first handoff. Read this alongside the spec. |
| `Meetrao Support.dc.html` | Contact form. Asks name + email when signed out; uses the account identity when signed in. |
| `Meetrao Help.dc.html` | Help centre — nine sections plus an FAQ, explaining each part of the app. |
| `Meetrao Terms.dc.html` | Terms of Service. Own page, own URL. Sticky contents rail. |
| `Meetrao Privacy.dc.html` | Privacy Policy. Own page, own URL. Sticky contents rail. Four items need legal sign-off and one needs building (a cookie-consent banner) — all five flagged inline in amber, three on Terms and two here. |
| `Meetrao Emails.dc.html` | Gallery of the six email templates, with subjects, recipients, triggers and merge fields. |
| `emails/*.html` | **Send-ready** email templates. Real HTML, not prototypes — table-based, inline styles, under 10KB each. |
| `support.js` | The design-tool runtime. **Not for production.** |
| `assets/meetrao-logo.svg` | Logo (mark + wordmark, 576×127). Wordmark ink is `#1A1917`, mark green `#16554A`/`#268574`. |
| `assets/google-g.svg` | Google "G" for the OAuth button and the two Connect buttons. |
| `assets/favicon.png` | Favicon (512px), linked as `icon` and `apple-touch-icon`. |
| `assets/shot-*.png`, `assets/m-*.png` | **Unused.** Product screenshots from an earlier landing page. Every product visual is now live UI, so no page references these. Kept only for reference — safe to delete. |

---

## Screens

### Auth (4)

**Log in / Sign up / Forgot password / Verify email.** One two-column card, `max-width: 940px`, radius 12px.
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
- **Sign-up routes to the verify gate**, not onboarding. Google sign-up skips the gate (the
  address arrives verified) and goes to onboarding step 1. Log in routes to the dashboard, unless
  the account is unverified — then it bounces to the gate with a warn toast.
- The logo links back to the landing page.

### Auth · Verify email

The gate between sign-up and onboarding. A 470px white card, `padding: 32px`: a 38px
`--accent-soft` icon tile (envelope glyph), Instrument Serif 32px "Confirm your email", and the
line "We sent a verification link to **&lt;email&gt;**. Open it to activate your account — you can't
use Meetrao until you do." Then a `--fill` panel eyebrowed "WHILE YOU WAIT": "The link expires in
24 hours. If it isn't in your inbox, check your spam folder."

Actions: **I have confirmed my email** (42px accent, spinner → "Verifying…", 1100ms, then
onboarding + success toast); **Resend the email** (secondary, spinner → "Sending…", then a green
check and "Sent again"); **Use a different email** (ghost, back to sign-up). Below the card:
"Wrong account? Sign in as someone else."

In the prototype the confirm button stands in for clicking the emailed link. In production the
link itself verifies; this screen is what the user sees while waiting.

### Onboarding (5 steps)

Fixed top rail (`padding: 13px 22px`, bottom border) holding the logo and a **step tracker**:
"Step N / 5" in DM Mono, then five nodes connected by 2px lines. Completed nodes are
`--accent`-filled with a white check glyph (18px); the current node is 22px, `--accent`-filled,
white number, with a `0 0 0 3px var(--accent-soft)` halo and its name spelled out beside it
(Welcome / Calendar / Meeting / Hours / Ready); upcoming nodes are 18px, white, `--line-strong`
border, `--ink-3` number. Connector fills green up to the current step. On mobile the labels
hide and connectors shorten to 10px. At the right of the rail, after a 1px divider, an **account
button** (24px avatar + chevron) opens a menu showing the name and email, a **Log out** item, and
the line "Your progress is saved. You can finish setting up later."

Body: one white card, `max-width: 580px`, radius 12px, `padding: 34px`, containing an
Instrument Serif title (32px), a blurb, the step's content, then a divider with 20px of space
above the action row.

1. **Claim your link** — a 42px `meetrao.com/` prefix + mono input, sanitised to
   `[a-z0-9-]` as you type. Debounced 620ms availability check with seven states (checking,
   available, taken, too short, too long, bad characters, bad hyphens, reserved); border turns
   `--accent` or `--red` and a spinner/check/× sits at the trailing edge. When taken, three
   free suggestion chips derived from the entered name. A `--fill` rules panel beneath.
   CTA "Claim this link" is disabled at 45% opacity until a name is confirmed available.
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
  bottom **account menu button** separated by a top border — a 26px `--accent-soft` initials
  chip, name, email and a chevron that rotates 180° when open. It opens a menu *above* itself
  (radius 8px, `--pop`) with **Settings**, **Help centre**, **Support** and **Log out** (the last hairline-separated). Closes on
  click-outside.
- **Nav item:** 32px tall, radius 6px, 10px gap, 15px icon column. Active = white fill, 1px
  `--line` border, `--ink` text at 600, `--accent` icon, plus a 1px shadow. Inactive = `--ink-2`
  text at 500, `--ink-3` icon; hover paints `rgba(255,255,255,0.55)`. Optional count badge
  (min-width 18px, 17px tall, radius 4px; ink fill + white text when active, `--fill-2` +
  `--ink-2` otherwise).
- **User nav:** Dashboard · Bookings (count = upcoming) · Meetings · Availability. **Settings is
  not a nav row** — it lives in the account menu. **Admin nav:** Dashboard · Users · Bookings ·
  Settings (admin keeps its own row; it is a different screen).
- **Header:** `--ground` background, bottom border, contents in the same 1120px centred column
  as the page body. Optional breadcrumb (link · chevron · current), the page title, optional
  subtitle, and right-aligned actions. Mobile collapses the sidebar into a horizontal scrolling
  rail above the content and hides the account row (the account block moves into the hamburger drawer, which carries Settings, Help centre and Log out).

### App · Dashboard

No page title. The header instead carries the **greeting block**: Instrument Serif
`clamp(30, 3.4vw, 38)` "Good morning/afternoon/evening, Adam." (switches on the real clock),
then a meta row — today's date and the current time in DM Mono, separated by a 3px dot, then an
`--accent-soft` pill "Next at 3:00 PM" (or "Next <day>" / "Nothing booked today"). The clock
re-renders every 30s. Header actions: "Copy link" (see below) — no "New meeting" here.

Body:
- Amber banner when the calendar is disconnected: "**Google Calendar isn't connected.** Meetrao
  can't check for conflicts or add bookings to your calendar." + a "Connect" button that opens
  the connect dialog.
- Metric cards: four tinted cards in a `repeat(auto-fit, minmax(196px, 1fr))` grid, 12px gap.
  Each is `min-height: 118px`, `padding: 14px 15px`, radius 10px, with a tinted background and
  matching border, a 30px white icon tile, a 26px value in the card's own colour, a 12.5px/600
  label and an 11.5px `--ink-3` note. **Upcoming** (green, tagged "N today") · **Next meeting**
  (slate, start time + "with <guest>") · **Active meetings** (neutral, "2 of 3") ·
  **Avg. reply time** (amber, "1.4 hrs / From link opened to booked").
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
Five panels:
- **Profile** — 42px initials avatar + "Upload photo", then Name / Job title / Email / Username
  in an auto-fit grid; the username field shows the resulting link in DM Mono beneath it.
- **Calendar** — subtitle "Meetrao checks this calendar for conflicts, then writes each booking to
  it and invites your guest." The Google Calendar row with a status badge and a Connect/Disconnect button
  (disconnecting warns via toast), plus the Timezone select.
- **Booking** — Default duration and Default minimum notice selects. Copy: "Applied to every new
  meeting you create."
- **Notifications** — five switch rows in a bordered card: **New booking** ("When someone books
  a time with you."), **Booking changed** ("When a booking is rescheduled or edited."),
  **Booking cancelled** ("When you or your guest cancels.") — all on by default — plus
  **Daily agenda** ("One email each morning listing the day's meetings.") and **Product news**
  ("Occasional updates about new Meetrao features."), both off. Footnote: "Turning everything off
  does not stop the emails your guests receive, or password and security emails."
- **Account** — an **Email address** row (address in DM Mono + a Verified/Unverified badge), a
  Password row ("Last changed 4 months ago." + "Change"), a red-soft
  **Delete account** panel ("Removes your booking page and cancels every upcoming meeting."),
  and a "Log out" button.

All Save buttons show a spinner for 700ms, flip their label "Save changes" → "Saving…" → "Saved",
and fire a toast.

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
- **No-slots state:** dashed panel "No times on this day / Adam is not taking bookings then.
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
When, Duration, Where — the Meet URL in DM Mono). Then "Join Google Meet" (42px accent), a green `--accent-soft` panel — "This is already on your
calendar. We sent an invitation to &lt;email&gt; with the Meet link attached." — a single
"Download .ics instead" button for non-Google calendars, and the line "Need to change plans?
Cancel this meeting."

### Public · Cancelled

`max-width: 460px` card. A red-soft circle with an × glyph, Instrument Serif 27px "Meeting
cancelled", the line "Your meeting with Adam Voigt on <Month D> is cancelled. The calendar
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
  Suspend/Reactivate button — red when suspending), then a red-soft **Remove this account** panel
  ("Deletes &lt;name&gt; and everything they own. They would have to sign up again from scratch." +
  a red "Remove account" button), a Profile grid of six labelled cells (1px gaps over a
  `--line-soft` background), a Meetings list, and a Recent bookings list.
  Suspension is reversible; removal is not — they are deliberately separate actions.
- **Bookings** — search + a 150px date filter (All dates / Upcoming / Past) + count, and a table
  (`min-width: 820px`): Host · Guest (name over email) · Meeting · Date · Time · Status · "View".
- **Booking detail** — `max-width: 620px`. Header: meeting name, status badge, and the reference
  ID in DM Mono right-aligned. Then four labelled groups (Host, Guest, Schedule, Google Meet) of
  key/value rows with a 92px key column; emails and the Meet URL are DM Mono. Footer: "Copy Meet link".
- **Settings** — Platform (App name, Support email) and Admin account (Name, Email) sections,
  then "Save changes" + "Log out".

---

## Dialogs (7)

All share one shell: a `rgba(26,25,23,0.34)` scrim (click-outside to dismiss), a white card
(radius 10px, `--pop` shadow, `mu-in` animation, `max-width` 400px or 460px for booking detail),
a header (title, optional subtitle, 26px close button) on a bottom border, a body, and a `--fill`
footer with a ghost secondary on the left of an emphasised primary. Escape closes.

| Dialog | Primary | Secondary | Body |
| --- | --- | --- | --- |
| Booking detail | Join Google Meet (accent) | Cancel meeting → cancel confirm | Guest, Email, When, Duration, Status, Meet, Calendar ("On your calendar and <guest>'s") — plus the guest's note in a `--fill` box when present |
| Cancel meeting | Cancel meeting (red) | Keep it → back to detail | "This cancels <meeting> with <guest>. They will be notified, the calendar event is removed, and the slot opens back up." |
| Connect Google Calendar | Allow access (accent) | Later | The three check reasons + "Meetrao never reads the contents of your events. Your guest is added as an attendee on the bookings you accept, which is how the event reaches their calendar." |
| Change password | Update password (accent) | Cancel | Current password, New password (+ helper) |
| Delete account | Delete account (red) | Keep my account | "This removes your booking page, meetings and availability for good. Upcoming meetings will be cancelled and your guests notified. This cannot be undone." |
| Suspend account | Suspend user (red) | Keep active | "Suspending <name> blocks sign-in and stops new bookings. Existing bookings stay on their calendar." |
| Remove account (admin) | Remove account (red, spinner → "Removing…") | Keep account | "This permanently deletes <name> — their profile, booking link, meetings, availability and booking history. Upcoming meetings are cancelled and their guests notified. <First> would have to sign up again from scratch. This cannot be undone." |

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

A single button when 0–1 meetings are active — one click copies `meetrao.com/adam`, the label
flips to "Copied" with a check for 1800ms, and a toast fires.

When **more than one** meeting is active it becomes a dropdown (caret rotates 180°). The panel
(min-width 272px, radius 8px, `--pop`) lists "Copy a booking link" as a DM Mono eyebrow, then
"All meetings" (`meetrao.com/adam`) followed by one row per active meeting with its own
`meetrao.com/adam/<slug>` link in DM Mono. Each row shows a copy glyph that becomes a green
check once copied. Click-outside closes.

## MenuSelect (custom select)

Used for every dropdown in the product. Trigger: full width, 34px (or 28px in `sm`), white,
`--line-strong` border, radius 6px, 13.5px/500 label, chevron that rotates 180° when open;
open state gets an `--accent` border + `--ring`.

Panel: `min-width: 100%`, `width: max-content`, `max-width: 320px`, white, `--line` border,
radius 8px, `--pop` shadow, 8px padding, 120ms `mu-pop` entrance. Rows are 38px tall with
`0 12px` padding, radius 6px, 6px apart, the selected row on `--accent-soft` at 600 weight plus
an `--accent` check.

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

## Email templates

Six send-ready HTML emails in `emails/`. Unlike everything else in this bundle these are **real
implementation files** — drop them into your transactional provider. Review them side by side in
`Meetrao Emails.dc.html`, which lists each one's subject, recipient, trigger and merge fields.

| File | Trigger | To | Honours prefs? |
| --- | --- | --- | --- |
| `verify-email.html` | Email sign-up | New signup | No — transactional |
| `welcome.html` | Email confirmed, or Google sign-up | Host | Yes |
| `booking-new-host.html` | Guest confirms a slot | Host | Yes — "New booking" |
| `booking-new-guest.html` | Same event | Guest | No — transactional |
| `booking-changed.html` | Time/duration/meeting changed | Both | Host: "Booking changed" |
| `booking-cancelled.html` | Cancelled by either party | Both | Host: "Booking cancelled" |

**Construction.** One centred 600px table, single column, every style inlined on its element.
The only rules in `<head>` are a mobile media query and an Outlook font conditional — each email
reads correctly with the `<style>` block stripped. Buttons are bulletproof padded `<td>`s with
`bgcolor` and a block-level `<a>`. Explicit widths on every table and cell;
`mso-line-height-rule: exactly` on every text run. All six are under 10KB (Gmail clips near 100KB).

**Type.** Email-safe stacks only: **Georgia** stands in for Instrument Serif on display lines,
**Arial** for Instrument Sans, **Courier New** for DM Mono. No web fonts — mail clients strip
`@font-face`, and the fallback would then decide the layout.

**Colour.** The product palette, on `--ground` with white cards. Booking emails open with a
status ribbon across the top of the card: green `--accent-soft` for confirmed, amber
`--amber-soft` for rescheduled, red `--red-soft` for cancelled. Details sit in a bordered
key/value table; rescheduled and cancelled emails strike through the superseded time.
`<meta name="color-scheme" content="light dark">` is set and no pure black or white fills are
used, so dark-mode inversion stays legible.

**The logo is drawn in type** — a green rounded square containing "M", plus the wordmark in bold
Arial — because a project-hosted SVG will not resolve for recipients. Swap in a hosted https PNG
before sending; the cell is sized for a 22px square.

**Every file** opens with a hidden ~85-character preheader that previews beside the subject line
(update it when the subject changes), and closes with a postal address, a link to notification
settings and an unsubscribe link. Verification, guest confirmations and password emails are
transactional and must ignore unsubscribe.

## Calendar behaviour

**One event, both calendars — this is the default and there is no setting to turn it off.**

On confirmation Meetrao creates a single Google Calendar event on the host's calendar and adds
the guest as an **attendee**, with `sendUpdates: 'all'` so Google issues the invitation. The
meeting name, description and Google Meet link therefore appear on both calendars. Reschedules
and cancellations **patch or delete that same event**, so both sides stay in step and guests do
not accumulate stale invitations.

Guests who do not use Google Calendar still receive the invitation by email, and the
"Download .ics instead" button on the confirmation screen is their fallback.

Five consequences the backend has to answer for — none of them are designed yet:

1. **Both parties see each other's email address** on the event. Inherent to a Google attendee
   invitation, and disclosed in the privacy policy. Confirm it is acceptable.
2. **RSVP responses arrive on the host's event.** Nothing in the UI surfaces accepted / declined /
   tentative. Decide whether to show it.
3. **A guest declining in Google does not cancel the Meetrao booking.** Decide whether a decline
   cancels, notifies, or is ignored.
4. **The calendar scope is now write-with-attendees**, which is a broader OAuth consent screen
   than read-only free/busy. Expect a higher drop-off at the Google permission step.
5. If the event creation succeeds but the invitation fails, the booking is still real. Decide what
   the host sees.

## Responsive behaviour

Audited across every page. Three mechanisms, deliberately separated — **one behaviour, one
mechanism**, so nothing is fought over by two systems:

**1. Fluid by default.** Grids are `repeat(auto-fit, minmax(…, 1fr))`, action rows `flex-wrap`,
type uses `clamp()`. Most of the reflow needs no breakpoint at all. Where a track floor could
exceed a phone the floor itself is capped — e.g. the email gallery is
`minmax(min(600px, 100%), 1fr)`, which cannot overflow a 375px screen.

**2. JS viewport state**, where the layout *structure* changes:
- **The app** tracks `matchMedia('(max-width: 820px)')`. Below that it switches to the mobile
  shell: sidebar → horizontal rail, auth aside hidden, booking page stacked, settings sub-nav →
  chip row, tighter page padding. The prototype bar's **Auto / Desktop / Mobile** control pins the
  layout for review; **Auto is the default**, so a real phone gets the mobile shell with nobody
  toggling anything. The 412px device frame appears **only** when pinned to Mobile — it is a
  review affordance, and on a narrow real window it would be wider than the viewport.
- **The landing page** keeps its own `s.vw` in state; the walkthrough strip stacks below 1000px
  from that. Do not add a CSS rule for the strip — the JS already owns it.

**3. CSS media queries**, for presentational breakpoints only (they paint immediately, where a
JS-driven style hole would not):

| Page | Breakpoint | What changes |
| --- | --- | --- |
| Landing | 860px | Hero headline drops `nowrap` and re-clamps to `clamp(34px, 8.2vw, 52px)`. Held on one line it is either unreadable or wider than the screen. |
| Landing, Help, Support, Terms, Privacy | 720px | The nav's four section links hide. Four links plus Log in plus the CTA cannot share a 375px row; every destination is also in the footer. |
| Landing, Help, Support, Terms, Privacy | 700px | Footer link columns stack. The first track has a 240px floor which, beside a 140px sibling, exceeds a phone. |
| Landing | 560px | Section and footer gutters 26px → 18px. |
| Help, Terms, Privacy | 880px | The sticky contents rail goes `position: static`, full width, and its list reverts to a wrapping chip row. |
| App | 820px | Table row actions grow to a 36px minimum height for touch. |

**Two gotchas that cost real time here** — both worth knowing before you re-implement:

- Every property those rules override is set **inline** on the element, so each declaration needs
  `!important` or it silently loses the cascade. A rule can exist, be syntactically valid, match
  its selector, and still do nothing. In a real stylesheet this disappears; while the design is
  inline-styled, it does not.
- The sticky rails are `box-sizing: border-box` with `max-height: calc(100vh - 120px)`. The budget
  must cover the sticky offset **and** the element's own padding and border, or the rail hangs off
  the bottom of the viewport at every screen height.

**Tables.** In the app they scroll: each sits in an `overflow-x: auto` wrapper inside its bordered
card with a `min-width` of 640–820px. Verified at 412px — the frame does not overflow and all wide
children are contained by their scroller. **On the landing page the two live tables now have real
phone layouts**: below 640px each is replaced by a card list (see the CHANGELOG entry). Do the same
for the app's tables in production — a horizontally scrolled table is usable but not good, and the
landing page shows the pattern to copy.

**Touch targets.** All nav, form and CTA controls are ≥36px, and the mobile-specific ones ≥44px.
The 26–30px control scale used inside table rows is right for a mouse; the 820px rule lifts those
to 36px. The 34×20px switch keeps its size — expanding its hit area needs a wrapper, which is
worth doing in the real build.

**Type floor: 10px, no exceptions for text.** Verified zero text below it on all eight files. Font
Awesome glyphs at 8–9px are icons, not text, and are fine.

**Reduced motion.** Every page now carries a `prefers-reduced-motion` guard that zeroes
animations, transitions and smooth scrolling.

## Interactions & behaviour

**Navigation.** Sidebar switches screens; breadcrumbs go back; the logo on auth/public screens
returns to the landing page. The prototype simulates deep links via URL hash
(`Meetrao App.dc.html#signup`) — in production these are real routes. Suggested map:
`/login`, `/signup`, `/forgot`, `/verify/:token`, `/onboarding/1…5`, `/`, `/bookings`, `/meetings`,
`/meetings/new`, `/meetings/:id/edit`, `/availability`, `/settings/:tab` (profile · calendar · booking · notifications · account),
`/:username`, `/:username/:slug`, `/booking/:id/confirmed`, `/booking/:id/cancelled`,
`/admin`, `/admin/users`, `/admin/users/:id`, `/admin/bookings`, `/admin/bookings/:id`, `/admin/settings`,
`/terms`, `/privacy`, `/help`, `/support`.

**Async simulation** (replace with real requests): auth 700ms · calendar connect 1200ms ·
save meeting / availability / settings 700ms · guest booking 900ms · resend verification 900ms ·
verify 1100ms · remove/delete account 900ms. Each shows a spinner in its button and
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
- **Profile:** name, job title, email, username (plus the saved username, so a pending change can be compared and reverted), timezone.
- **Username check:** per-field status (empty/short/long/chars/hyphen/reserved/checking/ok/taken) and a debounce timer per surface.
- **Meeting types:** id, name, description, duration, slug, active — plus the edit form
  (name, description, duration, buffer, notice, window, active) and a `touched` flag.
- **Availability:** seven days each with `on` and an array of `{start, end}` ranges; a
  dirty/saved flag.
- **Bookings:** the list, plus `tab` (upcoming/past), a search query, and cancelled ids.
- **Public booking:** month, selected date, selected slot, taken slots, guest name/email/note,
  submitting, and two error flags.
- **Admin:** user search, booking search, date filter, selected user id, selected booking id,
  suspended ids, reactivated ids, deleted ids, and a `removing` flag.
- **Verification:** verified, verifying, resending, resend count, pending email.
- **Notification prefs:** five booleans (bookingNew, bookingChanged, bookingCancelled,
  dailyAgenda, productNews).
- **UI:** open dialog (+ subject id), toast (tone, title, text), copied-key, copy-menu open,
  account-menu open, and a clock ticking every 30s for the dashboard greeting.

**Data the backend must provide:** host profile and username; `verified_at`; five notification
booleans; meeting types; weekly availability + timezone; bookings (both directions, with status
and Meet URL); free/busy from Google Calendar; admin aggregates and activity feed.

## Mock data

All content in the prototype is fabricated for demonstration: host "Adam Voigt"
(`adam@studioatlas.co`, username `adam`), 5 bookings, 3 meeting types (30 Minute
Consultation / Project Deep Dive / Intro Call), 6 admin users, 6 admin bookings, 5 activity
entries, and metric figures. The public calendar is hard-coded to a September–October 2026 window
with weekends closed. None of it is real; replace all of it.

## Assets

- `assets/meetrao-logo.svg` — supplied by the user. The wordmark shipped as `fill="black"` and was
  remapped to `#1A1917` to match the ink token; the green mark is untouched. Use the SVG as-is.
- `assets/google-g.svg` — Google's "G" for the OAuth button. Google brand assets have their own
  usage terms; use the official asset from Google's identity guidelines in production.
- `assets/shot-*.png`, `assets/m-*.png` — **no longer referenced by any page.** The landing page's
  product visuals are all live UI now, so these are leftovers from an earlier version and can be
  deleted. What the landing page *does* need is real photography for its ten `<image-slot>`
  placeholders (host avatars, the message thread, and six use-case panels).
- **Icons:** Font Awesome 6 Sharp (Light 300 + Solid 900), referenced by codepoint. This is a
  licensed family — use your own licensed copy, or substitute an equivalent icon set and keep the
  weight convention (light for objects/navigation, solid for status/close/check).
- **Fonts:** Instrument Sans, DM Mono, Instrument Serif — all open-source (OFL), available from
  Google Fonts.

## Notes and open questions

1. **Location is Google Meet only.** The UI says so explicitly ("Only option in this release").
   Adding Zoom/phone/in-person later means the locked row becomes a select.
2. **Availability is one weekly schedule per account**, not per meeting type. Date overrides and
   holidays are not designed yet.
3. **No rescheduling flow in the UI**, but `booking-changed.html` exists for it — so either build
   reschedule, or hold that template until you do. Guests can currently only cancel.
4. **No notification settings, no team/round-robin, no payments, no analytics.** Out of scope here.
5. **Admin actions are view, suspend/reactivate and remove.** No impersonation, refunds or edits.
   Two things to settle on removal: whether a GDPR-style data export is offered first, and whether
   the freed username becomes immediately re-registrable.
6. **Avg. reply time** on the dashboard needs telemetry that does not exist yet — it measures
   booking-page-opened → booked, so the booking page has to record views. Build it or drop the card.
   (It replaced an unsourced "96% show-up rate".)
7. **Accessibility:** `--ink-3` was darkened to `#66635C` specifically to clear 4.5:1 on all three
   backgrounds — do not lighten it. Keep the 3px focus ring (it is `:focus-visible` in spirit),
   the `role="switch"` + `aria-checked` on switches (the five notification rows included),
   `aria-expanded` on the account and copy-link menu triggers, `label for`/`id` on the two
   booking-link inputs with `role="status" aria-live="polite"` on their availability notes and a
   real `disabled` on the gated onboarding CTA, `role="listbox"`/`role="option"` +
   `aria-selected` in MenuSelect, and the ≥44px touch targets on mobile.
