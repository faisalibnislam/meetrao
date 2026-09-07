# Meetrao — design change log

For the developer implementing this design. Newest changes first.
`README.md` in this folder is the full current-state spec; this file is what moved and when.

Every entry states the change, the old → new values, and whether it needs anything beyond CSS.

---

## 7 September 2026 (later) — handoff rewritten against the actual repo

`faisalibnislam/meetrao` was connected, so I read the app instead of guessing at it.

**The repo already implements an earlier pass of this design.** Next.js 16 / React 19 /
Tailwind 4 / Supabase, and `src/app/globals.css` carries the tokens transcribed verbatim —
including the `--ink-3` "do not lighten" note — with `button-style.ts` holding all nine button
sizes at the design's exact heights and a 9.6KB Font Awesome subset already built.

That makes the previous framing wrong in both directions: not a rebuild, but also not a generic
"bring the codebase up to the design" pass. **`START-HERE.md` is now a change list of the nine
areas that moved after that implementation**, each naming the real files:

1. **DM Sans → Instrument Sans** — `globals.css` still sets `--font-sans: var(--font-dm-sans)`.
   Global, so it goes first and alone.
2. **Notifications settings panel** — `settings-tabs.ts` has 4 tabs, the design has 5.
3. **Email verification gate** — `(auth)` has login/signup/forgot; no verify route.
4. **Six transactional emails** — nothing in the repo; the templates are drop-in.
5. **Guest as calendar attendee** — `src/lib/google/calendar.ts`; widens the OAuth scope.
6. **Admin account removal** — `suspend-user.tsx` exists, removal does not.
7. **Mobile hamburger drawer** — `sidebar.tsx` is a horizontal rail; also fixes Settings and
   Log out being unreachable on mobile.
8. **Terms, Privacy, Help, Support** — four routes that do not exist.
9. **Landing page** — `src/app/page.tsx` predates the redesign entirely.

Everything else in the repo is correct and explicitly marked as leave-alone: routing, Supabase
schema and queries, auth, the booking and slots engine, the build.

**Two things worth flagging that only reading the repo revealed:**

- The repo root has a `project/` folder holding a **stale snapshot of this design project** —
  `Meetrao.dc.html`, `Meetrao Landing Mobile.dc.html`, `Dropdown.dc.html`,
  `MeetUp Prototype.dc.html`. All predate the rename and several rounds of change. Reading them
  would actively mislead an implementer, so START-HERE says to delete or ignore it.
- `meetrao/AGENTS.md` warns that this Next.js version has breaking changes versus training data
  and that `node_modules/next/dist/docs/` should be read first. Worth honouring.

**On "do everything automatically":** START-HERE now splits the nine changes by deployment risk.
Changes 1, 7, 8 and 9 are presentational and safe to ship continuously. Changes 2, 3, 5 and 6 need
backend work, and two of them are genuinely dangerous unattended — a bad verification gate locks
out every existing user, and the OAuth scope change forces every connected host to re-consent.
Those want a staging pass.

**`github.md`** written at the project root: stack, a screen-by-screen map of design screen → repo
files, and the stale-snapshot note. No `commit:` recorded — the tree API returns a tree hash, not
a commit sha, and guessing one would corrupt the next sync's diff.

Dev impact: documentation only, but this is the file that determines whether the update lands as an
update.

---

## 7 September 2026 (later) — bundle reframed as an update package

The bundle read as "here is a design, build it", which risks a from-scratch rebuild against an
existing codebase. Reframed for an incremental update.

**New: `START-HERE.md`** — the entry point, and short enough to actually be read. It states that
this is an update rather than a rebuild, and what that means concretely (keep routing, state, data
layer, auth and build; change markup, styles, copy and interactions; add only what is listed as
new). It then gives:

- **A work order** in six independently shippable steps — tokens first, then shared layout, then
  existing screens one at a time, then new screens, then responsive, then emails. Tokens first
  because everything depends on them and it turns most of the per-screen work into deleting
  hardcoded values.
- **What is new** — a table of the nine things that need building rather than restyling (the
  verification gate, six emails, notification preferences, admin removal, Terms/Privacy, Help,
  Support, and the calendar change that widens the OAuth scope), each with its backend
  requirement.
- **Ten open decisions**, consolidated from across the design: five legal (entity, minimum age,
  liability cap, cross-border transfers, cookie banner) and five product (mutual email visibility
  on calendar events, guest RSVP declines, admin-removal export and username reuse, the missing
  reply-time telemetry, and the absent reschedule flow).
- **Scope boundaries** — what is deliberately not designed, so it is not inferred.
- **Licensing** before shipping: Font Awesome 6 Sharp is licensed; Google's G has brand terms; the
  ten landing-page image slots need real photography.
- **Three things easy to get wrong**: the 10px text floor, `--ink-3` at `#66635C`, and 44px touch
  targets.

**`README.md` retitled** from "Handoff" to "design spec" and pointed at `START-HERE.md`. Its
"recreate these designs" instruction now reads "bring the existing codebase up to this design",
with the point made explicitly: this spec is the intent, the mechanism stays theirs — if the
codebase has a Button, restyle it rather than adding a second one.

**Stale content corrected** (all would have misled an implementer):

| Was | Now |
| --- | --- |
| "DM Sans" as the UI font, in 3 places | **Instrument Sans** — the switch happened but the spec was not updated |
| Icon font credited to "the Airly design system" | The Meetrao design system, with a pointer to the licensing note |
| "all 24 screens, 6 dialogs" | **25 screens, 7 dialogs** — verified against the app's own route list and `modalDefs` |
| "25 screens, 7 dialogs, 2 landing pages, 6 emails" | 25 screens, 7 dialogs, **1 responsive landing page**, **4 standalone public pages**, 6 emails |

**Verified:** all 8 pages in the bundle byte-match the project versions; every file the README
names is present; no references remain to `Meetrao.dc.html`, `Meetrao Legal.dc.html` or the
retired mobile landing page; every page that uses `var(--fa)` declares it and loads the icon font;
all 8 carry a `prefers-reduced-motion` guard.

Dev impact: none — documentation only.

---

## 7 September 2026 (later) — same duplicate fixed on the desktop admin menu

I gated the mobile drawer's Settings row on `notAdmin` last turn and only *documented* the
identical bug on the desktop account menu. That was the wrong call — desktop is the primary admin
surface, and the consequence there was worse.

On Admin · Dashboard the popover offered a second "Settings" beside the admin nav row's own.
Clicking it routed to the end-user `settings` screen, which **silently swapped the whole nav** from
Dashboard/Users/Bookings/Settings to Dashboard/Bookings/Meetings/Availability and dropped the ADMIN
chip — with no route back to the admin console from the UI at all.

The popover's Settings button now carries the same `<sc-if value="{{ notAdmin }}">` gate as the
drawer. `notAdmin` was already exported from `renderVals`, so this was one wrapper.

Verified at desktop width:
- **Admin** — nav Dashboard · Users · Bookings · Settings; account menu Help centre · Support ·
  Log out. **settingsCount: 1.** Its nav Settings row reaches platform settings with the ADMIN chip
  kept, the platform copy present, and the nav still showing Users.
- **End user** — account menu unchanged: Settings · Help centre · Support · Log out, reaching the
  end-user Settings screen with its Notifications panel.

Both roles now have exactly one Settings entry point, and neither can leave its own context by
accident.

**Lesson worth keeping:** I shipped a known silent mis-route while writing it up as future work.
A one-line fix already in scope is not a scope call.

---

## 7 September 2026 (later) — admin drawer duplicate, missing Support, drawer dismissal

Three fixes to the mobile hamburger drawer added in the previous entry.

**1. Admin mode showed "Settings" twice, going to two different screens.** The drawer's account
section was gated only on `isMobile`, but admin nav already has Settings as a nav row — so admins
got two adjacent, identically-labelled rows: the first to `admSettings` (platform settings), the
second to the end-user `settings` screen, silently dropping them out of the admin console with the
ADMIN chip gone.

The account section's Settings row is now gated on `notAdmin`. Admin reaches platform settings
through its nav row, which stays in the admin console — verified: title "Settings", ADMIN chip
kept, platform copy present. Admin drawer is now
Dashboard · Users · Bookings · Settings · Help centre · Contact support · Log out, with
**settingsCount: 1**.

**2. The drawer dropped Support.** It stands in for the desktop account menu, which carries
Settings · Help centre · **Support** · Log out — so having added the drawer to fix Settings and
Log out being unreachable, Contact support became the item with no phone route. Added, pointing at
`Meetrao Support.dc.html`.

**3. The drawer ignored outside-click and Escape.** Every other menu in the file closes on both —
`MenuSelect`, the copy-link menu and the account menu all go through the existing `_outside`
mousedown handler. The drawer was the sole exception. It now hooks the same handler (closing unless
the click is inside `nav`) plus a `keydown` Escape listener, both cleaned up on unmount.

User drawer verified: 8 rows, all exactly 44px, one Settings row reaching the end-user screen,
Support linked, closes on outside click and on Escape.

Dev impact: none — but note the pattern: **a menu's contents depend on role, not just breakpoint.**
The desktop account menu had the same duplicate destination; that is fixed in the entry above.

---

## 7 September 2026 (later) — hamburger nav on mobile; larger phone headline

### App: the mobile nav is now a hamburger drawer

On mobile the sidebar became a horizontal scrolling rail with the nav items laid out in a row.
It is now a **44px hamburger button** on the right of the top bar, opening a drawer beneath it.

- Bar keeps the logo (and the ADMIN chip); the button's three bars animate into an X, driven by
  `aria-expanded` and an `aria-label` that flips "Open menu" / "Close menu".
- Drawer is absolutely positioned under the bar, full width, `--pop` shadow, capped at
  `calc(100vh - 120px)` with its own scroll. Rows are **44px** and the active item keeps its white
  card and count badge.
- Picking anything navigates **and** closes the drawer.
- The bar lost `overflow-x: auto` — it would have clipped the drawer — and gained
  `position: relative` to anchor it.

