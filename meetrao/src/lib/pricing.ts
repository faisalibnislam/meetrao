/* ─────────────────────────────────────────────────────────────────────────────
   The pricing page's content.

   A plain `.ts`, not a `.tsx`, and not co-located with the component that
   renders it. A Server Component importing a plain value from a `"use client"`
   module gets a client reference rather than the value — which looks fine until
   something calls `.map` on it and the page 500s. That happened once with the
   FAQ array; `lib/faq.ts` exists for the same reason this file does.

   ── on writing a pricing page for something that costs nothing ──

   The hard part is not the number. It is that "free" is the most distrusted
   word in this category, and a page that only repeats it louder confirms the
   suspicion. So the order here is: the number, then everything included, then
   — before any invitation to sign up — what the product genuinely cannot do,
   and why it is free at all.

   Every claim has to survive being read next to /terms §5, which says Meetrao
   is free while in beta and that paid plans are intended later. Nothing here
   says "free forever". It says free today, no card, no trial clock, nothing
   locked, and that an existing account is never billed without opting in —
   each of which is separately true and separately checkable.
   ───────────────────────────────────────────────────────────────────────────── */

/** The headline claim, and the three denials under it. */
export const HEADLINE = "Everything. Nothing to pay.";

export const DENIALS: readonly [string, string][] = [
  ["No credit card", "Not at sign-up, not later. There is no card field in the product."],
  ["No trial clock", "Nothing expires in 14 days, because there is no paid tier for it to expire into."],
  ["No locked features", "Every feature on this site is on every account. There is no plan to compare against."],
];

/**
 * What you get — which is the whole product, because there is only one tier.
 *
 * Written as capabilities rather than adjectives, and each one is a thing you
 * could go and check within a minute of signing up. A feature list on a pricing
 * page is a promise with a receipt attached.
 */
export const INCLUDED: readonly string[] = [
  "One public booking link — meetrao.com/your-name",
  "Unlimited meeting types, each with its own duration and description",
  "Google Calendar connected, and checked for conflicts before a slot is offered",
  "A Google Meet link created on every confirmed booking",
  "Guests book without an account, in their own timezone",
  "Weekly working hours, with several ranges a day",
  "Buffers between meetings, minimum notice, and a booking window",
  "Email confirmations to both sides, and cancellation from either",
  "A contact list that fills itself from your bookings, with CSV export",
  "Unlimited bookings a month",
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
  ["Google Meet only", "No Zoom, no Teams, no phone or in-person locations yet."],
  ["No payments", "You cannot charge for a booking. Nothing collects money."],
  ["No team features", "No round-robin, no collective availability, no routing forms. One person, one calendar."],
  ["No rescheduling yet", "A guest can cancel and book again from your link, which gets to the same place in two steps rather than one."],
];

/**
 * Why it is free.
 *
 * The honest answer, which is also the most reassuring one available: it is
 * free because it is small and new, not because you are the product.
 */
export const WHY: readonly string[] = [
  "Meetrao is built and run by one person. There is no sales team to fund, no investor expecting a return this quarter, and no growth target that a paywall would be the answer to.",
  "It is not free because your data is worth something. Meetrao does not sell anything to anybody, does not run ads, and asks Google only whether a period is busy or free — never what your meetings are about. The Privacy Policy names every permission it holds and why.",
  "It is free because it is small. It does a narrow job, it costs little to run at this size, and charging for it today would buy a billing system nobody has asked for.",
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
    "The limits, and they are listed above rather than discovered later: Google Calendar only, Google Meet only, no payments, no team features, and no rescheduling yet. There is no paid tier to be upsold to, so nothing here is a trial — but if you need one of those five things, Meetrao is the wrong choice and this page would rather say so now.",
  ],
  [
    "data",
    "Am I the product?",
    "No. Meetrao does not sell data, does not run ads, and does not share your calendar with anyone. It asks Google only whether a period is busy or free — never event titles, guests, descriptions or attachments. Disconnecting from Settings revokes the permission with Google, not just with us.",
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
