/* ─────────────────────────────────────────────────────────────────────────────
   The landing page's questions and answers.

   Data, not markup, and deliberately not inside faq.tsx. That file is a client
   component, and a Server Component importing a plain value from a "use client"
   module does not get the value — it gets a client reference, which looks like
   an object right up until something calls .map on it. The FAQ JSON-LD on the
   landing page does exactly that, so the array lives here where both sides can
   really read it.
   ───────────────────────────────────────────────────────────────────────────── */

/* The answers are deliberately plain about what Meetrao does not do — one
   calendar provider, one meeting location, one weekly schedule, no promise of
   "free forever" that could not be kept. */

export const FAQS: [string, string, string][] = [
  [
    "what",
    "What is Meetrao?",
    "A meeting and appointment scheduler. Connect your Google Calendar, set the hours you are free, and share one link. People pick from what is actually open, and the meeting is booked with a Google Meet link on both calendars.",
  ],
  [
    "free",
    "Is Meetrao really free?",
    "Yes. Every feature on this page is free to use, with no card required and no subscription.",
  ],
  [
    "forever",
    "Is it free forever?",
    'We cannot honestly promise "forever". What we do commit to: Meetrao is free today, and if paid plans ever arrive we will email you before anything becomes chargeable and you would have to opt in. A free account is never billed automatically.',
  ],
  [
    "account",
    "Do guests need an account?",
    "No. They give a name, an email and an optional note. No sign-up, no password, no download.",
  ],
  [
    "google",
    "Does it work with Google Calendar?",
    "Yes — it is the integration Meetrao is built on, and currently the only calendar it connects to.",
  ],
  [
    "meet",
    "Does it create Google Meet links?",
    "Yes. Every confirmed booking gets its own Meet link, attached to the calendar event on both sides.",
  ],
  [
    "double",
    "How does it prevent double booking?",
    "Before offering any slot, Meetrao checks your calendar for conflicts and hides anything you are already busy for. It checks again at the moment of booking, so if two people pick the same slot only the first gets it.",
  ],
  [
    "tz",
    "Does it handle timezones?",
    "Yes. Set yours once; guests see your hours converted into theirs. Ninety-four timezones, correct through daylight saving.",
  ],
  [
    "hours",
    "Can I set working hours?",
    "Yes. Tick the days you work and set the hours in each. A day can have more than one range, so you can protect a lunch break.",
  ],
  [
    "buffer",
    "Can I add buffer time?",
    "Yes — a buffer either side, a minimum notice period so nobody grabs the next ten minutes, and a booking window limiting how far ahead people can book.",
  ],
  [
    "cancel",
    "Can people cancel or reschedule?",
    "Both. Cancelling notifies the other side, removes the calendar event and reopens the slot. Moving a meeting keeps the same booking and the same Google Meet link — the guest picks a new time from the link in their confirmation, and both calendars follow.",
  ],
  [
    "private",
    "Is my calendar private?",
    "Meetrao reads only whether a period is busy or free — never event titles, descriptions, locations or attachments. The one exception is the events it creates itself: for those, and only those, it reads whether your guest accepted or declined, so you are told before you sit in an empty Meet. Disconnect any time from Settings.",
  ],
  [
    "who",
    "Who is Meetrao for?",
    "Anyone whose work starts with a conversation — freelancers, consultants, agencies, sales teams, coaches and remote teams.",
  ],
  [
    "compare",
    "How does it compare with paid tools?",
    "Taking bookings is free and always has been — the link, the calendar checks, reminders, rescheduling and time off, with no card. Pro is $10 a year for a custom domain, your own branding, team links, shared sessions and the API. It is still deliberately narrow: one calendar provider, no payments at booking, no routing forms. There are full comparisons with Calendly and with Cal.com, including where each of them is the better choice.",
  ],
];