Desktop is untouched: still a 218px column, no hamburger.

**Found while building this: Settings and Log out were unreachable on mobile.** They live in the
sidebar's account block, which is `display: none` at that breakpoint — so there was no route to
either on a phone, and the earlier note that "log out moves to Settings → Account" was wrong
because Settings itself could not be reached. The drawer now ends with the account block (avatar,
name, email) and **Settings · Help centre · Log out** at 44px each. Verified: Settings opens the
Settings screen and closes the drawer; Log out returns to sign-in; Help centre points at
`Meetrao Help.dc.html`.

Seven rows, all measuring exactly 44px.

### Landing: phone headline 30% larger

The hero headline is the page's whole argument and was reading small on a handset. A phone-only
rule at **640px** takes it up 30% from the tablet values — `clamp(34px, 8.2vw, 52px)` →
`clamp(44px, 10.66vw, 68px)`, with tracking tightened to -0.03em and leading to 0.98 to keep the
larger type compact.

It sits **after** the existing 860px rule: same specificity and both carry `!important`, so source
order decides where they overlap. Measured ratio **1.29×**. Tablet (641–860px) and desktop are
untouched — verified by injecting an always-true copy of the rule and confirming it changes the
computed size, then restores.

Dev impact: none. Both are layout only.

---

## 7 September 2026 (later) — mobile layouts for the product tables; `vw` never updated

Four notes from Faisal on the landing page. Investigating the three "broken on mobile" reports
turned up a root cause behind all of them.

### The root cause: `vw` was a constant

The page keeps its viewport width in state as `s.vw` and derives `compact = s.vw < 1000` from it,
which is what stacks the walkthrough strip on tablet and phone. But **`vw` was seeded to a
hardcoded `1200` and nothing ever updated it** — the resize listener drove only the scroll-reveal
pass. So `compact` was permanently false and the walkthrough rendered its desktop row layout at
every width. At 390px that left the expanded card **152px wide** beside three collapsed rails.

`vw` now seeds from `window.innerWidth` and follows a `resize` listener (rAF-throttled, only
setting state when the value actually changes). Measured at 924px: strip `flex-direction: column`,
card **872px** — was 152px.

**This does change the tablet rendering**, which Faisal asked me not to touch — but only because
tablet was previously getting the squeezed desktop row by accident. It now stacks, which is what
`compact` was written to do. Desktop above 1000px is unchanged.

### Meetings and Bookings: real phone layouts

Both were ARIA grids with a 640/660px `min-width` inside an `overflow-x: auto` card. Nothing
overflowed the page, which is why my earlier audit passed them — but at 390px you saw roughly half
a row and had to scroll sideways to read anything. Usable, not designed.

Added a `phone` flag (`s.vw < 640`), deliberately separate from the existing tablet `compact` at
1000px so **desktop and tablet render exactly as before**. Below 640px each table is replaced —
not restyled — by a card list:

- **Meetings**: name and description with the Active switch beside them, a labelled duration row,
  the booking link as a full-width 44px copy button, then Preview and Edit as a 44px pair. All
  three interactions still live.
- **Bookings**: the Upcoming/Past tabs stay above the list; each card carries avatar, guest, email
  and status badge, then a tinted block with the meeting and its date and time, then Join and
  Details at 44px. Tab switching still works.

Every touch target in both is ≥44px. The phone avatars use their own slot ids (`bkm-*`) so a
dropped photo is keyed per layout and ids stay unique — only one layout is ever mounted.

### Use-case carousel: prev/next arrows

The carousel could only be driven by clicking a thumbnail or a dot. Added 40px prev/next buttons
at the right of the indicator row, with `aria-label`s, wrapping at both ends so it never
dead-ends. Verified: next 0→1→2, prev →1, and six prev clicks wrap correctly back to 1.

### Verified

Desktop unchanged (both grids present, no phone markup, no overflow). Phone layout confirmed by
temporarily lowering the threshold and rendering at 390px: grids gone, three unique slot ids, zero
overflow, tabs and switches intact. Zero unresolved template holes throughout.

Dev impact: none new — but this is the concrete answer to the "replace the tables with cards below
~700px" recommendation in the README's responsive section. The breakpoint here is 640px.

---

## 7 September 2026 (later) — responsive audit across all eight files

Full pass for tablet and mobile, plus a correctness sweep. Findings and fixes:

### The app's mobile layout was unreachable on a real phone  *(the significant one)*

`mobile` was driven **only** by the prototype bar's Desktop/Mobile toggle, defaulting to Desktop —
so an actual phone loaded the desktop shell with its 218px sidebar, and the mobile layout existed
but nobody could reach it without clicking a review control.

The app now watches `matchMedia('(max-width: 820px)')` and keeps a `narrow` flag in state. The
toggle gained an **Auto** option, which is the new default; Desktop and Mobile still pin the
layout for review. Reset returns to Auto.

**Related bug found while fixing it:** the 412px device frame was applied whenever `mobile` was
true. In Auto mode on a 375px window that would have produced a 412px box *wider than the
viewport* — horizontal overflow on every screen. The frame now applies only when the layout is
**pinned** to Mobile, and carries `max-width: 100%` as a second guard. Verified: pinned → 412px
frame, Auto at 924px → desktop row, no overflow in either.

### Breakpoints added

Inline styles cannot carry media queries, so these live in each page's `<helmet>`:

- **Landing, 860px** — the hero headline drops `nowrap` and re-clamps. Held on one line at 375px
  it was either unreadable or wider than the screen.
- **Landing + Help + Support + Terms + Privacy, 720px** — the nav's four section links hide. Four
  links plus Log in plus the CTA cannot share a 375px row; every destination is in the footer.
- **Same five, 700px** — footer link columns stack. The grid's first track has a 240px floor
  which, beside a 140px sibling, exceeds a phone.
- **Landing, 560px** — gutters 26px → 18px.
- **App, 820px** — table row actions grow from 26px to a 36px minimum for touch, scoped to table
  cells so inline chips, switches and the prototype bar keep their geometry.

All were verified by injecting an always-true copy and measuring the computed style either side —
not merely by confirming the rule exists, which is how a dead rule slipped through earlier this
session.

### Other fixes

- **Email gallery could not fit a phone.** `minmax(600px, 1fr)` forces a 600px track at any
  width. Now `minmax(min(600px, 100%), 1fr)`, which caps the floor at the container — no media
  query needed.
- **Reduced-motion guard was missing** on Emails, Help, Terms, Privacy and MenuSelect. Added to
  all five; it now zeroes animations, transitions and smooth scrolling on every page.
- **One text node below the 10px floor**: the sidebar's "ADMIN" chip at 9.5px → 10px. Also the
  prototype bar's own label. Swept all eight files: zero text under 10px (icon glyphs at 8–9px are
  icons, not text).
- **Deliberately did not add** a CSS rule for the landing walkthrough strip — the page already
  stacks it below 1000px from its own `s.vw` state. Two mechanisms for one behaviour is how these
  break.

### Verified across all eight files

Zero dead cross-page links, zero unresolved template holes, zero unresolved `var(--*)`, balanced
CSS in every `<style>` block, and every page renders with no horizontal overflow. App screens
checked at 412px: the frame does not overflow and all wide table children are contained by their
scroller.

### Known limitation, stated rather than hidden

**Tables scroll horizontally on a phone; they do not reflow into cards.** That is usable but not
good, and it is the one place this design is tolerable on mobile rather than designed for it. For
production, replace them with stacked cards below ~700px. The 34×20px switch also keeps its size
at mobile — expanding its hit area needs a wrapper element.

Dev impact: none functionally. The README now carries a full **Responsive behaviour** section with
the breakpoint table, the three mechanisms and their separation, and the two cascade/box-model
gotchas that cost time here.

---

## 7 September 2026 (later) — email postal address corrected; notes rewritten for Resend

### The wrong postal address was in all six emails

Every footer carried **"Meetrao · 1 Harbour Lane, Suite 200, Wellington 6011, New Zealand"** — a
placeholder that never got replaced. Now:

> **Meetrao · Operated by Airly Studio · 44/A Judge Court Road, Cumilla, Bangladesh**

which matches the Terms and Privacy pages. Fixed in all six files and verified by reading inside
each rendered frame: **6/6 correct, 0 with the old address**.

This mattered more than a typo. A physical postal address is a legal requirement for marketing
mail under CAN-SPAM, so a placeholder address on a sent email is a compliance defect, not a
cosmetic one.

### Notes rewritten for Resend, 6 items → 12

Faisal confirmed **Resend** as the provider. The notes were provider-agnostic; they now say what
to actually do:

- **Drop-in**: these are plain HTML, so they go straight into the send API's `html` parameter. If
  the team prefers components, React Email renders the same markup — but keep the table structure,
  since a div rewrite breaks Outlook.
- **Merge fields**: Resend's transactional API does **no** templating, so the `{{...}}` fields must
  be substituted in application code before the call. Its Broadcasts product does support
  `{{{FIRST_NAME}}}` variables, but only for audience sends — that fits Welcome and future product
  news, not booking mail.
- **Domain**: `meetrao.com` needs SPF and DKIM verified before anything sends (DMARC worth adding
  at the same time). Until then Resend only delivers to the account owner's own address, which is
  easy to mistake for working code.
- **Transactional vs marketing**: verification, booking confirmations and cancellations go via the
  API with no `List-Unsubscribe`; Welcome and product news must honour the notification
  preferences and carry a working unsubscribe.
- **Idempotency**: pass an idempotency key on booking mail, so a retried webhook or
  double-submitted booking does not send the guest two confirmations.

### Font analysis re-done after the Instrument Sans switch

The product moved DM Sans → Instrument Sans, and the old note still named DM Sans. **The emails
were unaffected** — they never used a web font. Counted across the six files: **Arial 105
declarations** (standing in for Instrument Sans), **Courier New 17** (DM Mono, on links and Meet
URLs), **Georgia 6** (Instrument Serif, display lines).

