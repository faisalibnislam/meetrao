/* ─────────────────────────────────────────────────────────────────────────────
   What Meetrao says about the tools people are choosing between.

   Three rules, and they are not politeness. They are what keeps a comparison
   page useful, rankable and out of court:

   1. Every claim about another product is a fact you could check, attributed to
      that product's own published pricing, and dated. Software pricing changes;
      an undated figure is wrong eventually and is nobody's fault but ours.
   2. Nothing derogatory, and nothing about how they "lock you in". Calendly and
      Cal.com are good products. A page that pretends otherwise reads as
      marketing and gets treated as marketing.
   3. Where the other tool is genuinely better, this page says so first. That is
      the section a reader trusts, and it is the reason they believe the rest.

   `checkedOn` is printed on the page. When it goes stale, it says so out loud
   rather than quietly misleading somebody, see README § SEO for the re-check.
   ───────────────────────────────────────────────────────────────────────────── */

export type Edge = "meetrao" | "them" | "even";

export type Row = {
  feature: string;
  meetrao: string;
  them: string;
  edge: Edge;
};

export type Comparison = {
  slug: string;
  competitor: string;
  /** Their own pricing page, so a reader can check every figure here. */
  competitorUrl: string;
  /** When the figures below were last read. Rendered on the page. */
  checkedOn: string;
  /** One sentence for the page title. */
  title: string;
  description: string;
  /** The honest summary, first thing on the page. */
  summary: string[];
  rows: Row[];
  /** Where the other tool is better. Deliberately first in the layout. */
  theirWins: [string, string][];
  meetraoWins: [string, string][];
  chooseThem: string[];
  chooseMeetrao: string[];
  faq: [string, string][];
};

const CHECKED = "October 2026";

/* Every figure below was read off the vendor's own pricing page on 3 October
   2026, with the billing toggle set each way, rather than taken from a pricing
   tracker. Two of the five pages (Calendly, Cal.com) default to the discounted
   yearly rate with no label on the number itself, which is exactly how a
   comparison page ends up quoting the lower figure and calling it the price.
   Both rates are given here wherever both are published.

   Cal.com is the exception: its pricing page shows the yearly rate and a "Save
   25%" badge, and does not publish the monthly rate at all. The row says so
   rather than working it backwards out of the percentage. */

