/* ─────────────────────────────────────────────────────────────────────────────
   Pages for the four kinds of work people say they do when they sign up.

   The failure mode this file exists to avoid: four pages with the same
   sentences and one noun swapped. That is a doorway page, search engines have
   recognised the shape for twenty years, and four of them would be worse for
   the site than none.

   So each entry leans on a DIFFERENT part of the product and carries its own
   limits:

     consultants  unlimited meeting types, notice and buffers
     coaches      sessions several guests share, reminders, time off
     freelancers  your own domain and branding on one person's link
     agencies     one link several people answer, priced per account

   `cannot` is not a disclaimer. It is the section that sends the wrong reader
   somewhere useful before they connect a calendar, which is the only version
   of this page worth publishing. Where a competitor is better at the named
   job, it links to the comparison that says so.
   ───────────────────────────────────────────────────────────────────────────── */

export type Audience = {
  slug: string;
  /** Rendered into the title template, so it carries no brand name itself. */
  title: string;
  description: string;
  /** The h1. Longer than the title, and allowed to be a sentence. */
  heading: string;
  /** The opening, straight to the job rather than to the product. */
  intro: string[];
  /** The feature this page is actually about, three ways. */
  does: [string, string][];
  /** What it will not do for this reader, and where to go instead. */
  cannot: [string, string][];
  /** A comparison worth reading if `cannot` disqualified Meetrao. */
  insteadSee: { label: string; href: string } | null;
  faq: [string, string][];
};

export const CONSULTANTS: Audience = {
  slug: "consultants",
  title: "Free scheduling software for consultants",
  description:
    "A short discovery call and a long working session need different links. Both are free on " +
    "Meetrao, with buffers and a notice period that protect the day.",
  heading: "Two meeting types, not one, and neither of them costs anything",
  intro: [
    "Consulting work starts with a twenty-minute call to find out whether there is work, and continues with ninety-minute sessions that need preparing for. Those are two different things to book and most free plans let you publish one of them.",
    "Meetrao has no limit on meeting types. A short intro, a scoping call, a monthly review and a workshop can each have their own link, their own duration and their own description, on the free account.",
  ],
  does: [
    [
      "Every meeting type you need, free",
      "Each one gets a name, a duration, a description and its own short link, so what somebody books is already the right length. Calendly's free plan allows one, which is the wall most consultants hit first.",
    ],
    [
      "Notice and buffers, so a day stays workable",
      "A minimum notice period stops somebody booking your next hour. Buffers either side stop three calls landing back to back. Both are per meeting type, so a discovery call can be bookable tomorrow while a workshop needs a week.",
    ],
    [
      "The timezone is handled before anybody gets it wrong",
      "Your guest sees times in their own timezone, converted from yours, without being asked which one they are in. For work across regions that is the single most common source of a missed first call.",
    ],
    [
      "Context before the call, not after",
      "The booking form takes a note, and it reaches you with the booking and sits on the calendar event. Enough to arrive at a discovery call knowing what it is about.",
    ],
  ],
  cannot: [
    [
      "It cannot take a deposit",
      "Nothing in Meetrao collects money, so a paid consultation has to be invoiced separately. If taking payment at the point of booking is how you work, this is the wrong tool and it is better to know now.",
    ],
    [
      "It reads one Google Calendar",
      "If your availability is spread across a work calendar and a personal one, or lives in Outlook, Meetrao will offer times you are not actually free.",
    ],
    [
      "Every enquiry gets the same link",
      "There is no way to ask two qualifying questions and send an enterprise enquiry somewhere different from a one-afternoon job. Whoever opens the meeting type sees the same availability you published.",
    ],
  ],
  insteadSee: { label: "Meetrao vs Calendly", href: "/vs/calendly" },
  faq: [
    [
      "How many meeting types can I publish on the free plan?",
      "As many as you want. There is no cap, and no plan that raises one, because the limit does not exist.",
    ],
    [
      "Can clients book a paid consultation?",
      "They can book the time. They cannot pay for it here. Meetrao never touches money, so the invoice is yours to send.",
    ],
    [
      "Can I stop people booking me tomorrow morning?",
      "Yes. Each meeting type has a minimum notice period, so a workshop can require a week while an intro call stays bookable the next day.",
    ],
  ],
};