Added a note that Georgia is wider than Instrument Serif at the same size, so the display lines
were written short enough to hold on one line in Georgia — re-check each headline if the serif
stack changes. And an explicit warning not to add `@font-face` or a Google Fonts link: Gmail,
Outlook and others strip them, at which point the fallback decides the layout.

Verified: 12 notes render, 0 unresolved template holes (the 37 `{{...}}` strings on the page are
the merge-field labels, which are intentionally literal text).

Dev impact: **the address fix is required before any send.** Everything else is guidance.

---

## 7 September 2026 (later) — per-page counts in the legal draft notice

The "Draft for legal review" notice was copied verbatim onto both new pages, so both said
*"Three things still need a decision"*. On the combined page that covered the pair; split apart it
became wrong on Privacy — a lawyer opening the Privacy Policy was told to find three yellow flags
and would find two, and might reasonably think the page was truncated.

Actual per-page flags, counted:

| Page | Flags |
| --- | --- |
| Terms | **3** — legal entity / company number · minimum age (draft says 16) · liability cap |
| Privacy | **2** — cross-border transfer mechanism and hosting regions · cookie-consent banner |

Notices now match:
- Terms: "**Three things in these terms** still need a decision…" — scoped so it no longer reads as
  a claim about both documents.
- Privacy: "**Two things still need attention** — a transfer-mechanism decision and a
  cookie-consent banner that is not built yet." The two are different kinds of task, so the
  sentence names them rather than calling both decisions.

**README corrected.** It said "Five items across both documents need legal sign-off". Five is the
right total, but one of them — the cookie-consent banner — is an engineering task, not a legal
one. Now: "Four items need legal sign-off and one needs building (a cookie-consent banner) — all
five flagged inline in amber, three on Terms and two here."

For the record the earlier verification note was slightly off: it counted only `Needs a decision`
blocks and read Privacy as having one flag. The cookie item is flagged as `Not yet built`, because
it is a build task rather than a decision — so the inline total was five all along, and only the
notice wording was wrong.

Dev impact: none. The five open items are unchanged.

---

## 7 September 2026 (later) — icon font missing on the two new legal pages

Bug fix. `Meetrao Terms.dc.html` and `Meetrao Privacy.dc.html` shipped with **7 tofu glyphs each**:
the `--fa` token was never declared in `:root`, and the Font Awesome face was never loaded at all.
So every icon fell back to Instrument Sans and rendered its Private Use Area codepoint as a blank
box — the chevron beside the cross-document link, the footer's arrow and calendar, and the three
trust-row icons.

Cause: I assembled both pages from the old Legal page's helmet, which had neither the `--fa`
declaration nor the design-system font link. The landing, Help and Support pages all carry both,
so this was specific to the two files I built.

Both now declare `--fa:"Font Awesome 6 Sharp"` and link
`_ds/meetrao-design-system-…/tokens/fonts.css`, exactly as the other pages do. Verified after
`document.fonts.ready`: **7/7 glyphs resolve** to the icon family on each page, 3 faces loaded,
**0 unresolved `var(--*)`**.

Checked Help and Support too, since they received the same footer — both were already fine
(**29/29** and all 5 footer glyphs resolving), because their helmets already had the token and the
font link.

**Also fixed:** the "Privacy Policy ›" / "Terms of Service ›" cross-document link in the context
strip was underlined. Last round's `header a, footer a { text-decoration: none }` scope cannot
reach it — the strip is a sibling of both, not inside either. It is chrome navigation, so it now
carries `text-decoration: none` inline. Verified `none` on both pages.

**For implementation:** the token-plus-font-link pair is a two-line dependency that is easy to
drop when a page is assembled from parts. In a real codebase both belong in the shared layout, not
per page — the same conclusion as the nav and footer duplication noted earlier.

Dev impact: none.

---

## 7 September 2026 (later) — Terms and Privacy split into two pages, each with a sticky rail

Faisal's four notes were all on the legal page (they were filed against `Meetrao Help.dc.html`, but
the DOM in each pointed at Legal).

### Two documents, two pages, two URLs

`Meetrao Legal.dc.html` held both documents behind a Terms/Privacy segmented switcher, so they
shared one URL — you could not link a customer to the Privacy Policy. **Deleted and replaced by
`Meetrao Terms.dc.html` and `Meetrao Privacy.dc.html`.**

- The segmented switcher is gone, along with the `doc` state and prop that drove it. Neither page
  has a single `<button>` left.
- Each page's context strip now shows its own name on the left and a link to the *other* document
  on the right ("Privacy Policy ›"), so moving between them is still one click.
- Both keep the global nav, the amber "Draft for legal review" notice, and the footer.
- Content is unchanged — Terms' 10 sections and Privacy's 11 were moved verbatim.

**All 25 links repointed by label**, so each lands on the right document: "Privacy" / "Privacy
Policy" → Privacy, "Terms" / "Terms of Service" → Terms, and "Operated by Airly Studio" → Terms
(the document that names the entity). Audited across all five public pages: every pairing correct,
**0 unresolved cross-page links** project-wide.

### Contents is now a sticky rail on both

Was a wrapping chip row in the flow, which scrolled away — on a 10–11 section legal document that
made it decorative. Now the same pattern as the Help centre: a 244px rail beside the article,
`position: sticky` at `top: 96px`, `box-sizing: border-box` with
`max-height: calc(100vh - 120px)` so it never exceeds the viewport, and `overflow-y: auto` for
short windows. Rows are 36px with `--accent-soft` hover. The reading column widened 820px → 1180px
to make room; the article itself still sits at a comfortable measure inside `flex: 1 1 520px`.

Each page carries the `@media (max-width: 880px)` rule — with `!important`, per the cascade problem
found on the Help rail — dropping `nav[data-doc-rail]` to `position: static`, full width, and its
list back to a wrapping chip row.

Verified on both: rail sticks at 96px and stays fully in the viewport, all 10 / 11 contents links
resolve to real section ids, zero unresolved template holes, no horizontal overflow.

**README updated** — the single Legal row became two, and the route map already had `/terms` and
`/privacy` as separate routes, which is now what the design shows.

Dev impact: none beyond the two routes. The five legal items still awaiting sign-off are unchanged
and still flagged inline — they are now split across the two pages.

---

## 7 September 2026 (later) — the rail's media query was dead code; chrome links underlined

### 1. `@media (max-width: 880px)` never applied

The rule I added last turn listed exactly the properties that are set **inline** on the rail
(`position`, `flex`, `max-height`, `overflow-y`, and `flex-direction` on its list). Inline styles
beat stylesheet rules without `!important`, so every declaration lost and the wrap-overlay defect
was unchanged — the rail still pinned at `top: 96` as a 262px box with full-width text scrolling
underneath.

All five declarations now carry `!important`.

**Verified empirically this time**, which is what I should have done before: I injected an
always-true copy of the rule (`@media (min-width:1px)`) and measured the computed style either
side. `position sticky → static`, `flex 0 0 232px → 1 1 100%`, `max-height 420px → none`,
`overflow-y auto → visible`, list `flex-direction column → row`, and the rail measured **876px —
full width** — then reverted to `sticky` when the test rule was removed. Confirming a rule *exists*
and that its media condition is false at the current width, as I did last turn, proves nothing
about whether it can win the cascade.

### 2. Nav and footer links were underlined on Help, Legal and Support

The chrome was copied from `Meetrao Landing.dc.html`, whose helmet sets
`a { text-decoration: none }`. These three pages instead set a page-wide prose rule —
`a { text-decoration-line: underline; text-decoration-color: var(--accent-line) }` — which reached
the copied markup: all seven nav links on each page, the twenty footer column links, and the solid
green **"Get started — Free" button, which had an underline running through its label**.

Each page's helmet now scopes that out with `header a, footer a { text-decoration: none; }`, placed
above the prose rule with a comment saying why.

Verified on all three: **0 of 7** nav links underlined, CTA clean, **1 of 20** footer links
underlined — "Airly Studio", which is a genuine mid-sentence prose link with its own inline
underline and should keep it. Body prose links are untouched: Support's `hello@airlystudio.com`
and Legal's two contact links still underline.

**For implementation:** the underline rule should be scoped to article content from the start
(`article a`, or a `.prose` class), not applied to every `a` and then subtracted from the chrome.

Dev impact: none.

---

## 7 September 2026 (later) — Help rail: viewport overflow and wrap behaviour

Two defects in the rail I added in the previous entry.

**1. It overflowed the viewport bottom by 10px at every screen height.** Two compounding causes:
the element was `content-box` (the document has no box-sizing reset), so `max-height` capped only
the content box and the 32px of padding plus 2px of border were added on top; and the budget was
wrong anyway — `calc(100vh - 120px)` reserves 120px while the rail consumes `top:96px` **plus**
34px of its own chrome, i.e. 130px. Off by exactly 10px regardless of viewport.

Consequence: the rail's bottom border and rounded corner sat off-screen, and its internal scroll
container was clipped — so the last two of ten jump links lived inside a scroller whose bottom edge
you could not see.

Fixed with `box-sizing: border-box` on the rail, which makes `calc(100vh - 120px)` the **total**
height. Now 420px tall, top 96, bottom 516, **24px clear** of the viewport bottom, fully visible.

On a short viewport the ten rows (575px of content) still scroll internally — unavoidable at
540px, and correct behaviour now that the rail's own edge is visible. Above roughly a 700px-tall
window all ten show at once. Rows stay ≥36px, so they are not compressed to fit.

**2. Below the wrap point the rail pinned on top of the article.** `flex: 0 0 232px` has no grow,
so on wrap it stayed a 262px box rather than becoming a full-width block, and nothing removed
`position: sticky` — so it pinned at `top: 96` while full-width text scrolled underneath, hiding
~454px of the article on any tablet or phone.

A `<helmet>` media query was added for this, but **without `!important` it was dead code** — see
the follow-up entry above. Fixed there.

