/* ─────────────────────────────────────────────────────────────────────────────
   The pricing page's content.

   A plain `.ts`, not a `.tsx`, and not co-located with the component that
   renders it. A Server Component importing a plain value from a `"use client"`
   module gets a client reference rather than the value — which looks fine until
   something calls `.map` on it and the page 500s. That happened once with the
   FAQ array; `lib/faq.ts` exists for the same reason this file does.

   ── on writing a pricing page with two tiers on it ──

   This page used to say there was no paid tier at all, and its credibility
   came from that. There is one now, so the credibility has to come from
   somewhere else: saying plainly what Free actually is — the whole booking
   product, not a trial of it — and what Pro is, which is the parts a business
   needs rather than the parts a person does.

   The order is: Free and what it includes, then Pro and what it adds, then
   what NEITHER does. That last section is the reason the first two are
   believable and it goes before any invitation to sign up.

   Every claim has to survive being read next to /terms §5. Nothing here says
   "free forever" — it says free today, no card to use it, and that an
   existing free account is never billed without opting in, each of which is
   separately true and separately checkable.
   ───────────────────────────────────────────────────────────────────────────── */

/** The headline claim, and the three denials under it. */
export const HEADLINE = "Book meetings free. Pay only to make it yours.";

export const DENIALS: readonly [string, string][] = [
  ["No credit card to start", "Free needs no card, at sign-up or later. Taking bookings costs nothing."],
  ["No trial clock", "Free is not a countdown. Nothing you set up stops working in 14 days."],
  ["No per-seat pricing", "Pro is $10 a year for the account, not per person and not per booking."],
];

/** What Pro costs, in both cadences. Rendered, and used in the copy below. */
export const PRO_YEARLY = "$10 a year";
export const PRO_MONTHLY = "$3 a month";

/**
 * What Free is — the whole booking product, not a sample of it.
 *
 * Written as capabilities rather than adjectives, and each one is a thing you
 * could go and check within a minute of signing up. A feature list on a
 * pricing page is a promise with a receipt attached.
 *
 * The things NOT on this list are on PRO_ADDS, and the split is deliberate:
 * nothing a guest experiences is paid for. Reminders, rescheduling, timezone
 * handling and cancellation are all free, because charging a host to stop
 * letting their guests down is the wrong business.
 */
export const INCLUDED: readonly string[] = [
  "One public booking link — meetrao.com/your-name",
  "Unlimited meeting types and weekly schedules",
  "Unlimited bookings a month",
  "Google Calendar connected, and checked for conflicts before a slot is offered",
  "A Google Meet link created on every confirmed booking — or a phone call, an address, your own link",
  "Guests book without an account, in their own timezone",
  "Reminders the day before and an hour before, to both of you",
  "Guests move a meeting themselves, keeping the same Meet link",
  "Days off and one-off hours, on top of your weekly pattern",
  "Up to five questions on the booking form",
  "Buffers between meetings, minimum notice, and a booking window",
  "A contact list that fills itself from your bookings, with CSV export",
];

/**
 * The two plans, line by line.
 *
 * A column each, because "what you get" and "what it adds" as separate
 * sections made a reader hold one list in their head while reading the other.
 * `true` is a tick, `false` is a dash, and a string says what differs rather
 * than pretending a difference is a presence.
 */
export type PlanCell = boolean | string;

export const COMPARISON: readonly { feature: string; free: PlanCell; pro: PlanCell }[] = [
  { feature: "Your booking link — meetrao.com/your-name", free: true, pro: true },
  { feature: "Unlimited meeting types and weekly schedules", free: true, pro: true },
  { feature: "Unlimited bookings", free: true, pro: true },
  { feature: "Google Calendar checked before a slot is offered", free: true, pro: true },
  { feature: "Google Meet link on every online booking", free: true, pro: true },
  { feature: "Phone, in person, or your own meeting link", free: true, pro: true },
  { feature: "Guests move a booking themselves", free: true, pro: true },
  { feature: "Days off and one-off hours", free: true, pro: true },
  { feature: "Up to five questions on the booking form", free: true, pro: true },
  { feature: "Contacts, filled from your bookings, with CSV export", free: true, pro: true },
  { feature: "Reminders before a meeting", free: "A day and an hour before", pro: "Times you choose" },
  { feature: "Embed on your own site", free: "With a small badge", pro: "No badge" },
  { feature: "“Powered by Meetrao” on your booking page", free: "Shown", pro: "Removed" },
  { feature: "Your own logo on your booking page", free: false, pro: true },
  { feature: "Your own colours — accent and page background", free: false, pro: true },
  { feature: "No Meetrao colours anywhere a guest looks", free: false, pro: true },
  { feature: "Your own domain — meeting.yourcompany.com/your-name", free: false, pro: true },
  { feature: "Team link, rotating to whoever is free", free: false, pro: true },
  { feature: "Sessions several guests share", free: false, pro: true },
  { feature: "API keys and webhooks", free: false, pro: true },
];

/**
 * What Pro adds, and why each one is on this side of the line.
 *
 * Two themes only: looking like your own business, and working as more than
 * one person. If a feature is neither, it belongs in Free.
 */