export const CALENDLY: Comparison = {
  slug: "calendly",
  competitor: "Calendly",
  competitorUrl: "https://calendly.com/pricing",
  checkedOn: CHECKED,
  title: "Free Calendly Alternative: Meetrao vs Calendly",
  description:
    "How Meetrao and Calendly compare for appointment booking: what each does, where Calendly's " +
    "free plan stops, and which one to pick.",
  summary: [
    "Calendly is the tool most people mean when they say “send me your link”. It is mature, it has a free plan, and for teams that need payments, routing or collective scheduling it does things Meetrao does not.",
    "The difference that sends people looking is the free plan's shape. Calendly's free tier is limited to one event type and one connected calendar, enough for a single repeated meeting, and the point at which most people either upgrade or go looking. Meetrao has no such line: taking bookings is the free account, and the paid tier adds a domain and branding rather than the ability to book.",
    "Meetrao is narrower on purpose. If what you need is a booking link that respects your real calendar and puts a Google Meet link on both sides, it does that and does not charge for it. If you need more than that, this page says so.",
  ],
  rows: [
    { feature: "Price", meetrao: "Free; Pro $30 a year", them: "Free tier; Standard $12 per seat per month, or $10 per seat per month billed annually", edge: "meetrao" },
    { feature: "Meeting types on the free plan", meetrao: "Unlimited", them: "One", edge: "meetrao" },
    { feature: "Calendars connected", meetrao: "One (Google)", them: "One on free, six on paid", edge: "them" },
    { feature: "Guests need an account", meetrao: "No", them: "No", edge: "even" },
    { feature: "Video link on every booking", meetrao: "Google Meet, always", them: "Meet, Zoom, Teams and others", edge: "them" },
    { feature: "Timezone conversion for guests", meetrao: "Yes", them: "Yes", edge: "even" },
    { feature: "Buffers, notice period, booking window", meetrao: "Yes", them: "Yes", edge: "even" },
    { feature: "Branding on your booking page", meetrao: "Meetrao wordmark; your own logo on Pro", them: "Calendly badge on free, removable on paid", edge: "even" },
    { feature: "Custom domain for your link", meetrao: "Yes, on Pro at $30 a year", them: "Not offered: the link stays on calendly.com", edge: "meetrao" },
    { feature: "Reschedule flow", meetrao: "Yes", them: "Yes", edge: "even" },
    { feature: "Reminders", meetrao: "Email, the day before and an hour before", them: "Email and SMS, configurable", edge: "them" },
    { feature: "Take payment at booking", meetrao: "No", them: "Yes, on paid plans", edge: "them" },
    { feature: "Round-robin team links", meetrao: "Yes, on Pro", them: "Yes, on Teams plans", edge: "meetrao" },
    { feature: "Collective availability and routing forms", meetrao: "No", them: "Yes, on Teams plans", edge: "them" },
    { feature: "CRM and automation integrations", meetrao: "None", them: "Many", edge: "them" },
    { feature: "Reads your event titles", meetrao: "Never: busy and free only", them: "See their privacy policy", edge: "meetrao" },
  ],
  theirWins: [
    ["It does considerably more", "Payments at booking, collective scheduling, routing forms, several video providers, SMS reminders, and a long list of integrations. Meetrao has round-robin team links and none of the rest, and is not planning most of them."],
    ["Calendars beyond Google", "Outlook, iCloud and Exchange, and six of them at once on a paid plan. Meetrao connects to one Google Calendar and nothing else."],
    ["Reminders you control", "Calendly lets you decide how many reminders go out, when, and whether by email or SMS. Meetrao sends two, by email, the day before and an hour before, and there is no setting for it."],
    ["It is not one person", "Calendly has a support organisation, an uptime commitment and a company behind it. Meetrao is built and run by one person, and this page would be dishonest if it pretended otherwise."],
  ],
  meetraoWins: [
    ["No limit that exists to sell you something", "Taking bookings is free and has no cap on it. The paid tier adds a domain, branding and team links, not the ability to book."],
    ["Unlimited meeting types, free", "Calendly's free plan allows one. If you run a 15-minute intro and a 60-minute deep dive, that is the wall most people hit first."],
    ["A domain of your own, for $30 a year", "Calendly has no custom-domain feature on any published plan, so the link stays on calendly.com whatever you pay. Meetrao's is $30 a year, and your link reads meet.yourcompany.com instead."],
    ["It reads busy and free, never what your meetings are", "Meetrao asks Google which periods are busy. It never requests event titles, guests, descriptions or attachments, see the Privacy Policy, which names every permission."],
    ["No card, no trial countdown", "Nothing expires, and there is no card on file to forget about."],
  ],
  chooseThem: [
    "You need to take payment when someone books",
    "You need collective availability or routing forms, not just round-robin",
    "You use Outlook, iCloud or Exchange rather than Google Calendar",
    "You need it to write into a CRM",
    "You need a vendor with a support contract",
  ],
  chooseMeetrao: [
    "You want more than one meeting type without paying for it",
    "Google Calendar is where your life already is",
    "You want your booking link on your own domain",
    "You would rather not have a card on file for a scheduling tool",
    "You care what a scheduling tool can read in your calendar",
  ],
  faq: [
    [
      "Is Meetrao a free alternative to Calendly?",
      "Yes, for the core job: a booking link that checks your Google Calendar, converts timezones for guests, and puts a Google Meet link on both calendars, plus rescheduling, reminders, group sessions and time off. It does not replace Calendly's payments, routing forms or CRM integrations.",
    ],
    [
      "What is the catch?",
      "Free is the whole booking product, not a trial of it: your link, unlimited meeting types and bookings, reminders, rescheduling and time off, with no card. Pro is $30 a year and adds a custom domain, your own branding, team links, shared sessions and the API. A free account is never billed automatically. The real limits are the ones on this page: Google Calendar only, no payments at booking, no Zoom or Teams integration, round-robin without collective availability, email-only reminders.",
    ],
    [
      "Can I move from Calendly to Meetrao?",
      "There is no import. You create your meeting types again (a name, a duration and a description each), set your hours, and share the new link. For one or two meeting types it takes a few minutes.",
    ],
  ],
};