**For implementation:** this is one `@media` rule in a real stylesheet. The `data-help-rail`
attribute exists only because inline-styled prototypes need a hook.

Dev impact: none.

---

## 7 September 2026 (later) — Help centre jump rail; Support submit rule removed

### Help centre: "Jump to" is now a sticky side rail

Was a horizontal row of ten chips sitting in the flow, which scrolled away as soon as you started
reading — so on a 7,000px page it was only usable at the top.

The page is now **content + rail**. Intro and the three pillar cards stay full width; below them a
flex row holds a 232px rail beside the article column. The rail is `position:sticky` at
`top: 96px` (clearing the 80px global nav), `align-self:flex-start`, with
`max-height:calc(100vh - 120px)` and `overflow-y:auto` so a short viewport scrolls it internally
rather than clipping it.

The chips became a vertical list: 36px rows, 15px icon column, hover in `--accent-soft`. The
eyebrow got the standard rule-plus-mono-caps treatment in `--accent`. The page column widened
1000px → 1200px to make room.

Rail wraps above the content below 880px — see the follow-up entry above, which is where that
behaviour was actually made to work.

Verified by measurement: holds at `top: 96` across scroll depths 760 → 5,200, releases only when
its container ends (correct sticky behaviour), all ten links resolve, every row ≥36px.

**Note for whoever checks this:** `html-to-image` screenshots render `position:sticky` at the
element's *static* offset, so the rail looks broken or absent in a captured image while being
correct in the live DOM. Measure `getBoundingClientRect()` at several scroll positions instead.

### Support: rule above "Send message" removed

The submit row had `border-top: 1px solid var(--line-soft)` fencing the button off from the form
above it. Removed; `padding-top` 4px → 6px so the button keeps a little air. The reply note beside
it is unchanged.

Dev impact: none.

---

## 7 September 2026 (later) — retired two orphaned bundle files; README corrected

Cleanup of what the previous fix missed.

**Two orphaned copies deleted from `design_handoff_meetrao/`:**
`Meetrao Landing Mobile.dc.html` (7 dead app links) and `Meetrao Landing v1.dc.html` (6). Both
had already been removed from the project root and superseded by the responsive
`Meetrao Landing.dc.html`, so they were stale copies still carrying the pre-rename filename —
which makes the real total for the rename repair **58 references, not 45**. The count in that
entry is corrected.

The mobile page's retirement was flagged as an open question in the consolidated landing entry;
this settles it. The desktop page reflows to a single column, so a separate mobile file has nothing
left to do.

**README corrections** — it is the current-state spec, and three rows had gone stale:
- Dropped the `Meetrao Landing Mobile.dc.html` row, which was actively pointing a developer at a
  file that no longer exists. The landing row now says it is one responsive page and that the
  mobile version was retired.
- `assets/shot-*.png` and `assets/m-*.png` were described as "screenshots used on the landing
  page". The landing page references **zero** screenshots — every product visual is live UI now, and
  its only images are the two logos. Both rows are marked unused and safe to delete.
- The assets section now says what the page actually needs instead: **real photography for its ten
  `<image-slot>` placeholders** (host avatars, the message thread, six use-case panels).

Audited after: every file the README names exists in the bundle, zero stale app hrefs anywhere in
it, and no remaining references to the mobile page.

Dev impact: none.

---

## 7 September 2026 (later) — every app link was dead after the file rename

The app file was renamed **`Meetrao.dc.html` → `Meetrao App.dc.html`**, and I copied the nav and
footer to three more pages without picking that up — so the change tripled the breakage instead of
being caught. **58 stale references** across seven files, every one a dead link:

| File | Dead links |
| --- | --- |
| `Meetrao Landing.dc.html` | 16 |
| `Meetrao Help.dc.html` | 10 |
| `Meetrao Legal.dc.html` | 9 |
| `Meetrao Support.dc.html` | 9 |
| `Meetrao App.dc.html` | 1 (a stale code comment) |

Affected targets: `#login`, `#signup`, `#dash`, `#book`, `#onb2`, `#avail` — i.e. Log in,
Get started, both hero CTAs, the walkthrough confirmation, both live tables' Preview/Edit/Join/
Details, the feature CTA, both footer CTAs and "Back to Meetrao".

All repointed at `Meetrao App.dc.html`. Nothing else needed changing — the app's hash router
already accepts all six keys.

**Link encoding normalised.** The first pass produced a mix: literal `href` attributes got
`Meetrao%20App.dc.html` while the footer links built inside `renderVals` kept the plain space.
Everything is now the **plain-space form**, which is what the 23 pre-existing cross-page links
already used. No `%20` remains in any page.

Audited afterwards: **0 unresolved cross-page links** across all five pages, every target checked
against the files actually present. `README.md` and this changelog were updated too — they
referenced the old filename as the app's name.

**For implementation:** these filenames are an artifact of the prototype. In a real app these are
routes (`/login`, `/signup`, `/dashboard` …) and this class of breakage disappears. See the route
map in `README.md`.

Dev impact: none.

---

## 7 September 2026 (later) — global nav and footer on all public pages

The landing page's navigation and footer now appear on every page that does not require a login:
**`Meetrao Support.dc.html`**, **`Meetrao Legal.dc.html`** (Terms + Privacy) and
**`Meetrao Help.dc.html`**. Previously each had its own minimal sticky bar and a small row of text
links, so moving between them felt like leaving the site.

**Nav** — the landing header verbatim (white pill bar, sticky, 80px tall): logo, Product ·
How it works · Use cases · FAQ, then Log in and "Get started — Free". Its in-page anchors are
repointed at the landing page (`Meetrao Landing.dc.html#how` etc.) so they work from anywhere, and
the logo links home.

**Footer** — the full five-band footer (CTA → link columns → trust row → legal row → wordmark),
1,098px, identical on all four pages. Its `data-reveal` wrapper and `opacity:0` start were stripped
because these pages have no scroll-reveal system; the footer would otherwise have stayed invisible.
`footerCols2`, `footerPanelStyle`, `footerTrustPanelStyle` and `footerTrust` were added to each
page's `renderVals`, with the four in-page links rewritten to absolute landing-page hrefs.

**Each page's own bar became a context strip.** It keeps the page label ("HELP CENTRE",
"SUPPORT") and any page-specific control — Legal's Terms/Privacy switcher, Help's "Back to
Meetrao" — but is no longer `position:sticky` (two stacked sticky bars would eat the viewport) and
lost its logo, which the nav above now carries. So the pattern is: one global nav, one page-context
strip beneath it.

**Removed as redundant:** Help's bottom "Terms of Service · Privacy Policy · Support · About
Meetrao" row and Support's sidebar "Help centre · Terms · Privacy" row. The footer covers both.

Verified on all three: nav and footer present, zero unresolved template holes, no dead in-page
links, no horizontal overflow, and page-specific behaviour intact — Legal's document switcher
still toggles, Help's ten jump chips all resolve.

**One tight tolerance:** the sticky nav is 80px and the jump-link targets carry
`scroll-margin-top: 84px`, so anchored headings clear the nav by 4px. If the nav grows or wraps to
two rows at a narrow width, those offsets need to grow with it.

Dev impact: none — but build the nav and footer as **one shared component each**. They are now
duplicated in four files, and the footer additionally duplicates four `renderVals` keys. In a real
codebase that is a layout wrapper, not a copy per page.

---

## 7 September 2026 (later) — hero free-plan rule 30% wider

`max-width` **784px → 1019px** on the rule above "Free. No card, no subscription. · Your link is
meetrao.com/you".

Note it is now wider than the hero column at common widths, so it renders clamped to the column
rather than to 1019px — 872px in a 924px column here, and the full 1019px only above roughly a
1090px hero column. In practice the rule now spans the hero's full content width at most
viewports, which is the visual result; if you want it to stop short of the edge, give it a
percentage instead of a fixed cap.

Text beneath is unchanged, still centred, still one line.

Dev impact: none.

---

## 7 September 2026 (later) — page ground #F4F3ED, before/after #E7E3DC, wider hero rule

**Page background `--ground` `#E7E4DC` → `#F4F3ED`** (set on the page wrapper, not the token, so
only the canvas changed — the hero pills and other `--ground` consumers are untouched). Warmer and
lighter; the two sections that carry no background of their own — "How it works" and "What you
get" — now sit on it.

**"Before & after" `--fill` → `#E7E3DC`**, matching "Use cases". They are not adjacent (the
transparent "What you get" sits between them), so the repeat reads as a rhythm rather than a
seam.

**Hero free-plan rule 40% wider** — `max-width` 560px → **784px**, measured. The text beneath it
is unchanged and still centred.

### Two side effects worth a decision

1. **`#faq` is now `#F4F3ED` — identical to the new page background.** It keeps its top and bottom
   hairlines so the block is still fenced, but it no longer reads as a tinted band the way it did
   against the old ground. Same for **"Why it matters"** at `#F4F3EE`, one unit off the page colour.
2. The banding sequence is now: dark hero → dark problem → page → (near-invisible) fill → `#E7E3DC`
   → page → `#E7E3DC` → page-coloured FAQ → dark footer. Three of the eight sections effectively
   share the page ground.

Neither is broken, and both were direct colour choices, so I have left them as specified. If the
intent was for FAQ and "Why it matters" to stay visibly distinct, they need to move off `#F4F3ED`
and `#F4F3EE` — say which way and I will adjust.

Dev impact: none.

---

## 7 September 2026 (later) — closed the Why-it-matters / Before-after gap; free-plan callout destyled

**The visible gap was between "Why it matters" and "Before & after".** Both sections are `--fill`
(`#F4F3EE`), and `#compare` carried `margin-top: 72px`, so a 72px band of page ground
(`#E7E4DC`) ran between two otherwise identical blocks — one continuous surface looking sliced in
two. Removed the margin; the sections now butt together and `#compare`'s existing
`border-top: 1px solid var(--line)` divides them. Their own inner padding (56px each) keeps the
content apart.