export const COACHES: Audience = {
  slug: "coaches",
  title: "Free scheduling software for coaches",
  description:
    "One-to-one sessions, group calls where several people book the same slot, and two reminders " +
    "before each one. Free to take bookings, $30 a year for groups.",
  heading: "One-to-one sessions, group calls, and two reminders before each",
  intro: [
    "Coaching is mostly the same hour repeating, with a cohort call in the middle of it and a stretch of leave twice a year. The scheduling part is not complicated; what it has to do is stop people forgetting.",
    "Meetrao sends a reminder the day before and another an hour before, on every booking, free. Pro adds sessions several guests share, which is the thing a group call actually needs.",
  ],
  does: [
    [
      "Sessions several guests share",
      "One slot, several seats, counting down as people take them. A cohort call, an office hour or a workshop is one link rather than one booking per person. This is on Pro, at $30 a year.",
    ],
    [
      "Two reminders, on every booking",
      "The day before and an hour before, by email, to your guest and to you. Pro lets you choose when both land. There is no setting to forget to turn on, because it is on.",
    ],
    [
      "Time off that actually blocks",
      "A date range marked off disappears from every meeting type at once, so a week away does not mean editing each link, and does not mean a client booking into it.",
    ],
    [
      "Rescheduling without a message to you",
      "A guest moves their own session from the link in their confirmation. The calendar event moves with it on both sides, and nobody has to negotiate a new time by email.",
    ],
  ],
  cannot: [
    [
      "It does not sell packages or memberships",
      "Six sessions prepaid, a membership, a gift certificate, a card on file: none of that exists here. Acuity Scheduling is built for exactly this and does it properly.",
    ],
    [
      "Reminders are email, never SMS",
      "If your clients need a text to show up, Meetrao will not send one on any plan.",
    ],
    [
      "There is no client file",
      "Meetrao keeps a contact list assembled from who has booked. It does not hold session notes, intake forms or a history you can write into.",
    ],
  ],
  insteadSee: { label: "Meetrao vs Acuity Scheduling", href: "/vs/acuity-scheduling" },
  faq: [
    [
      "Can several people book the same slot?",
      "Yes, on Pro. A session has a number of seats and counts down as they are taken, which is what a group call or a class needs.",
    ],
    [
      "Can I charge for a coaching session through Meetrao?",
      "No. Nothing here collects money, and there is no plan that adds it. Payment happens wherever you already invoice.",
    ],
    [
      "What stops no-shows?",
      "Two reminders by email, one the day before and one an hour before, on every booking including the free plan. No SMS, which is the honest limit.",
    ],
  ],
};

export const FREELANCERS: Audience = {
  slug: "freelancers",
  title: "A free booking link for freelancers",
  description:
    "Your booking page on meet.yourname.com with your logo and your colours, for $30 a year. " +
    "Taking bookings is free, and there is no card to put on file.",
  heading: "A booking link that looks like your business, not like a tool you rented",
  intro: [
    "Working alone means your link goes in proposals, in email signatures and at the end of pitches, and it is read by people deciding whether you are a going concern. Most scheduling links tell them which product you signed up for.",
    "Meetrao's booking product is free. For $30 a year the page carries your domain, your logo and your colours, and stops mentioning Meetrao at all.",
  ],
  does: [
    [
      "Your own domain, for $30 a year",
      "meet.yourname.com/you, and the bare subdomain works too. One CNAME record and the certificate is handled. Calendly has no custom-domain feature at any price; SavvyCal puts it on a plan costing more per month than this does per year.",
    ],
    [
      "Your logo and your colours",
      "Your mark in place of ours, an accent and a page background that carry through the calendar, the buttons and the confirmation. The readable shades are worked out for you, so a guest can read the page whatever you pick.",
    ],
    [
      "No card on file for the free account",
      "Taking bookings costs nothing and keeps costing nothing. Nothing expires, nothing counts down, and there is no subscription to remember to cancel between contracts.",
    ],
    [
      "An embed for the site you already have",
      "The booking page drops into your own site as an embed, and the Meetrao badge comes off it on Pro like it does everywhere else.",
    ],
  ],
  cannot: [
    [
      "It cannot take a deposit before the work",
      "A booking is a time, not a transaction. If you need money up front to hold a slot, nothing here does that.",
    ],
    [
      "The domain has to be a subdomain",
      "meet.yourname.com, not yourname.com. The record is a CNAME, and a CNAME cannot sit on an apex domain.",
    ],
    [
      "One Google Calendar, and only Google",
      "No Outlook, no iCloud, no second calendar. If your real availability is split across two, this will get it wrong.",
    ],
  ],
  insteadSee: { label: "What a custom domain costs elsewhere", href: "/custom-domain" },
  faq: [
    [
      "What does the free plan actually include?",
      "Your link, unlimited meeting types, unlimited bookings, reminders, rescheduling and time off, with no card. Pro is $30 a year and adds the domain, the branding, team links, shared sessions and the API.",
    ],
    [
      "Do I need to own a domain already?",
      "Yes, and you cannot buy one here. You point a subdomain of a domain you own at Meetrao with one CNAME record.",
    ],
    [
      "Will my old link stop working?",
      "No. The meetrao.com link keeps working permanently, so anything already printed or sent is safe.",
    ],
  ],
};