export const CAL_COM: Comparison = {
  slug: "cal-com",
  competitor: "Cal.com",
  competitorUrl: "https://cal.com/pricing",
  checkedOn: CHECKED,
  title: "Free Cal.com Alternative: Meetrao vs Cal.com",
  description:
    "How Meetrao and Cal.com compare for meeting scheduling: what each does, where Cal.com is the " +
    "stronger product, and which one to pick.",
  summary: [
    "Cal.com is the most capable free scheduler most people can name. Its individual plan is genuinely generous (unlimited event types and unlimited calendar connections), and on a feature count it beats Meetrao comfortably.",
    "So this page is not going to claim Meetrao does more. It does less, deliberately: one calendar provider, one meeting location, one weekly schedule, and a single screen for each of them. Cal.com's power comes with the surface area that power needs.",
    "Pick Meetrao if the shortest path from “I need a booking link” to having one matters more to you than what the tool could do later. Pick Cal.com if you want room to grow into it.",
  ],
  rows: [
    { feature: "Price for one person", meetrao: "Free; Pro $30 a year", them: "Free", edge: "even" },
    { feature: "Price for a team", meetrao: "Pro, $30 a year, round-robin only", them: "Teams, $12 per user per month on the yearly plan", edge: "meetrao" },
    { feature: "Meeting types", meetrao: "Unlimited", them: "Unlimited", edge: "even" },
    { feature: "Calendars connected", meetrao: "One (Google)", them: "Unlimited, several providers", edge: "them" },
    { feature: "Video providers", meetrao: "Meet, or your own link pasted in", them: "Cal Video, Meet, Zoom and others", edge: "them" },
    { feature: "Guests need an account", meetrao: "No", them: "No", edge: "even" },
    { feature: "Timezone conversion for guests", meetrao: "Yes", them: "Yes", edge: "even" },
    { feature: "Buffers, notice period, booking window", meetrao: "Yes", them: "Yes", edge: "even" },
    { feature: "Reminders", meetrao: "Email, the day before and an hour before", them: "Email and SMS, with workflows", edge: "them" },
    { feature: "Reschedule flow", meetrao: "Yes", them: "Yes", edge: "even" },
    { feature: "Routing forms", meetrao: "No", them: "Yes, on Teams", edge: "them" },
    { feature: "Take payment at booking", meetrao: "No", them: "Yes", edge: "them" },
    { feature: "Remove the vendor's branding", meetrao: "On Pro, with your own logo and colours", them: "On Teams", edge: "meetrao" },
    { feature: "Self-hosting", meetrao: "No", them: "Yes", edge: "them" },
    { feature: "Settings to get through before your first link", meetrao: "Three screens", them: "More", edge: "meetrao" },
  ],
  theirWins: [
    ["More of everything", "Routing forms, workflows, several calendar providers, several video providers, payments, collective scheduling. On features this is not close, and pretending otherwise would waste your time."],
    ["Self-hosting", "You can run Cal.com on your own infrastructure, which is a thing Meetrao cannot offer at any price and is the right answer for anybody whose data cannot leave their own servers."],
    ["Teams", "Cal.com has the full set: round-robin, collective availability, routing, per-team billing. Meetrao has a round-robin team link and stops there."],
    ["A company behind it", "Cal.com is a funded company with a roadmap and a support function. Meetrao is one person, which is the whole reason the free plan can be what it is and also the reason to think twice."],
  ],
  meetraoWins: [
    ["Less to set up", "Connect Google, describe one meeting, tick your hours. Three screens and the link works."],
    ["One obvious way to do each thing", "There is one weekly schedule, one meeting location and one calendar. Fewer choices is the feature, and it is the wrong feature for some people."],
    ["Your own branding without a per-seat plan", "Removing Cal.com's branding means the Teams plan. On Meetrao your logo, your colours and your own domain are $30 a year for the account, not per user per month."],
    ["Explicit about what it reads", "The Privacy Policy names every Google permission requested, says plainly that calendar.events is broader than the use made of it, and carries the Limited Use disclosure."],
  ],
  chooseThem: [
    "You need collective scheduling, routing or workflows",
    "You want to self-host",
    "You use more than one calendar, or a provider other than Google",
    "You need to take payment at booking",
    "You want a product that will keep growing features",
  ],
  chooseMeetrao: [
    "You want a booking link working in the next five minutes",
    "Google Calendar and Google Meet are what you already use",
    "You find most scheduling tools have more settings than you need",
    "You are one person, or a handful sharing one link",
  ],
  faq: [
    [
      "Is Cal.com not already free?",
      "For an individual, yes, and generously so. This page does not argue that Meetrao is cheaper. It argues that it is smaller. If Cal.com's free plan suits you, it is an excellent choice and you should use it.",
    ],
    [
      "What does Meetrao do that Cal.com does not?",
      "Less. The honest answer is that Meetrao's advantage is scope, not capability: fewer screens, fewer decisions, and one way to do each thing. The one place it is cheaper is branding, where Cal.com asks for a per-user Teams plan and Meetrao asks $30 a year.",
    ],
    [
      "Will Meetrao add teams and payments?",
      "Team links exist on Pro. Payments, routing and collective availability are not planned. It is built and maintained by one person, and the things on this page it does not do are mostly things it has chosen not to do.",
    ],
  ],
};

