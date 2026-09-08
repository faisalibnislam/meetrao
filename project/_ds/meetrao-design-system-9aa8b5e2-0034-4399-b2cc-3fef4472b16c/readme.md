# Meetrao Design System

Meetrao is a scheduling product. A host connects their Google Calendar, defines one or more
bookable "meetings" (a name, a duration, a few rules), sets weekly availability, and shares a
single link — `meetrao.com/<username>`. Guests open that link, pick from times the host is
genuinely free, and get a confirmed booking with a Google Meet link. There is also an admin
console for platform operators, and a marketing site (desktop and mobile).

The product's whole argument is in its hero line: **"Stop asking 'what time works for you?'"**
Everything in this design system serves that — a warm, paper-like interface that reads as a
calm utility rather than a SaaS dashboard.

## Surfaces this system covers

| Surface | What it is |
| --- | --- |
| **Scheduling app** | 24 screens: auth (3), onboarding (5 steps), dashboard, bookings, meetings, create/edit meeting, availability, settings (4 panels), and 6 admin screens. |
| **Public booking flow** | The pages a guest sees: booking page, guest details, confirmed, cancelled. No account required. |
| **Marketing site** | Desktop and mobile landing pages, built from the product's own tokens and screenshots. |

## Sources

Everything here was read from a design-handoff bundle in another Claude Design project —
`Meetrao.dc.html` (the full product prototype), `Meetrao Landing.dc.html`,
`Meetrao Landing Mobile.dc.html`, `MenuSelect.dc.html` and a 574-line
`design_handoff_meetrao/README.md` written for developers.

- Source project: `https://claude.ai/design/p/f49d94ef-f4a9-47fa-a7ec-720fcd37e0ec` (file `Meetrao.dc.html`)
- Brand inputs the source itself credits to the user: `Meetrao Logo.svg`, `Favicon-meetrao.png`,
  Google's `G` mark, plus written briefs (`MeetUp - Complete UI-UX Redesign Brief.md`,
  `MeetUp - MVP Build Prompt.md`, `MeetUp - Simple MVP Admin Panel Prompt.md`).
- Font Awesome 6 Sharp binaries came with that source (via an internal design-system bundle).
- No Figma file, no production codebase, and no live URL were provided. **Every value in this
  system was lifted from the prototype source, not from a screenshot.** Where the prototype and
  its handoff README disagreed (a handful of values had been revised in the prototype after the
  README was written), the prototype won: `--fill` is `#F4F3EE`, `--pop` is
  `0 1px 2px rgba(26,25,23,0.05), 0 16px 34px -12px rgba(26,25,23,0.24)`, and the dashboard
  metric strip is four tinted cards rather than one divided card.

---

## Content fundamentals

**Voice: a competent colleague explaining what the software just did.** Meetrao writes in plain,
declarative sentences that name a mechanism. It never sells inside the product and never
performs enthusiasm.

- **Second person, present tense.** "Guests see this on your booking page." "When people can
  book you." The product addresses *you*; it does not speak as "we" except where a system act
  needs an actor ("we'll send a link to set a new password").
- **Sentence case everywhere.** Buttons, titles, labels, table headers (which are uppercased by
  CSS, not by the copy). Never Title Case, never ALL CAPS in the source string.
- **Say the mechanism, then the consequence.** "Meetrao reads your Google Calendar so guests are
  never offered a time you already have something in." Not "Never double-book again!"
- **Full stops on sentences, none on labels.** Helper lines and body copy end in a period;
  buttons, field labels, eyebrows and badges do not.
- **British-leaning spelling** in a few places ("recognise", "cancelled"), inherited from the
  source. Keep it consistent within a screen.
- **Errors state the fact and the cost, and never blame the user.** "That time is no longer
  available / Someone booked it while you were filling this in. Nothing has been scheduled."
  The reassurance ("Nothing has been scheduled") is the important half.
- **Empty states are two lines: what is not here, and what will be.** "No upcoming meetings /
  Your scheduled meetings will appear here." A search miss gets different copy from a genuinely
  empty list.
- **Toasts are 2–3 word titles plus one detail line.** "Meeting saved / 30 Minute Consultation".
- **Destructive copy is specific and complete.** "This removes your booking page, meetings and
  availability for good. Upcoming meetings will be cancelled and your guests notified. This
  cannot be undone." The safe way out is labelled with what it preserves: "Keep it",
  "Keep my account", "Keep active".