export const AGENCIES: Audience = {
  slug: "agencies",
  title: "Free round-robin scheduling for agencies",
  description:
    "One link several people answer, rotating to whoever is free and least recently booked. " +
    "Priced per account at $30 a year, not per seat.",
  heading: "One link several people answer, priced per account",
  intro: [
    "An agency's problem is not a calendar, it is which calendar. A prospect should not have to know who handles new business this week, and a team should not be forwarding emails to find out who is free.",
    "A Meetrao team link goes to whoever is free and least recently booked. It is part of Pro, at $30 a year for the account, which is the number to hold next to anything quoted per user per month.",
  ],
  does: [
    [
      "Round-robin across the people on the link",
      "Availability is the union of everybody's real calendars, and the booking goes to whoever is free and has gone longest without one. The guest picks a time and never picks a person.",
    ],
    [
      "Priced per account, not per seat",
      "Adding somebody to a round-robin does not change the bill. Cal.com's Teams plan is $12 per user per month on the yearly plan; SavvyCal is $12 per user per month, or $10 per user per month billed annually. Meetrao Pro is $30 a year full stop.",
    ],
    [
      "On your domain, with your branding",
      "The team link sits on the same custom domain and carries the same logo and colours as everything else on the account, so a prospect sees the agency rather than a scheduler.",
    ],
    [
      "An API and signed webhooks",
      "Read bookings into your own tools and get a signed POST when one changes, so the CRM entry is somebody's code rather than somebody's job.",
    ],
  ],
  cannot: [
    [
      "There is no collective availability",
      "A round-robin finds one free person. It cannot find a slot where three named people are free at once, which is what a pitch meeting needs.",
    ],
    [
      "A team link cannot split by answer",
      "You cannot put three questions in front of a prospect and send them to the paid-media team or the brand team by what they say. One link is one round-robin, over the people you put on it.",
    ],
    [
      "No CRM integration",
      "Nothing writes into HubSpot or Salesforce by itself. The API and the webhook are the hooks; the integration is yours to build.",
    ],
  ],
  insteadSee: { label: "Meetrao vs Cal.com", href: "/vs/cal-com" },
  faq: [
    [
      "How does the round-robin choose?",
      "Whoever is free at the time the guest picked and has gone longest since their last booking on that link. There is no priority setting and no manual override.",
    ],
    [
      "Does each person on the team need a paid seat?",
      "No. Pro is $30 a year for the account, and the people on a team link are not billed individually.",
    ],
    [
      "Can we book a meeting with three of us at once?",
      "Not with a team link. Round-robin sends a booking to one person; collective availability across several named hosts is not something Meetrao does.",
    ],
  ],
};

export const AUDIENCES = [CONSULTANTS, COACHES, FREELANCERS, AGENCIES];