export const ACUITY: Comparison = {
  slug: "acuity-scheduling",
  competitor: "Acuity Scheduling",
  competitorUrl: "https://www.acuityscheduling.com/pricing",
  checkedOn: CHECKED,
  title: "Free Acuity Scheduling Alternative: Meetrao vs Acuity",
  description:
    "How Meetrao and Acuity Scheduling compare: an appointment business tool against a booking " +
    "link, what each is for, and which one to pick.",
  summary: [
    "Acuity Scheduling is a business tool for people who sell appointments. Intake forms, deposits, packages, memberships, gift certificates, client records and SMS reminders are the product, and if you run a clinic, a studio or a practice it is doing a job Meetrao does not attempt.",
    "It also has no free plan. Every tier is paid after a seven-day trial, and the entry tier connects one calendar. That is reasonable for a business billing clients through it, and it is the thing to know before you start comparing features.",
    "Meetrao is a booking link. It checks your Google Calendar, converts timezones, and puts a Google Meet link on both sides. If money never changes hands at the point of booking, most of what Acuity charges for is not a thing you need.",
  ],
  rows: [
    { feature: "Price", meetrao: "Free; Pro $30 a year", them: "Starter $20 per month, or $16 per month billed annually", edge: "meetrao" },
    { feature: "Free plan", meetrao: "Yes, the whole booking product", them: "No, a seven-day trial", edge: "meetrao" },
    { feature: "Calendars on the entry plan", meetrao: "One (Google)", them: "One", edge: "even" },
    { feature: "Take payment at booking", meetrao: "No", them: "Stripe, Square, PayPal and Venmo", edge: "them" },
    { feature: "Packages, memberships, gift certificates", meetrao: "No", them: "Yes, from the Standard plan", edge: "them" },
    { feature: "Intake forms", meetrao: "One note field", them: "Custom client forms", edge: "them" },
    { feature: "Client records", meetrao: "A contact list built from bookings", them: "Full client management", edge: "them" },
    { feature: "SMS reminders", meetrao: "No", them: "Yes, from the Standard plan", edge: "them" },
    { feature: "Guests need an account", meetrao: "No", them: "No", edge: "even" },
    { feature: "Timezone conversion for guests", meetrao: "Yes", them: "Yes", edge: "even" },
    { feature: "Video link on every booking", meetrao: "Google Meet, always", them: "Meet, Zoom and GoToMeeting", edge: "them" },
    { feature: "Custom domain for your link", meetrao: "Yes, on Pro at $30 a year", them: "Not offered: embed the scheduler in a site you own", edge: "meetrao" },
    { feature: "Remove the vendor's logo", meetrao: "On Pro, with your own logo and colours", them: "On the Premium plan", edge: "meetrao" },
    { feature: "HIPAA BAA", meetrao: "No", them: "Yes, on the Premium plan", edge: "them" },
    { feature: "Reads your event titles", meetrao: "Never: busy and free only", them: "See their privacy policy", edge: "meetrao" },
  ],
  theirWins: [
    ["It is built for appointment businesses", "Deposits, packages, memberships, gift certificates and intake forms are the product rather than add-ons. If you bill clients for the appointments they book, Acuity is doing most of your admin and Meetrao is doing none of it."],
    ["Payments, properly", "Stripe, Square, PayPal and Venmo, with deposits and cancellation rules around them. Meetrao cannot take a payment at any point, and is not going to."],
    ["SMS reminders and waitlists", "Text reminders cut no-shows in a way email does not, and a waitlist fills the gap when somebody cancels. Meetrao sends two emails and has no waitlist."],
    ["HIPAA, if you need it", "Acuity will sign a BAA on its Premium plan. Meetrao will not sign one, which rules it out for clinical use regardless of anything else on this page."],
    ["Client records", "Acuity keeps a real client file: history, forms, notes, packages remaining. Meetrao keeps a contact list assembled from who has booked, and nothing beyond that."],
  ],
  meetraoWins: [
    ["There is a free plan at all", "Acuity's entry tier is $20 a month, or $16 a month billed annually, after a seven-day trial. Meetrao's booking product is free and stays free, which matters most to the people for whom a scheduling link is not a revenue line."],
    ["It is a link, not a system", "No client records to maintain, no forms to design, no packages to configure. Three screens and the link works, which is the right amount of tool when nobody is paying you at the point of booking."],
    ["A domain of your own, for $30 a year", "Acuity's help centre says you cannot point a domain you own at your scheduling page; the supported route is to embed the scheduler in a site you own, and the hosted page keeps an .as.me address. Meetrao serves your booking page from your own domain, for $30 a year."],
    ["It reads busy and free, never what your meetings are", "Meetrao asks Google which periods are busy. It never requests event titles, guests, descriptions or attachments."],
  ],
  chooseThem: [
    "People pay you for the appointment they are booking",
    "You need intake forms, packages, memberships or gift certificates",
    "You need SMS reminders or a waitlist",
    "You need a signed BAA for HIPAA",
    "You keep client files, not just a contact list",
  ],
  chooseMeetrao: [
    "Nobody is paying at the point of booking",
    "You want a booking link without a monthly bill",
    "Google Calendar and Google Meet are what you already use",
    "You want the link on your own domain for less than a month of Acuity",
    "You would rather configure three screens than thirty",
  ],
  faq: [
    [
      "Does Acuity Scheduling have a free plan?",
      "No. Acuity's pricing page offers a seven-day free trial and three paid tiers, starting at $20 a month, or $16 a month billed annually. Meetrao's booking product is free with no trial clock.",
    ],
    [
      "Can Meetrao take deposits or payments like Acuity?",
      "No, and it is not planned. Nothing in Meetrao collects money. If a booking needs a deposit or a card on file, Acuity is the right tool and this page is not going to argue otherwise.",
    ],
    [
      "I run a clinic. Can I use Meetrao?",
      "Not for anything covered by HIPAA. Meetrao will not sign a BAA. Acuity signs one on its Premium plan, and that single fact decides it regardless of price.",
    ],
  ],
};