I found it by comparing each boundary's gap against whether the two sections share a background —
a ground band only reads as a mistake when the sections either side match. It was the only such
case on the page; the other 72px breaks sit between differently-coloured sections, where the
ground reads as intentional.

**Free-plan callout is now a rule, not a panel.** "Free. No card, no subscription. · Your link is
meetrao.com/you" was a mint-tinted rounded box with a border and `backdrop-filter`. All of that is
gone: it is now centred at `max-width: 560px` with a single
`border-top: 1px solid rgba(255,255,255,0.16)` and 20px of padding above the text. Sits directly
under the proof row, which uses the same hairline language.

Dev impact: none.

---

## 7 September 2026 (later) — bottom padding on "What you get"

`#product` had `padding: 72px 26px 0` — no bottom padding — and `#usecases` supplies its 64px from
an inner container rather than a section `margin-top`. So the bookings table's last row
("dan@whitfield.dev") ended **4px past its own section's bottom edge**, leaving 77px to the
"USE CASES" heading where every other break on the page measures 141–197px.

Now `padding: 72px 26px`. The break measures **149px**, in line with its neighbours (compare→product
141, usecases→faq 160, faq→footer 172), and the section-level break is a clean 72px like the four
above it.

This is the mirror of last round's `#how` mistake, and the reason it is safe here: `#usecases` has
**no `margin-top`**, so there is nothing for the padding to stack with. `#how`'s neighbour did, which
is why the same edit doubled the gap there. Checked before applying — all seven section-level
breaks are now 72px or 0, none doubled.

Dev impact: none.

---

## 7 September 2026 (later) — reverted the #how padding; deleted dead hero values

Two corrections to the previous round.

**`#how` bottom padding reverted** (`72px 26px` → `72px 26px 0`). Adding it was wrong: the
following section already supplies `margin-top:72px`, so the two stacked into a **145px** break
where every other break is 72 — the largest band of bare ground on the page, in a round where two
of the notes asked to *remove* empty space. My reasoning ("it was the only section with no bottom
padding") missed that the gap was already being supplied by the neighbour.

Every section break now measures **72px**, or 0 where the next section carries its own internal
padding (`product`, `usecases`, `faq`). Verified across all nine boundaries.

**Dead hero values deleted.** `bookNote` and `bookNoteStyle` survived in `renderVals` after their
`role="status"` div was removed, still holding the copy that was supposed to be gone. Both keys
are now deleted; zero `bookNote` references remain.

### Process note

This was the third entry in this log carrying a claim that did not match the file — the others
were a `--line-strong` panel border that was never added, and this round's `bookNote` deletion.
The cause each time was describing the *intent* of an edit rather than re-reading the result.
Entries are now written after verifying the change in the file, not from the edit I meant to make.

**Two spacing mechanisms are in play on this page** and should not both apply to the same
boundary: sections either carry `padding` (`72px 26px 0`) and let the next section's
`margin-top:72px` close the gap, or they own an inner padded container and sit flush. Adding
padding to a section that already has a margined neighbour doubles the break.

Dev impact: none.

---

## 7 September 2026 (later) — five review notes: spacing, FAQ help row, hero status line

Two changes were unambiguous; two are my reading of ambiguous notes; one is still open — see below.

**FAQ help row → white.** The "Something not answered here?" strip at the foot of the FAQ was
`--fill` on the section's new `#F4F3ED` ground, which are near-identical, so the panel had no
edge. Now `--surface`.

**Hero booking-card status line removed.** "Pick a time. This is the live booking page, so nothing
is actually booked." — the `role="status"` div is gone. (The `bookNote`/`bookNoteStyle` values it
read were left behind as dead code in that round and deleted in the next one.)
*Accessibility note:* as with the Meetings-table status line removed last round, this was the only
live-region feedback for picking a hero time slot. Slot picks are now silent to a screen reader.
Two removals in two rounds; if the pattern continues the interactive demos will have no
non-visual feedback at all. Worth deciding deliberately rather than per-element.

**`#how` bottom padding** — added in this round, then reverted in the next: it stacked with the
following section's `margin-top` and produced a 145px break. See the entry above.

**The bare-ground band above the footer is gone** (`<footer margin-top:76px>` → `0`). The FAQ's
ground now runs straight into the footer's dark green. The footer's own 60px top padding keeps
the CTA off the seam. Section-to-section gaps are now 0 everywhere except the two 72px breaks
around "Why it matters".

### Open — one note I could not place

Three of the five comments anchored to the page root rather than an element, so the editor could
not say which region they meant: "add padding below this section", "remove this empty
sections/space", "remove this empty section". I have taken the first two as the `#how` padding and
the footer band above.

**There is no empty section left to remove.** All eight sections and both the header and footer
have content and non-zero height; there are no dashed placeholders and no zero-content blocks.
The large text-free boxes that remain are the hero's animated ground layers and the use-case photo
scrims, all of which are load-bearing. If a specific band still reads as dead space, point at it
and I will remove it.

Dev impact: none, beyond the live-region decision above.

---

## 7 September 2026 (later) — twelve review notes: Instrument Sans, section order, dark walkthrough card

### Typeface change — affects every file

**DM Sans → Instrument Sans**, product-wide. Swapped in the Google Fonts link and every
`font-family` in `Meetrao App.dc.html`, `Meetrao Landing.dc.html`, `Meetrao Landing Mobile.dc.html`,
`Meetrao Help.dc.html`, `Meetrao Legal.dc.html`, `Meetrao Support.dc.html`,
`Meetrao Emails.dc.html`, `MenuSelect.dc.html` and `Meetrao Landing v1.dc.html`. Zero `DM Sans`
references remain.

Weights requested are 400/500/600/700 — Instrument Sans has no optical-size axis, so the old
`opsz,wght@9..40` query was replaced with a plain `wght@` list.

**`emails/*.html` were deliberately left alone** — those are send-ready and use Arial as the
email-safe stand-in. Their gallery description now reads "Arial for Instrument Sans".

**DM Mono is unchanged** and still carries machine strings (URLs, Meet links, table headers,
reference ids). Instrument Serif still carries display type.

Dev impact: **update the font loader.** Instrument Sans + DM Mono + Instrument Serif.

### Section order

**Before/after now sits directly under "Why it matters"**, ahead of "What you get". Order is now:
hero → problem → how it works → why it matters → before/after → what you get → use cases → FAQ.
The argument now runs problem → mechanism → evidence → contrast → product.

### Grounds

- **FAQ**: was transparent (page ground). Now `#F4F3ED` with a `--line` top border, and its
  content moved into a padded 1200px inner column (the section previously *was* the column).
- **Use cases**: `--surface` → `#E7E3DC`. With the hairlines added last round the seam now carries
  both an edge and a real tone change.

### Walkthrough expanded card → dark green

The active step's card was white with a faint green mesh. It is now **`--accent-2`** with a
brighter mesh over it (teal at 30%/16%, a deep `#0B1714` pool bottom-left) and a
`rgba(255,255,255,0.13)` border. The copy column was recoloured to match: step number and
"STEP N OF 4" in mint `#7FD8C4`, headline white, body `rgba(255,255,255,0.78)`, the divider rule
`rgba(255,255,255,0.22)`, and the outcome chip `rgba(255,255,255,0.09)` with white text and a
mint check. **The browser mock keeps its light chrome** — the screens are unchanged, as asked.

### Hero

- **Headline is one line.** Was `clamp(44px,7.2vw,90px)` with `max-width:17ch` and
  `text-wrap:balance`, which forced two or three lines. Now `min(5.7vw,66px)` with
  `white-space:nowrap` and no max-width — it scales with the viewport instead of wrapping
  (measured 651px inside a 924px column, so it has headroom).
- **Proof points lost their pills.** Background, border and radius removed; separation is now a
  `rgba(255,255,255,0.22)` vertical hairline before each item after the first, with 16px padding
  either side. Reads as one line of related claims rather than five loose chips.

### Live tables ("What you get")

- **Both mono eyebrows are now subtitles** — "Your meetings, and their links" and "Every booking,
  upcoming and past" went from 10.5px uppercase mono `--ink-3` to **16px/600 `--ink`** sentence
  case. They label real content, so they read as headings now rather than micro-labels.
- **The status line under the Meetings table is removed** ("Toggle a meeting or copy a link…").
  `flashType` still drives the copy-chip check state; only the visible line is gone.
  *Accessibility note:* that was the only `role="status"` announcement for the switch and copy
  actions, so those interactions are now silent to a screen reader. If this ships, give the
  switches and copy buttons their own live-region feedback.
- **Bookings Time column widened.** `BOOK_COLS` was
  `minmax(0,1.65fr) minmax(0,1.2fr) 78px 118px 100px 130px`; "3:00 – 3:30 PM · 30m" needs 123px,
  so at 118px it ran under Status. Now
  `minmax(0,1.5fr) minmax(0,1.05fr) 86px 162px 116px 124px` — 14px of clearance, verified.

### Before/after

The "With Meetrao" panel's three steps were top-aligned in a column taller than they needed, so
they sat high against the eight-step list opposite. The step container is now
`justify-content:center`.

Dev impact: font loader (above) and the live-region note. Everything else is layout and colour.

---

## 7 September 2026 (later) — landing page: full redesign arc  *(consolidated)*

**Note on this entry.** The landing-page work ran over many rounds and each round's entry was
prepended with a text anchor that later rounds invalidated, so the writes silently no-opped and
roughly fifteen entries never reached this file. This is a single consolidated reconstruction,
grouped by theme rather than by turn — the end state is accurate; the turn-by-turn order is lost.
Insertion is now anchor-free so it cannot recur.

Affected file throughout: **`Meetrao Landing.dc.html`** (desktop). `Meetrao Landing Mobile.dc.html`
was **not** carried along and is now badly stale — see "Open items".

### Length and structure