export const PRO_ADDS: readonly [string, string][] = [
  [
    "Your logo and your colours",
    "Your mark in place of ours, and two colours — an accent and a page background — that carry through the calendar, the buttons, the panels and the confirmation. Nothing of our palette is left. We work out the readable shades, so a guest can always read the page, dark backgrounds included.",
  ],
  [
    "Your own domain",
    "meeting.yourcompany.com/your-name, certificate handled. The bare domain works too, and so does a link straight to one meeting.",
  ],
  ["No Meetrao badge", "Your booking page and your embed stop mentioning us."],
  ["Team links", "One link several people answer, rotating to whoever is free and least recently booked."],
  ["Sessions several guests share", "A class, a workshop, an office hour — one slot, several seats, counting down."],
  ["API keys and webhooks", "Read your bookings from your own tools, and get a signed POST when one changes."],
  ["Reminder timing", "Choose when both reminders land, instead of a day and an hour before."],
];

/**
 * What it does not do.
 *
 * This section is the reason the rest of the page is believable, and it is
 * placed before the sign-up invitation rather than after it. Anyone who needs
 * one of these should find that out here, in ten seconds, and not after
 * connecting a calendar.
 *
 * Keep it accurate as the product grows: a limit listed here that has since
 * been built reads as neglect, and one quietly deleted reads as worse.
 */
export const LIMITS: readonly [string, string][] = [
  ["Google Calendar only", "No Outlook, no iCloud, no CalDAV. If your calendar lives elsewhere, Meetrao cannot see your conflicts and is the wrong tool."],
  ["No payments", "You cannot charge for a booking. Nothing collects money."],
  ["No Zoom or Teams integration", "Meetrao creates Google Meet links itself. A meeting can be a phone call, an address or your own Zoom link — but that link is one you paste, not one it makes for you."],
  ["Round-robin only", "A team link goes to whoever is free and least recently booked. There is no collective availability — several hosts in one meeting — and no routing forms."],
  ["Reminders are email only", "One the day before and one an hour before, by email. No SMS, no WhatsApp, no push notifications."],
];

/**
 * Why it is free.
 *
 * The honest answer, which is also the most reassuring one available: it is
 * free because it is small and new, not because you are the product.
 */
export const WHY: readonly string[] = [
  "Meetrao is built and run by one person. There is no sales team to fund and no investor expecting a return this quarter, which is why the free plan is the real product rather than a demonstration of one.",
  "Free is not paid for with your data. Meetrao does not sell anything to anybody, does not run ads, and asks Google only whether a period is busy or free — never what your meetings are about, beyond whether your guest accepted the booking it made for you. The Privacy Policy names every permission it holds and why.",
  "Pro is priced to cover what it costs to run, not to extract what it is worth. A custom domain means a certificate and a support burden; hosting a logo means storage and bandwidth on every page view; a team link means several calendars checked on every page load. Ten dollars a year is roughly that, and it is what keeps the free plan from needing to be paid for some other way.",
];

/**
 * The questions someone reads a pricing page to answer.
 *
 * The shape matches `FAQS` in lib/faq.ts — [id, question, answer] — so the same
 * `faqLd()` builds the structured data from the array the page renders, and the
 * machine-readable answers cannot drift from the human ones.
 */
export const PRICING_FAQ: readonly (readonly [string, string, string])[] = [
  [
    "really-free",
    "Is Meetrao really free?",
    "Yes. Every feature listed on this page is on every account, with no card required and no subscription. There is no paid tier, which is why there is nothing on this page to compare against.",
  ],
  [
    "forever",
    "Is it free forever?",
    'We will not promise "forever" — nobody can, and a promise that cannot be kept is worth less than none. What the Terms commit to instead: Meetrao is free today, and if paid plans ever arrive you would be emailed before anything became chargeable and would have to opt in. A free account is never billed automatically. If you chose not to pay, you could export your data and close the account.',
  ],
  [
    "catch",
    "So what is the catch?",
    "The limits, and they are listed above rather than discovered later: Google Calendar only, no payments, no Zoom or Teams integration, round-robin without collective availability, and email-only reminders. There is no paid tier to be upsold to, so nothing here is a trial — but if you need one of those five things, Meetrao is the wrong choice and this page would rather say so now.",
  ],
  [
    "data",
    "Am I the product?",
    "No. Meetrao does not sell data, does not run ads, and does not share your calendar with anyone. It asks Google only whether a period is busy or free — never event titles, descriptions or attachments. For the events Meetrao creates itself it also reads whether your guest accepted or declined, which is how it can tell you. Disconnecting from Settings revokes the permission with Google, not just with us.",
  ],
  [
    "limits",
    "Are there usage limits?",
    "No published caps on bookings, meeting types or guests. Because this is a beta, the Terms do reserve the right to set limits on usage — that clause exists so an abusive account can be stopped, and it will not be used in a way designed to break bookings you already have.",
  ],
  [
    "card",
    "Do I need a credit card to sign up?",
    "No. Sign-up is an email address and a password, or your Google account. There is no card field anywhere in the product.",
  ],
];