- **Limits are stated in the UI, not hidden.** The locked location row reads "Google Meet" with
  "Only option in this release" to its right.
- **Numbers are written out in prose when they are prose** ("Ninety-four timezones, searchable,
  correct through DST"), and rendered as digits when they are data.
- **No emoji. No exclamation marks**, with exactly one intentional exception: "You're booked!"
  on the guest confirmation.
- **Marketing copy is factual about what the product does.** There are no invented customer
  logos, testimonials or growth statistics anywhere on the landing pages — the proof strip lists
  capabilities ("No double bookings", "Google Meet on every booking"), not claims. If social
  proof is wanted, it needs real content.

Sample lines, verbatim from the product:

> Share one link. Guests pick a time that is genuinely free.
> Guests always see these hours converted into their own timezone.
> Inactive meetings stay in this list but can't be booked from your link.
> Faisal is not taking bookings then. Try another date.
> Three steps, then never again.

---

## Visual foundations

**The overall impression: warm paper, near-black ink, one deep green.** Meetrao looks like a
well-set document rather than an app chrome. There are no gradients (one exception, below), no
photography, no illustration, no decorative colour.

### Colour

A warm greige page (`#E7E4DC`) with white cards on top and two inert fills between them.
Text is near-black `#1A1917` with two muted steps. The single accent is a deep, desaturated
green `#14554A` — a colour that reads as institutional rather than techy.

The governing rule: **near-black is for text, green is for primary actions and selected state,
red is for destruction, amber only warns. Status colour never decorates.** There is no blue in
the system at all, other than one slate tint (`#2F4C63`) used exclusively for the second
dashboard metric card. Never introduce a purple, a violet gradient, or a second accent.

Contrast is deliberate: `--ink-3` was darkened to `#66635C` specifically so it clears 4.5:1 on
ground, surface and fill alike. Do not lighten it.

### Type

Three families, strictly divided by role — the division is the identity:

- **DM Sans** — all product UI. 400/500/600/700. Default `body` font.
- **Instrument Serif** (400 only) — display moments *only*: landing headlines, auth titles,
  onboarding titles, the public booking page title, "You're booked!", and the dashboard greeting.
  Never a section heading, never body copy.
- **DM Mono** (400/500) — machine strings and micro-labels: booking URLs, Meet links, table
  column headers, metric labels, eyebrows, timestamps, reference IDs.

Product sizes sit in a narrow band (10–19px) with half-pixel steps (13.5, 12.5, 11.5) — the
scale is finer than a 4px grid and should be copied exactly. Display type is fluid
(`clamp(44px,6.4vw,82px)` for the hero) with tight tracking (−0.022em) and line-height 1.
Body copy carries `text-wrap: pretty`; big headlines carry `text-wrap: balance`.
Tabular numerals are on body-wide (`font-variant-numeric: tabular-nums`) so times align in tables.

### Backgrounds and imagery

No background images, no patterns, no textures, no grain. Sections are separated by flat colour
bands (`--fill`) fenced with hairline top and bottom borders. The only "image" content anywhere
is **screenshots of the product itself**, presented in bordered frames at 12px radius (20px on
mobile) — full-bleed within their container, never cropped artfully or angled. Their colour vibe
is the product's own: warm, light, low-saturation.

The single gradient in the system is a soft green radial glow behind the landing hero
screenshot: `--accent` at 11% opacity, `blur(90px)`, elliptical. It is atmosphere behind an
edge, not a surface fill. No gradient ever sits under text or inside a component.

### Borders, shadows, radii

**Borders do the work shadows usually do.** In-page cards are white with a 1px `--line` border
and no shadow at all. Elevation is reserved for things that float: dropdowns, dialogs and toasts
share `--pop`; the landing hero frame gets the deeper `--shadow-hero`; an active sidebar item
gets a barely-there `0 1px 1px rgba(26,25,23,0.03)`.

Radii climb with the size of the thing: 4px badges · 5px row-action buttons and menu rows ·
6px buttons, inputs, nav items, calendar cells and slots · 7px landing CTAs · 8px cards, panels,
dialogs, icon tiles · 10px metric cards and guest tiles · 12px page-level surfaces and screenshot
frames · 14px the CTA band · 16px the hero frame · 20px mobile screenshot frames · 50% avatars,
dots and the switch thumb. Dashed `--line-strong` borders mark empty states, and nothing else.

### Transparency and blur

Used in exactly three places: the sticky landing nav (`rgba(231,228,220,0.88)` +
`backdrop-filter: blur(12px)`), the prototype bar (`rgba(255,255,255,0.94)` + `blur(10px)`), and
the dialog scrim (`rgba(26,25,23,0.34)`, no blur). Sidebar hover uses translucent white
(`rgba(255,255,255,0.55)`) over the greige sidebar. There are no frosted cards, no glassmorphism,
and no "protection gradient" over imagery — because there is no imagery to protect text from.

### Motion

Short, and mostly just colour. 120–140ms `ease` on background, border, colour and box-shadow.
Things that appear use `mu-in` — 160ms opacity plus a 5px rise (dialogs, toasts, popovers);
dropdown panels use a 120ms 3px `mu-pop`. Landing entrances use 460–500ms
`cubic-bezier(.22,1,.36,1)` with a 10px rise. The only springy thing in the product is the switch
thumb (140ms `cubic-bezier(.3,1.2,.6,1)`). The button spinner is 700ms linear, infinite.
Everything is wrapped in `prefers-reduced-motion: reduce`, which zeroes it. Nothing scales,
nothing bounces on entry, nothing parallaxes.

### Hover, press, focus, disabled

- **Hover** is a one-step change, never a lift (except the landing guest tiles, which rise 2px
  and take an `--accent-line` border): primary → `--accent-2`; danger → `#7F221A`;
  secondary → `--fill`; ghost → `--fill-2` plus ink text; table and list rows → `--fill`;
  sidebar items → translucent white; icon buttons → `--fill-2`, or `--red` when the action deletes.
- **Press** — there is no press state. No shrink, no darken, no shadow change.
- **Focus** is the 3px ring `rgba(26,25,23,0.12)`; text inputs additionally take an `--accent`
  border. Every interactive element keeps it.
- **Disabled** drops to 45–55% opacity with `cursor: not-allowed`; disabled calendar cells lose
  their border entirely.

### Layout rules

Content lives in a centred 1120px column in the app (1160px on the landing pages), with page
padding `24px 26px 90px` on desktop and `18px 16px 90px` on mobile. Narrow forms centre at
520–780px. The sidebar is a fixed 218px, `#EFEDE7`, with a `--line` right border; the header is
`--ground` with a bottom border and the same centred column as the body — and the dashboard
header keeps a deliberately tall `46px` top padding as breathing room above the greeting.

Sibling groups are always flex/grid + `gap`, never margins between items. Tables scroll
horizontally inside their bordered card (`min-width` 640–820px per table) rather than reflowing
or collapsing into cards. Everything else is fluid: `max-width` not `width`,
`repeat(auto-fit, minmax(…, 1fr))` grids, `flex-wrap` on action rows. Mobile is a 412px frame:
the sidebar becomes a horizontally scrolling rail, the auth aside disappears, the booking page
stacks, the settings rail becomes a chip row, and every touch target is at least 44px.

---

## Iconography

**One icon system: Font Awesome 6 Sharp**, referenced by codepoint, at 8–18px.

- **Light 300** for objects and navigation — calendar `\uf133`, clock `\uf017`, video `\uf03d`,
  list `\uf03a`, gear `\uf013`, home `\uf015`, users `\uf0c0`, search `\uf002`, copy `\uf0c5`,
  globe `\uf0ac`, sliders `\uf1de`, bolt `\uf0e7`.
- **Solid 900** for status, check and close — check `\uf00c`, circle-check `\uf058`,
  error `\uf06a`, warning `\uf071`, circle-xmark `\uf057`, circle-info `\uf05a`, xmark `\uf00d`.

Glyphs are monochrome and inherit their colour: `--ink-3` at rest, `--accent` when active or
affirming, `--red`/`--amber` for their own semantics. Where an icon needs to align in a column
(sidebar nav, the booking aside) it gets a fixed 15px box. Icon *tiles* — a glyph centred in a
28–34px rounded square on `--accent-soft` or `--surface` — appear in metric cards, landing
features and guest tiles.

`assets/fonts/FontAwesome6Sharp-{Light,Regular,Solid}.otf` are included here because they
shipped with the design source. **Font Awesome 6 Sharp is a licensed family** — use your own
licensed copy in production, or substitute an equivalent set and keep the weight convention
(light for objects, solid for status). The `Icon` component's `MEETRAO_GLYPHS` map is the
canonical name → codepoint list.

**No emoji, anywhere.** No unicode characters used as icons, with one exception: `+` (a literal
plus, in the icon font's weight) prefixes "New meeting", "Create meeting" and "Add hours".
There are no PNG icons and no hand-drawn SVGs. The only SVG assets are the logo and Google's `G`.

**Assets present:** `assets/meetrao-logo.svg` (mark + wordmark, 576×127; wordmark ink `#1A1917`,
mark green `#16554A`/`#268574` — use as-is), `assets/google-g.svg` (Google's own mark, subject to
Google's brand terms), `assets/favicon.png`, and eight product screenshots
(`shot-*.png` desktop, `m-*.png` mobile) used only on the landing pages. There are no brand
illustrations or stock imagery in the source, so there are none here.

---

## Index

**Root**
- `styles.css` — the entry point consumers link. `@import` lines only.
- `readme.md` — this file.
- `SKILL.md` — Agent Skills front-matter, for use in Claude Code.
- `thumbnail.html` — the homepage tile.

**`tokens/`** — `fonts.css` (Google Fonts import + Font Awesome `@font-face`), `colors.css`,
`typography.css`, `spacing.css`, `radius.css`, `elevation.css`, `motion.css` (keyframes live
here), `base.css` (document reset, link colours, the `.mr-icon` helper).

**`assets/`** — `meetrao-logo.svg`, `google-g.svg`, `favicon.png`, `shot-{booking,dashboard,availability,confirm}.png`,
`m-{booking,dashboard,availability,confirm}.png`, `fonts/FontAwesome6Sharp-*.otf`.

**`guidelines/`** — 18 specimen cards: Colors (accent, surfaces, lines, ink, semantic, status in
use), Type (display, UI, mono, numerals), Spacing (radii, control heights, gap scale, elevation
& focus, motion, interaction states), Brand (logo, iconography).

**`components/`** — 35 components in six groups. Each has `.jsx`, `.d.ts` and `.prompt.md`,
with one card per directory.

- `core/` — **Button**, **IconButton**, **Icon** (+ `MEETRAO_GLYPHS`), **Spinner**, **Badge**,
  **CountBadge**, **Avatar**, **Eyebrow**
- `forms/` — **Field**, **Input**, **Textarea**, **SearchField**, **Checkbox**, **Switch**,
  **ChoiceChip**, **MenuSelect**
- `data/` — **Card**, **MetricCard**, **DataTable**, **ListRow**, **KeyValueRow**, **EmptyState**
- `feedback/` — **Notice**, **Toast**, **Dialog**
- `navigation/` — **NavItem**, **Tabs**, **SubNav**, **Breadcrumb**, **StepTracker**
- `scheduling/` — **DatePicker**, **SlotGrid**, **DayHoursRow**, **BookingLinkChip**,
  **CopyLinkButton**

**`ui_kits/`**
- `app/` — the signed-in product: dashboard, bookings, meetings, availability, settings, plus the
  booking-detail and cancel dialogs. Click-through.
- `booking/` — the public guest flow: booking page → guest details → confirmed → cancelled.
- `marketing/` — the desktop landing page.

**`templates/`**
- `app-screen/` — a Design Component starting point for a new signed-in screen (sidebar, header,
  content column).
- `booking-page/` — a Design Component starting point for a public, guest-facing page.

**`source_notes/`** — the redesign brief that came with the source, kept for reference.

### Intentional additions

The source is a set of prototypes, not a component library, so the component inventory was
enumerated from what the prototypes actually build. Three items are wrappers rather than things
the source names:

- **Icon** — a wrapper over the Font Awesome codepoints the prototypes inline by hand, so glyph
  names replace magic escapes.
- **Card** / **ListRow** — the bordered white surface and its divided row, repeated verbatim in
  eight screens.

Nothing else was invented. There is no Tooltip, Accordion, Pagination, Stepper input, Avatar
group or Toast stack in this system, because there is none in the product.