export const SAVVYCAL: Comparison = {
  slug: "savvycal",
  competitor: "SavvyCal",
  competitorUrl: "https://savvycal.com/pricing",
  checkedOn: CHECKED,
  title: "Free SavvyCal Alternative: Meetrao vs SavvyCal",
  description:
    "How Meetrao and SavvyCal compare: the calendar overlay people love, what it costs, and when " +
    "a free booking link is the better answer.",
  summary: [
    "SavvyCal's idea is that the person you are sending the link to should not have to do the work. They overlay their own calendar on yours and pick a time that suits both, instead of reading a grid of your free slots. It is the nicest booking experience in this comparison and Meetrao does not have it.",
    "What SavvyCal does not have is a free plan. Basic is $12 per user per month, or $10 per user per month billed annually, and a custom domain means Premium at $20 per user per month, or $17 per user per month billed annually.",
    "That is the trade this page is about. SavvyCal is a better experience for your guest. Meetrao is free, and its custom domain costs $30 a year for the whole account rather than per user per month.",
  ],
  rows: [
    { feature: "Price", meetrao: "Free; Pro $30 a year", them: "Basic $12 per user per month, or $10 per user per month billed annually", edge: "meetrao" },
    { feature: "Free plan", meetrao: "Yes, the whole booking product", them: "No, a trial with a 30-day money-back guarantee", edge: "meetrao" },
    { feature: "Guest overlays their own calendar", meetrao: "No", them: "Yes", edge: "them" },
    { feature: "Ranked availability", meetrao: "No", them: "Yes", edge: "them" },
    { feature: "Meeting polls", meetrao: "No", them: "Yes", edge: "them" },
    { feature: "Meeting types", meetrao: "Unlimited", them: "Unlimited", edge: "even" },
    { feature: "Calendars connected", meetrao: "One (Google)", them: "Unlimited, several providers", edge: "them" },
    { feature: "Guests need an account", meetrao: "No", them: "No", edge: "even" },
    { feature: "Timezone conversion for guests", meetrao: "Yes", them: "Yes", edge: "even" },
    { feature: "Reminders", meetrao: "Email, the day before and an hour before", them: "Email, with workflows", edge: "them" },
    { feature: "Reschedule flow", meetrao: "Yes", them: "Yes", edge: "even" },
    { feature: "Take payment at booking", meetrao: "No", them: "Yes, on Premium", edge: "them" },
    { feature: "Custom domain", meetrao: "On Pro, $30 a year for the account", them: "On Premium, $20 per user per month, or $17 per user per month billed annually", edge: "meetrao" },
    { feature: "Round-robin team links", meetrao: "Yes, on Pro", them: "Yes, on both plans", edge: "even" },
    { feature: "Reads your event titles", meetrao: "Never: busy and free only", them: "See their privacy policy", edge: "meetrao" },
  ],
  theirWins: [
    ["The overlay is genuinely better", "Your guest sees their own calendar on top of your availability and picks a time that works for both, rather than guessing at a grid. It is the single best idea in consumer scheduling and Meetrao has nothing like it."],
    ["Ranked availability", "You can mark the hours you would prefer, and SavvyCal nudges guests towards them without hiding the rest. Meetrao's hours are open or closed, with nothing in between."],
    ["Meeting polls", "For finding a time across several people, SavvyCal runs a poll. Meetrao has group sessions, where several guests book the same slot, which is a different thing and not a substitute."],
    ["Several calendars and providers", "SavvyCal connects as many calendars as you have, across providers. Meetrao reads one Google Calendar, which is the limit most likely to rule it out."],
  ],
  meetraoWins: [
    ["There is a free plan at all", "SavvyCal has no free tier: Basic is $12 per user per month, or $10 per user per month billed annually. Meetrao's booking product is free and has no trial clock on it."],
    ["A domain of your own, for $30 a year", "SavvyCal puts custom domains on Premium, at $20 per user per month, or $17 per user per month billed annually. Meetrao charges $30 a year for the account, and that includes your own logo and colours."],
    ["Nothing per seat", "Meetrao's team link is part of Pro rather than a line item per person, so adding somebody to a round-robin does not change the bill."],
    ["It reads busy and free, never what your meetings are", "Meetrao asks Google which periods are busy. It never requests event titles, guests, descriptions or attachments, see the Privacy Policy, which names every permission."],
  ],
  chooseThem: [
    "The experience your guest has is the thing you care most about",
    "You want to steer bookings towards your preferred hours",
    "You need meeting polls to find a time across several people",
    "You keep more than one calendar, or use a provider other than Google",
    "You need to take payment at booking",
  ],
  chooseMeetrao: [
    "You are not willing to pay monthly for a booking link",
    "Google Calendar is the only calendar you keep",
    "You want your link on your own domain without a per-seat plan",
    "A list of free times is all your guests have ever needed",
  ],
  faq: [
    [
      "Does SavvyCal have a free plan?",
      "No. SavvyCal's pricing page offers a trial backed by a 30-day money-back guarantee, and the cheapest paid tier is $12 per user per month, or $10 per user per month billed annually. Meetrao's booking product is free.",
    ],
    [
      "Does Meetrao have the calendar overlay?",
      "No. Your guest sees a list of your free times, converted to their timezone, and picks one. SavvyCal's overlay is better and this page is not going to pretend the difference does not exist.",
    ],
    [
      "Which is cheaper for a custom domain?",
      "Meetrao, by a wide margin. SavvyCal puts custom domains on Premium, at $20 per user per month, or $17 per user per month billed annually. Meetrao's is $30 a year for the whole account. SavvyCal's Premium plan includes a great deal more than a domain, so this is a comparison of one feature rather than of the two plans.",
    ],
  ],
};