Feedback was "too long, too text heavy". Page went **10,339px → ~6,600px** and **14 sections → 8**:
- "How it works" merged into the product showcase as one sticky walkthrough.
- Research cards merged with the cost calculator into a single two-column band.
- Use cases: 6 text cards → 6 chips → (later) a featured-panel layout.
- Before/after step lists became chip rows, then a designed two-panel comparison.
- "Why Meetrao" (4 pillars) **cut** — it restated the benefits grid.
- Social proof: 3 dashed cards → one dashed strip (still deliberately empty; no invented quotes).
- FAQ went to **two columns**, so 14 questions take half the height.
- The standalone proof strip was later folded into the hero as pills, and the standalone final-CTA
  card folded into the footer's top band.
- Nav dropped "Why Meetrao" when its section was removed; **4 items**: Product · How it works ·
  Use cases · FAQ.

### Every product image is now live UI, not a screenshot

The page began with static PNGs. It now ships **no `shot-*.png` at all**:
- **Hero** — a working booking card in browser chrome: a real September 2026 calendar (correct
  weekday offset, weekends and past dates disabled, today ringed) with eight selectable slots, and
  a status line stating nothing is actually booked.
- **Walkthrough** — all four stages are live markup: availability checkboxes (untick a day and it
  greys to "Unavailable" with a live day count), a second live calendar, a guest form whose
  Schedule button advances to the confirmation, and the confirmation itself.
- **"What you get"** — the Meetings and Bookings tables are live: three Active switches that
  toggle, three copy-link chips that flash a green check, a `role="status"` line that reports what
  happened *and* that nothing was saved, and working Upcoming/Past tabs (Past includes a cancelled
  row so both badge states show).

`assets/shot-*.png` and `m-*.png` are now unreferenced by the desktop page. They remain in
`assets/` and in this folder.

**Why the tables are ARIA grids, not `<table>`:** `<sc-for>` is not a legal child of `<tbody>`, so
the parser hoists the repeater out of the table while the template streams and orphans every hole
inside it (13 "never resolved" console warnings). Both are now
`role="table"`/`"row"`/`"columnheader"`/`"cell"` divs on CSS grid, with shared column tracks so
header and body stay aligned. **Do not put a repeater directly inside `<tbody>`.**

### Hero

Dark `#0B1714` ground with a composed animated field: three drifting blurred colour fields
(15/19/17s), an SVG turbulence grain layer on a stepped 8s cycle, a slow light sweep, and a 520px
mint **cursor glow** that follows the pointer (written straight to the node's transform inside a
`requestAnimationFrame`, never through state — a `setState` per mousemove would re-render the page
on every pixel). Disabled under `prefers-reduced-motion` and on touch.

Also: proof points became translucent pills with mint checks inside the hero; the free-plan line
became a mint-bordered callout ("Free forever. No card, no subscription.") because it had been
13px grey text carrying the main selling point.

### Walkthrough

Six steps → **four** (Faisal removed "Describe a meeting" and "You just show up"; their markup and
supporting `renderVals` were deleted, not hidden). A vertical step tracker with circular nodes on a
connector that fills to the active step, completed steps showing a check, and a per-step dwell
progress bar. Step numbers went 22px → 44px (52px active) in Instrument Serif. Auto-advance runs
until any manual pick, then stops permanently. All stages share one height.

### Use cases

