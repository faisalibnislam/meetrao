/* ─────────────────────────────────────────────────────────────────────────────
   The landing page's questions and answers.

   Data, not markup, and deliberately not inside faq.tsx. That file is a client
   component, and a Server Component importing a plain value from a "use client"
   module does not get the value. It gets a client reference, which looks like
   an object right up until something calls .map on it. The FAQ JSON-LD on the
   landing page does exactly that, so the array lives here where both sides can
   really read it.
   ───────────────────────────────────────────────────────────────────────────── */

import {
  BUSINESS_LIMITS,
  BUSINESS_MONTHLY,
  BUSINESS_YEARLY,
  PRO_MONTHLY,
  PRO_YEARLY,
} from "@/lib/pricing";

/* The prices come from lib/pricing.ts rather than being typed into the
   answers. Business shipped and this page kept describing two plans, which
   is what a typed price does: it stays right about the world it was written
   in. */

/* The answers are deliberately plain about what Meetrao does not do, one
   calendar feed, one meeting location, one weekly schedule, no promise of
   "free forever" that could not be kept. */

export const FAQS: [string, string, string][] = [
  [
    "what",
    "What is Meetrao?",
    "A meeting and appointment scheduler. Add your calendar's feed, set the hours you are free, and share one link. People pick from what is actually open, and you both get a calendar invite by email.",
  ],
  [
    "free",
    "What is free, and what costs money?",
    `Taking bookings is free: your links, your meeting types, calendar conflict checks, calendar invites, reminders, rescheduling and time off, with no card and no limit on bookings. Pro is ${PRO_YEARLY} (or ${PRO_MONTHLY}) and adds your own domain, removal of the Meetrao badge, a team link, sessions several guests share, and the API. Business is ${BUSINESS_YEARLY} (or ${BUSINESS_MONTHLY}) and runs all of that across up to ${BUSINESS_LIMITS.companies} companies, with up to ${BUSINESS_LIMITS.membersPerCompany} people on each.`,
  ],
  [
    "forever",
    "Will the free plan stay free?",
    'We cannot honestly promise "forever", and the Terms say so rather than burying it. What we do commit to: a free account is never billed automatically. A paid plan begins only when you choose it, and if you cancel it runs to the end of the period you paid for.',
  ],
  [
    "account",
    "Do guests need an account?",
    "No. They give a name, an email and an optional note. No sign-up, no password, no download.",
  ],
  [
    "google",
    "Does it work with Google Calendar?",
    "Yes, and with Outlook, iCloud and any calendar that publishes an .ics feed. You paste your calendar's private feed address in Settings and Meetrao checks it for busy times. Google can take a few hours to update its feed, so an event you have just added may not block a slot straight away. Meetrao never asks for access to your Google account's calendar.",
  ],
  [
    "meet",
    "Does it create video links?",
    "No. You save your own video link once, a Zoom, Google Meet, Teams or Whereby room, and every video booking carries it in the confirmation and the calendar invite.",
  ],
  [
    "double",
    "How does it prevent double booking?",
    "Before offering any slot, Meetrao checks your bookings and the busy times from your calendar feed, and hides anything you are already busy for. It checks again at the moment of booking, so if two people pick the same slot only the first gets it.",
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
    "Yes: a buffer either side, a minimum notice period so nobody grabs the next ten minutes, and a booking window limiting how far ahead people can book.",
  ],
  [
    "cancel",
    "Can people cancel or reschedule?",
    "Both. Cancelling notifies the other side, removes the meeting from both calendars through the emailed invite, and reopens the slot. Moving a meeting keeps the same booking and the same video link. The guest picks a new time from the link in their confirmation, and the updated invite moves it on both calendars.",
  ],
  [
    "private",
    "Is my calendar private?",
    "From your calendar feed Meetrao keeps only busy start and end times, never event titles, descriptions, attendees or locations. The feed address is stored privately and shown masked. It never asks for access to your calendar account and never writes to it. Remove the feed any time from Settings, and the address and the busy times kept from it are deleted.",
  ],
  [
    "who",
    "Who is Meetrao for?",
    "Anyone whose work starts with a conversation, freelancers, consultants, agencies, sales teams, coaches and remote teams.",
  ],
  [
    "compare",
    "How does it compare with paid tools?",
    `Taking bookings is free: the links, the calendar checks, reminders, rescheduling and time off, with no card. Pro is ${PRO_YEARLY} for a custom domain, your own branding, team links, shared sessions and the API, and Business is ${BUSINESS_YEARLY} for several companies with other people on them. It is still deliberately narrow: one calendar feed, no payments at booking, no routing forms. There are full comparisons with Calendly and with Cal.com, including where each of them is the better choice.`,
  ],
];