export const TIDYCAL: Comparison = {
  slug: "tidycal",
  competitor: "TidyCal",
  competitorUrl: "https://tidycal.com/pricing",
  checkedOn: CHECKED,
  title: "Free TidyCal Alternative: Meetrao vs TidyCal",
  description:
    "How Meetrao and TidyCal compare: two free booking links, a $29 lifetime deal, and what each " +
    "one charges for once you outgrow free.",
  summary: [
    "TidyCal is the closest thing to Meetrao in this comparison. Both have a real free plan, both are small, and both are a booking link rather than a system. TidyCal has more features on free than Meetrao does, including paid bookings.",
    "Its lifetime deal is the part worth taking seriously: $29 once, not per month, for group bookings, automatic Zoom and Teams links, ten calendar connections and an AI booking assistant. That is good value by any reading and this page is not going to argue with it.",
    "The difference is what sits above free. TidyCal's custom domain is on Pro, at $12 per month or $99 per year. Meetrao's is $30 a year. If a domain of your own is the thing you want, that is the whole comparison.",
  ],
  rows: [
    { feature: "Price", meetrao: "Free; Pro $30 a year", them: "Free; Individual Lifetime $29 one-time; Pro $12 per month, or $8.25 per month billed annually at $99", edge: "even" },
    { feature: "Free plan", meetrao: "The whole booking product", them: "Unlimited bookings and booking types", edge: "even" },
    { feature: "Calendars on the free plan", meetrao: "One (Google)", them: "One", edge: "even" },
    { feature: "Take payment at booking", meetrao: "No", them: "Yes, with a 1% platform fee below Pro", edge: "them" },
    { feature: "Guests need an account", meetrao: "No", them: "No", edge: "even" },
    { feature: "Timezone conversion for guests", meetrao: "Yes", them: "Yes", edge: "even" },
    { feature: "Video link on every booking", meetrao: "Google Meet, always", them: "Zoom, Meet and Teams, from the lifetime plans", edge: "them" },
    { feature: "Reminders", meetrao: "Email, the day before and an hour before", them: "Email, with SMS on Agency and Pro", edge: "them" },
    { feature: "Reschedule flow", meetrao: "Yes", them: "Yes", edge: "even" },
    { feature: "Round-robin team links", meetrao: "On Pro, $30 a year", them: "On Agency Lifetime, $79 one-time", edge: "even" },
    { feature: "Custom domain", meetrao: "On Pro, $30 a year", them: "On Pro, $12 per month, or $99 per year", edge: "meetrao" },
    { feature: "Remove the vendor's branding", meetrao: "On Pro, with your own logo and colours", them: "Reduced on lifetime plans, removed on Pro", edge: "meetrao" },
    { feature: "API", meetrao: "On Pro", them: "On the lifetime plans", edge: "even" },
    { feature: "Reads your event titles", meetrao: "Never: busy and free only", them: "See their privacy policy", edge: "meetrao" },
  ],
  theirWins: [
    ["The lifetime deal is hard to argue with", "$29 one-time, not per month, for group bookings, automatic Zoom, Meet and Teams links, ten calendar connections, booking limits and CSV export. If you want those things and never want to think about it again, that is a good deal and Meetrao has no answer to it."],
    ["Payments on the free plan", "TidyCal takes money at booking even on free, at a 1% platform fee on top of Stripe's. Meetrao cannot take a payment on any plan."],
    ["More video providers", "Zoom, Google Meet and Teams links created automatically from the lifetime plans up. Meetrao makes Google Meet links and will paste in any link you give it, which is not the same thing."],
    ["Ten calendars, not one", "The lifetime plans read ten calendars. Meetrao reads one Google Calendar, and if your availability is spread across several, it will be wrong."],
  ],
  meetraoWins: [
    ["A domain of your own, for $30 a year", "TidyCal's custom domain is on Pro, at $12 per month, or $99 per year. Meetrao's is $30 a year, and that includes your own logo and colours on the booking page."],
    ["Branding without a subscription", "The lifetime plans reduce TidyCal's branding rather than removing it; removing it is Pro. Meetrao's Pro replaces the wordmark with your logo outright."],
    ["No platform fee to think about", "Meetrao takes no cut of anything, because it never touches money. There is nothing to read in the terms about percentages."],
    ["It reads busy and free, never what your meetings are", "Meetrao asks Google which periods are busy. It never requests event titles, guests, descriptions or attachments, see the Privacy Policy, which names every permission."],
  ],
  chooseThem: [
    "You want to take payment at booking",
    "You would rather pay once than yearly",
    "You need automatic Zoom or Teams links",
    "You keep more than one calendar",
    "You want group bookings and an AI booking assistant",
  ],
  chooseMeetrao: [
    "You want your booking link on your own domain for $30 a year",
    "You want the vendor's name gone, not made smaller",
    "Google Calendar and Google Meet are what you already use",
    "Nobody is paying at the point of booking",
  ],
  faq: [
    [
      "Is TidyCal's lifetime deal better value than Meetrao Pro?",
      "For what it covers, probably. $29 one-time against $30 a year is not a close comparison on price alone. It does not include a custom domain or full branding removal, both of which are on TidyCal's Pro plan at $12 per month, or $99 per year, so the answer depends entirely on whether a domain of your own is something you want.",
    ],
    [
      "Do both have a real free plan?",
      "Yes, and that is unusual. TidyCal's free plan takes unlimited bookings, connects one calendar and even accepts payments, with a 1% platform fee. Meetrao's free plan takes unlimited bookings, connects one Google Calendar, and cannot take payments at all.",
    ],
    [
      "Can Meetrao create Zoom links?",
      "No. It creates Google Meet links, and a meeting can also be a phone call, an address, or a link you paste in yourself. TidyCal creates Zoom, Meet and Teams links for you from its lifetime plans up.",
    ],
  ],
};

export const COMPARISONS = [CALENDLY, CAL_COM, ACUITY, SAVVYCAL, TIDYCAL];