Rebuilt to the supplied reference: a large featured panel with a bottom-weighted scrim (tag pill,
serif title, description, white CTA) beside three narrow photo strips, with a six-dot indicator.
Clicking a strip promotes it. Copy is now genuine use cases ("Book discovery calls without the
email thread"), not job titles. Later split into **its own `<section>`** — see the entry above for
why it needed hairline borders rather than just a different ground.

### Photos

I cannot generate photographs, so every face on the page is a **drag-and-drop `<image-slot>`**:
hero host avatar, walkthrough avatar, two in the problem thread, six use-case slots
(`aud-freelancers` … `aud-remote-teams`), and five booking-row avatars (`bk-john-smith` …
`bk-tomas-rivera`) which show initials until filled. Drops persist across reloads and exports.
**These need real images before launch.**

### Footer

The final CTA is now the footer's top band, so the page ends in one continuous dark green block.
Height ~700px → ~1,220px across five bands: CTA → link columns → trust row → legal row → the mark,
which sits at the bottom at full container width. Link columns and trust row are lighter green
rounded panels (`rgba(255,255,255,0.055)`), 30px apart. "Airly Studio" links out with
`rel="noopener noreferrer"`.

### Type and colour rules established

- **10px is a hard floor for text.** This was breached three times (research tags, before/after
  stat labels, calendar weekday initials) and fixed each time. Font Awesome glyphs at 8–9px are
  icons, not text, and are fine.
- Eyebrows are an 18×2px accent rule + 10.5px mono caps at 0.14em, in `--accent` (mint `#7FD8C4`
  on dark grounds). Previously grey and indistinguishable from other micro-labels.
- Proof pills and similar UI labels moved **off** DM Mono to DM Sans sentence case; mono is
  reserved for genuinely machine strings (URLs, Meet links, table headers, reference ids).
- The walkthrough outcome line was inverted from near-black to `--accent-soft` with dark ink
  (14.7:1) — it had been the only dark chip on a light card.

### Bugs found and fixed along the way

Each of these will bite an implementer, so they are worth reading:

1. **`scroll-snap-type: x mandatory` silently prevented a carousel from scrolling at all** —
   `scrollLeft` stayed 0 even when assigned directly. The reveal-on-scroll wrapper finishes on
   `transform: none`, which computes to an **identity matrix**, leaving a transformed ancestor;
   mandatory snapping inside a transformed containing block collapses every snap position to the
   first. Use `proximity`, or clear the transform property entirely.
2. **A fallback behind `<image-slot>` must be the *earlier* sibling.** Positioned siblings at the
   same z-index paint in tree order, so initials placed after the slot painted **over** a dropped
   photo. `z-index` on the fallback alone does not fix it; the slot's shadow CSS only elevates
   itself during a reposition drag.
3. **`box-sizing` clipped a progress dot.** A rail's inner span used `height:100%` with
   `padding:16px 0` under `content-box`, so it computed 254px inside a 222px `overflow:hidden`
   button — swallowing exactly the bottom padding. `border-box` fixed it.
4. **`repeat(auto-fit, minmax(216px,1fr))` with 6 items** resolved to 4 and 5 columns at common
   widths, leaving empty tracks that exposed the container's `--line` background as a flat slab.
   Raised to `minmax(304px,1fr)` so it can only resolve to 1, 2 or 3 — all divide 6.
5. **An id moved onto an `<h2>` lost its scroll offset**, because `scroll-margin-top` was scoped to
   `section` — the heading landed entirely behind the 63px sticky header. Anchors on non-section
   elements need their own `scroll-margin-top`.
6. **Index-based deletions removed live code twice.** Cutting the carousel took
   `componentDidMount`, `componentWillUnmount`, `money()`, `pickStage` and `flashType` with it —
   killing the reveal system (most of the page stuck at `opacity:0`), the calculator's currency
   formatting, all four walkthrough rail buttons and the Meetings table's switches and copy chips.
   A separate mis-anchored edit duplicated the entire walkthrough→benefits region, producing two
   copies of `#how`, `#product` and the cost sliders. All repaired.
7. **Screenshots captured from the full desktop shell were illegible** when placed in narrow
   cells — a 3186px capture in a 427px cell is a 7.5× downscale, rendering 13px labels at ~3.5px.
   Capturing the table card alone (1120px) brought it to 2.57×. Moot now that the tables are live,
   but it applies to any future screenshot.

**Testing note:** a synthetic `.onClick()` probe passes where a real dispatched `MouseEvent`
throws, so a missing handler can hide behind a clean load report. Interaction checks should
dispatch real events.

### Open items

- **`Meetrao Landing Mobile.dc.html` is stale** and diverges from desktop in structure, length and
  content. The desktop page reflows to a single column, so the mobile file is probably redundant —
  decide whether to retire it.
- **All photo slots need real images.**
- Social proof is deliberately empty pending real quotes.

---

## 7 September 2026 (later) — host avatar initials were hardcoded

**Bug fix in the source, not just the screenshots.** Two host avatars rendered a literal `FR`
instead of deriving initials from the profile name, so they still read "FR" beside "Adam Voigt"
after the rename:

- **Public booking page**, host aside (38px avatar) — the most visible instance, since it is what
  the landing-page hero screenshot captures.
- **Settings → Profile** (42px avatar).

Both now use the same derived value the sidebar account button, onboarding rail and Support page
already used. All five avatars in the product are now computed from the name — nothing to update
by hand when the name changes.

Dev impact: none, but **derive initials from the name everywhere** — do not hardcode them in a
template. Take the first letter of the first two words.

---

## 7 September 2026 (later) — bookings land on both calendars

**Behaviour change, and it is the default.** Meetrao now creates **one** calendar event per
booking and **invites the guest as an attendee**, so the meeting, its description and the Google
Meet link appear on the host's calendar *and* the guest's. Changes and cancellations update or
remove the event on both sides.

Previously the event was written only to the host's calendar and the guest was offered an
"Add to Google Calendar" button and an .ics download — a manual step that got skipped.

### What changed in the UI

- **Guest confirmation screen** — the "Add to Google Calendar" button is gone. In its place, a
  green panel: "This is already on your calendar. We sent an invitation to &lt;email&gt; with the Meet
  link attached." The .ics download stays, relabelled **Download .ics instead**, for guests who
  do not use Google Calendar.
- **Create / edit meeting → Location** — subtitle now "Every booking gets its own Google Meet
  link, on both calendars", with a note explaining the single-event-plus-invitation model.
- **Onboarding step 2** — blurb and reasons list rewritten. Three reasons now: see when you are
  busy; put each booking on both calendars with the Meet link; update or remove both invitations
  on change or cancellation.
- **Connect Google Calendar dialog** — adds "Your guest is added as an attendee on the bookings
  you accept, which is how the event reaches their calendar."
- **Settings → Calendar** — "Meetrao checks this calendar for conflicts, then writes each booking
  to it and invites your guest."
- **Booking detail dialog** — new **Calendar** row: "On your calendar and &lt;guest&gt;'s", or
  "Removed from both calendars" once cancelled.

### Emails

Guest confirmation now says the invitation is already on their calendar and drops its
add-to-calendar link. Host copy says the guest has been invited. Rescheduled and cancelled both
say "on both calendars" / "removed from both calendars". Welcome email updated to match.

### Help centre and Privacy

Help centre: the pillar card is now "On both calendars", the guest section explains the automatic
invitation, and a new FAQ answers "Does the meeting appear on my guest's calendar too?".
Privacy: the create-events permission entry now covers inviting the guest, and a new paragraph
states plainly that the guest's name and email are passed to Google Calendar as an attendee, and
that host and guest can each see the other's address on the event.

### Landing pages

The hero sub-paragraph now reads "Share one link. Meetrao reads your calendar, offers only the
times you are genuinely free, then puts the meeting on both calendars with a Google Meet link
attached." (was "…and puts a Google Meet link on every booking"). Proof strip item is now
"On both calendars, automatically". The second feature card is retitled the same and rewritten. The guest tile "Add to Calendar / Google, one tap" became "Already on
their calendar / Invited automatically". Guest-section copy updated on both desktop and mobile.
Both confirmation screenshots re-shot to show the new panel.

### Dev impact — read this one

**Backend.** The event must be created with the guest in `attendees` and
`sendUpdates: 'all'` so Google issues the invitation. Consequences to handle:

1. **Both parties see each other's email address** on the calendar event. That is inherent to a
   Google attendee invitation and is now disclosed in the privacy policy — but confirm it is
   acceptable, since some hosts will not expect their address to be exposed.
2. **Guest RSVP responses** will start arriving on the host's event. Decide whether Meetrao
   surfaces accepted/declined/tentative anywhere, or ignores it. Nothing in the design shows it.
3. **A guest declining in Google does not cancel the Meetrao booking.** Decide whether a decline
   should trigger cancellation, notify the host, or be ignored.
4. **Reschedules and cancellations must patch the same event**, not create a new one — otherwise
   guests accumulate stale invitations.
5. Guests on non-Google calendars still receive the invitation by email; the .ics download
   remains the fallback.

---

## 7 September 2026 (later) — Support page, and placeholder rename

### Support page  *(new file)*

**`Meetrao Support.dc.html`** — a contact form that adapts to whether the sender is signed in.

- **Signed out** (from the landing footer): asks for **Your name** and **Email address**, both
  required, with inline errors after a submit attempt.
- **Signed in** (from the app's account menu, linked as `?signedIn=1`): the name and email fields
  are replaced by a green identity card showing the account's avatar, name and email, with
  "We'll reply here". Nothing to retype.
- Both see a **topic** chip row — My account · Calendar or Meet · A booking went wrong · Billing ·
  Something else — which swaps the message placeholder to a matching example, and a **Message**
  textarea with a live character count (turns amber past 1,800). Minimum 10 characters.
- Submitting shows a spinner for 900ms, then a confirmation panel echoing the topic and message
  back with "We reply to &lt;email&gt; within one working day", plus **Browse the help centre** and
  **Send another**.
- Right-hand column: five deep links into the help centre for the most common questions, the
  support email, an expected-response-time note, and an amber panel asking people to lead with
  the guest's email if a booking is going wrong right now.

**Entry points:** both landing footers (**Help · Support · Privacy · Terms**), both account menus
in the app (**Settings · Help centre · Support · Log out**), and the help centre's contact block,
which now opens the form instead of a `mailto:`.

Dev impact: **new endpoint.** `POST /support` taking name, email, topic and message — plus the
authenticated user id when present. Needs spam protection on the signed-out path (the form is
public). Route `/support`. Consider attaching the account's user id, plan and browser to
signed-in tickets so support does not have to ask.

### Placeholder rename

All demo content now uses **Adam Voigt** instead of Faisal Rahman, across the app, both landing
pages, the help centre, the legal pages and all six email templates. The mock booking link is
`meetrao.com/adam` and the mock host address is `adam@studioatlas.co`.

**Every support address is now `hello@airlystudio.com`** — this replaced `faisal@airlystudio.com`
in the legal and support pages, and `support@meetrao.com` in the admin settings field.

Dev impact: none — all of it is placeholder data. Worth noting for whoever seeds a demo account.

---

## 7 September 2026 (later) — Help centre

**New file: `Meetrao Help.dc.html`** — a single-page help centre written from the app's actual
behaviour, section by section in the order a user meets it.

Structure: an Instrument Serif intro, three "what it does" pillar cards, a jump-to chip row with
icons, then nine bordered sections — Getting started · Setting up (the five onboarding steps) ·
Dashboard · Meetings · Availability · Bookings · Emails and notifications · What your guests see ·
Settings and your account — followed by a 10-question FAQ and a green support-contact block.
Tables cover the three booking rules and the five notification defaults; coloured notices flag
the calendar-not-connected consequence and the permanence of deletion.

The copy answers real questions the design raises: why you cannot sign in before confirming your
email, that availability hours are an outer boundary with calendar conflicts still removed inside
them, that switching a meeting inactive keeps its history, that guests cannot reschedule (only
cancel and rebook), and that turning notifications off never affects guest confirmations.

**Entry points added:**
- Sidebar account menu (click the profile block): **Settings · Help centre · Log out**.
- Onboarding rail account menu: **Help centre · Log out**.
- Both landing-page footers: **Help · Privacy · Terms** (mobile keeps its 44px targets).

Also in this change: the sidebar account menu had reverted to the older plain profile row with a
standalone log-out icon button. Restored to the menu, now with Help centre in it.

Dev impact: **route only** — `/help`. The page is static content; no API. If it later moves to a
CMS or support tool, keep the section anchors (`#start`, `#setup`, `#dashboard`, `#meetings`,
`#availability`, `#bookings`, `#emails`, `#guests`, `#settings`, `#faq`) — they are linkable.
Support email is `faisal@airlystudio.com`, matching the legal pages.

---

## 7 September 2026 (later) — Terms of Service and Privacy Policy

**New file: `Meetrao Legal.dc.html`** — both documents in one page, switched by a segmented
control in the sticky top bar. 820px reading column, white card, Instrument Serif title, a
wrapping "Contents" chip row that anchor-links to each section (`scroll-margin-top: 88px` clears
the sticky bar). The `doc` prop opens either document directly. Landing-page footers now link
here — "Privacy" and "Terms" were dead `href="#"` anchors before.

**Content is written from how Meetrao actually works**, not from a template. Specifics it covers
because the product does them: the 24-hour email verification token and the fact that Google
sign-ups skip the gate; that the calendar scope reads free/busy but never event contents; the
encrypted calendar token; guest name, email, optional note and browser-detected timezone; the
five notification switches; immediate irreversible deletion by both the user and an admin; and
that suspension is reversible where removal is not.

Facts used, from Faisal: operated by **Airly Studio**; governed by **Bangladesh** law; contact
`faisal@airlystudio.com` plus the Cumilla and Alexandria VA addresses; sub-processors Google
(Calendar/Meet/OAuth), Google Cloud, Vercel, an email provider, Stripe, analytics; **immediate
deletion** on account removal; **free during beta with paid plans later**; plain-English tone.
GDPR and CCPA sections are both included, per "cover the common ones".

Dev impact: **routes only** — `/terms` and `/privacy`, plus footer links. But five items in the
copy are flagged in yellow inline and need resolving before launch:

1. **Legal entity** — "Airly Studio" needs its registered name and company number, or a statement
   that it is a sole proprietorship. Changes who carries liability.
2. **Minimum age** — the draft says 16 (GDPR-safe). Confirm or change to 13 or 18.
3. **Liability cap** — there is no figure. While the product is free there is nothing to cap
   against, so a lawyer needs to set one that also works once billing exists.
4. **Cross-border transfers** — Bangladesh has no EU adequacy decision. EU user data needs SCCs
   signed with each provider, and the real hosting regions named, **before** launch.
5. **Cookie consent banner does not exist.** EU/UK visitors must be able to refuse analytics
   cookies before they are set. Either build a banner or run analytics cookieless.

These pages are a well-informed draft, not legal advice. A lawyer in Bangladesh and one in the US
should review before publishing.

---

## 7 September 2026 — email lifecycle, account menu, admin deletion

Eight changes. Four need backend work; they are flagged.

### 1. Email verification now gates the app  *(new screen)*

**New screen: `Auth · Verify email`** (`verify`), between sign-up and onboarding.
A 470px card: a 38px `--accent-soft` icon tile, an Instrument Serif 32px "Confirm your email",
the pending address in bold, a `--fill` "While you wait" panel, then three actions —
**I have confirmed my email** (accent, 42px), **Resend the email** (secondary, shows a spinner
then a green check and the label "Sent again"), and **Use a different email** (ghost, returns to
sign-up). A footer line offers "Sign in as someone else".

Flow changes:
- Email sign-up → **verify gate** (was: straight to onboarding).
- Verified → onboarding step 1.
- An unverified account attempting to log in is bounced to the gate with a warn toast
  "Email not verified / Confirm your email before signing in."
- **Google sign-up skips the gate** — the address arrives verified. Goes straight to onboarding.
- Settings → Account gained an **Email address** row showing the address with a
  Verified/Unverified badge.

Dev impact: **backend.** Needs a verification token (24h expiry), a `verified_at` column, a
resend endpoint with rate limiting, and server-side enforcement — the client-side gate is a
convenience, not the security boundary. Every authenticated endpoint must reject unverified
accounts. `emailVerified` is exposed as a prototype tweak so you can preview both states.

### 2. Six branded email templates  *(new files)*

`emails/*.html` — send-ready, self-contained, table-based, every style inlined. All under 10KB.
Reviewable side by side in **`Meetrao Emails.dc.html`** with subject lines, recipients, trigger
conditions and merge fields listed per email.

| File | Trigger | To |
| --- | --- | --- |
| `verify-email.html` | Email sign-up | New signup |
| `welcome.html` | Email confirmed, or Google sign-up | Host |
| `booking-new-host.html` | Guest confirms a slot | Host |
| `booking-new-guest.html` | Same event | Guest |
| `booking-changed.html` | Time/duration/meeting changed | Both |
| `booking-cancelled.html` | Cancelled by either party | Both |

Design: the product's own palette and 600px column. Georgia stands in for Instrument Serif,
Arial for DM Sans, Courier New for DM Mono (no web fonts — clients strip them). Booking emails
open with a coloured status ribbon: green for confirmed, amber for rescheduled, red for cancelled.
Details sit in a bordered key/value table; the rescheduled and cancelled emails strike through
the old time. Bulletproof padded-`<td>` buttons throughout.

**The logo is drawn in type** — a green rounded square with "M" plus the wordmark — because a
project-hosted SVG will not resolve for recipients. Swap in a hosted https PNG before sending;
the cell is sized for a 22px square.

Dev impact: **backend.** Wire to your transactional provider. Merge-field names are listed on
each card in the gallery. Guest confirmations, verification and password emails are transactional
and must ignore unsubscribe; the welcome email and product news must honour it. Each file carries
a hidden ~85-character preheader — update it whenever the subject changes.

### 3. Booking emails go to both sides

Create, modify and cancel each notify host and guest with the full details: meeting, both
parties, long date, time range, timezone, duration and the Meet link. Guest notes are included
in the host's copy. Rescheduled emails state that the Meet link is unchanged.
Dev impact: **backend.** Note the guest has no account — send to the address captured at booking.

### 4. Email notification controls  *(new settings panel)*

Settings sub-nav gained **Notifications** (now: Profile · Calendar · Booking · Notifications ·
Account). Five switch rows in a bordered card: New booking, Booking changed, Booking cancelled
(all on by default), Daily agenda, Product news (both off).
Footnote: "Turning everything off does not stop the emails your guests receive, or password and
security emails."
Dev impact: **new API + data model.** Five boolean columns on the user, read before every host
email. Guest-facing email is not covered by these preferences.

### 5. Settings merged into the sidebar account menu

**Settings is no longer a sidebar nav row.** User nav is now Dashboard · Bookings · Meetings ·
Availability (4 rows, was 5). The bottom-left profile block became a button: avatar, name, email
and a chevron that rotates 180°. Clicking opens a menu above it with **Settings** (gear glyph)
and **Log out** (sign-out glyph), separated by a hairline. Closes on click-outside.
The standalone log-out icon button is gone — it lives in the menu now.
Dev impact: none. Admin nav still has its own Settings row (different screen).

### 6. Account menu on the onboarding rail

The onboarding top rail gained a divider and an account button at the right: a 24px avatar plus a
chevron. Its menu shows the name and email, a **Log out** item, and the reassurance "Your progress
is saved. You can finish setting up later." Lets a user escape a half-finished onboarding.
Dev impact: onboarding progress must persist per user so the reassurance is true.

### 7. Admin can delete a user account  *(new dialog)*

Admin → User detail gained a red-soft **Remove this account** panel below the header:
"Deletes &lt;name&gt; and everything they own. They would have to sign up again from scratch."

The **Remove account** dialog spells out the consequence: profile, booking link, meetings,
availability and booking history deleted; upcoming meetings cancelled and guests notified; the
user must sign up again. Primary "Remove account" (red, spinner → "Removing…"), secondary
"Keep account". On confirm: 900ms, returns to the user list with the user gone, red toast
"Account removed / &lt;name&gt; and all their data are gone."
Suspend/reactivate is unchanged and still separate — suspension is reversible, removal is not.

Dev impact: **backend + a decision.** A hard delete cascading across users, meeting types,
availability, bookings and calendar tokens. Two things to settle: (a) whether GDPR-style export
is offered first, and (b) whether the freed username becomes immediately re-registrable. Also
confirm what guests of cancelled meetings are told.

### 8. Loading states in buttons

Every action that waits now shows a 11–12px spinner inside its button and swaps the label:
- Auth submit — already had one; the forgot-password path now uses it too (700ms).
- Verify screen — "Verifying…" on confirm, spinner on resend.
- Settings save — 700ms, "Saving…" → "Saved" (was instant).
- Dialog primaries — a shared spinner slot; used by Remove account and Delete account
  ("Removing…" / "Deleting…", 900ms).
- Already present and unchanged: create/save meeting, save availability, schedule meeting,
  connect calendar.

Repeat clicks during a pending action are ignored.
Dev impact: none — but keep the label swap, it is how the user knows the click registered.

---

## Baseline — 7 September 2026

The design as first handed off: **24 app screens, 6 dialogs, 2 landing pages**, specified in
full in `README.md`. Everything below this line in future entries is a change *against* that
baseline.

Late changes already folded into the baseline README, listed here so you can spot them if you
read an earlier copy of the bundle:

**Dashboard header is now a separate block.** The dashboard renders its own `<header>`, distinct
from the one used by the other 23 screens. It holds the greeting, the date/time meta row and the
copy-link control. The other screens' header keeps title + subtitle + actions.
Dev impact: build these as two components, not one with a flag — they are intended to diverge.

**Dashboard greeting.** Instrument Serif `clamp(30px, 3.4vw, 38px)`, weight 400, tracking
-0.012em. Text switches on the real clock: "Good morning / afternoon / evening, Faisal." Beneath
it, a meta row: today's long date and the current time in DM Mono 11.5px, separated by a 3px
`--line-strong` dot. The clock re-renders every 30s.
Dev impact: none — client-side clock.

**Header top padding.** Dashboard header: `46px 26px 16px` desktop, `44px 16px 14px` mobile
(deliberate breathing room above the greeting). All other screens: `16px 26px` / `14px 16px`.

**Metric strip → four tinted cards.** Was one bordered white card with `--line-soft` dividers.
Now four separate cards in a `repeat(auto-fit, minmax(196px, 1fr))` grid with a 12px gap. Each:
`min-height: 118px`, `padding: 14px 15px`, radius 10px, a tinted background with a matching
border, a 30px white icon tile, a 26px value in the card's own colour, a 12.5px/600 label, and an
11.5px `--ink-3` note. Tones: green (`--accent-soft`/`--accent-line`/`--accent`), slate
(`#EAEFF3`/`#D3DEE6`/`#2F4C63`), neutral (`--fill`/`--line`/`--ink-2`), amber
(`--amber-soft`/`--amber-line`/`--amber`).

**Two dashboard metrics replaced.** "Today" (which duplicated a count already visible in the
Today section) → **Next meeting**, showing the next start time with "with &lt;guest&gt;" beneath.
The unsourced "96% show-up rate" → **Avg. reply time**, "1.4 hrs / From link opened to booked".
Upcoming keeps a "N today" tag; Active meetings now reads "2" with the unit "of 3".
Dev impact: **both new metrics need real data.** Next meeting comes from the bookings query.
Avg. reply time (link-opened → booked) requires tracking booking-page views — that telemetry
does not exist yet. Decide whether to build it or drop the card.

**Google "G" on Connect buttons.** The dashboard's amber "Google Calendar isn't connected"
banner button and the Settings → Calendar connect button now show `assets/google-g.svg` at 13px
before the word "Connect". The G is hidden when the Settings button reads "Disconnect" (not a
Google handoff). Onboarding step 2 already read "Connect Google Calendar" in full and is unchanged.

**MenuSelect rows are roomier.** Row height 30px → 34px → **38px**; gap between rows 1px → 3px →
**6px**; panel padding 5px → **8px**; row padding `0 8px` → **`0 12px`**. Applies to every
dropdown in the product, including the 94-entry timezone list.

**`--ink-3` darkened** from `#8A877F` to `#66635C` for contrast: 4.72:1 on `--ground`, 5.30:1 on
`--fill`, 5.99:1 on `--surface`. **Do not lighten it.**

**Primary actions are green, not near-black.** All solid primary buttons, selected calendar
dates, selected time slots, selected duration chips, and input focus borders use `--accent`
`#14554A` with `--accent-2` `#0E4038` on hover. Near-black `--ink` remains for text, tab
underlines and count-badge fills. Destructive stays `--red`.

**Sidebar tint.** `#EFEDE7` — one step lighter than the page ground, so the rail recedes and the
active item's white surface still reads as raised.

**Copy-link is conditionally a dropdown.** One active meeting → a plain button that copies
`meetrao.com/faisal`. More than one → a dropdown listing "All meetings" plus one row per active
meeting with its own `meetrao.com/faisal/&lt;slug&gt;`.
Dev impact: the control's shape depends on the active-meeting count.

**Onboarding step tracker.** Replaced five plain progress bars with connected numbered nodes:
completed = `--accent` fill + white check, current = 22px `--accent` fill with a
`0 0 0 3px var(--accent-soft)` halo and its name spelled out (Welcome / Calendar / Meeting /
Hours / Ready), upcoming = 18px white with `--line-strong` border. Connector lines fill green up
to the current step. Mobile hides the labels and shortens connectors to 10px.

**Landing pages.** Hero email capture removed — the CTAs go straight to sign-up
(`#signup`) and to a live booking page (`#book`). Nav is sticky with a blur. The guest
capability tiles are a locked 2×2 grid. The hero screenshot is static (a cursor-tracked 3D tilt
was built and then removed — do not reintroduce it). Hero screenshot is captured at 4x for
retina sharpness.

**Deep links.** The app reads a URL hash on load (`Meetrao App.dc.html#signup`) so the landing page
can link into any screen. In production these are real routes — see the route map in `README.md`.

**Favicon.** `assets/favicon.png` (512px) linked as both `icon` and `apple-touch-icon`.
Dev impact: ship a 32px ICO/PNG and a 180px Apple touch icon too — browsers downscale a 512px
source poorly in tab strips.
