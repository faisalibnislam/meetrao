# START HERE — building Meetrao from scratch

**Greenfield build. There is no existing codebase to update — start from an empty repo.**

The owner has chosen the infrastructure: **Vercel, Supabase, Resend, Google Cloud.** Those are
fixed; `BUILD-FROM-SCRATCH.md` § "Infrastructure setup" says what each needs and which two
Google concerns are easy to confuse.

**Begin with step 0** — scaffold and provision. Get the app booting with a validated environment
before building any UI. Ask the owner for all four services' credentials in one go rather than
blocking four times.

## Read in this order

1. **`BUILD-FROM-SCRATCH.md`** — the engineering plan. Stack, build order, data model, the five
   parts that are harder than they look, and the traps. **Start here.**
2. **`README.md`** — the design specification. Every token, screen, dialog, interaction and state.
   This is the authority for every value and every piece of copy.
3. **`CHANGELOG.md`** — optional, but it holds the diagnosis of every bug found during the design
   work and a previous implementation. Read the entries for an area before you build that area;
   several describe failures you would otherwise repeat.

## What is in this folder

| File | What it is |
| --- | --- |
| `BUILD-FROM-SCRATCH.md` | The engineering plan. Read first. |
| `README.md` | The design spec — tokens, 25 screens, 7 dialogs, every interaction and state. |
| `CHANGELOG.md` | Change history with bug diagnoses. Newest first. |
| `Meetrao App.dc.html` | **The product, interactive.** All 25 screens and 7 dialogs. Open in a browser — the bar at the bottom jumps between screens and pins Desktop/Mobile. |
| `Meetrao Landing.dc.html` | The landing page, interactive. |
| `Meetrao Terms.dc.html`, `Meetrao Privacy.dc.html` | The two legal documents. |
| `Meetrao Help.dc.html`, `Meetrao Support.dc.html` | Help centre and contact form. |
| `Meetrao Emails.dc.html` | Email gallery — subjects, recipients, triggers and merge-field names. |
| `emails/*.html` | **Send-ready HTML. Use as-is.** The only files here that ship. |
| `MenuSelect.dc.html` | The custom select, in isolation. |
| `assets/` | Logo, white logo, favicon, Google G — plus `fonts.css` and the two Font Awesome cuts the prototypes need to render. Self-contained: nothing here reaches outside this folder. |
| `support.js`, `image-slot.js` | The design-tool runtime that renders the `.dc.html` files. **Not for production, not a dependency.** |

## How to read the `.dc.html` files

They are the design, running. Open them in a browser and interact with them — that is the point of
them. They also read fine as text.

**They are prototypes on an internal design-tool runtime.** Do not port them, do not copy their
markup, do not treat `support.js` as a library. Every style is inlined and the nav and footer are
duplicated across five files because the tool has no layout primitive — that is an artefact of the
tool, not a pattern to follow.

**Where `README.md` and a `.dc.html` disagree, the `.dc.html` wins.** It is the live artefact and
was revised after the README was written.

## Two things to get right before writing much code

**Tokens first.** Transcribe them verbatim from `README.md` § "Design tokens". They are irregular
on purpose — 13.5px, 12.5px, half-pixel steps — and a scale that rounds them will fight you on
every screen. Do not re-derive or tidy them.

**Layouts once.** Three of them: app shell, marketing, auth/public. The prototypes duplicate their
chrome; you should not.

## The five things that are genuinely hard

Detailed in `BUILD-FROM-SCRATCH.md` § "The hard parts". Named here so they are not discovered late:

1. **Slot computation** — availability × duration × rules × calendar busy × guest timezone. Write
   it as a pure, unit-tested function before any UI touches it.
2. **Timezones and DST** — 94 zones, correct across boundaries.
3. **Double-booking** — re-check inside the booking transaction and return a 409. The design has
   the UI state for it already.
4. **Google Calendar** — the guest is an attendee, so the scope is write-with-attendees, not
   read-only free/busy. Handle every failure path.
5. **Email verification** — build the gate on the auth provider's own confirmation, and enforce it
   server-side.

## Decisions that are not yours

`BUILD-FROM-SCRATCH.md` § "Decisions the owner must make" lists nine. Five are legal and appear as
visible amber callouts on `/terms` and `/privacy` — **leave them as callouts; do not invent legal
text.** Four are product decisions. Surface them, do not guess them.

## Done means

The checklist at the end of `BUILD-FROM-SCRATCH.md`. The short version: matched on measured values
rather than impression, copy verbatim, every error and empty state reachable, the slot engine
tested, no text under 10px, no touch target under 44px on mobile, deployed and opened on a real
phone — and **one real booking made end to end**, appearing on both Google Calendars with a Meet
link and both emails delivered. Until that round trip works once, the product is not built.
