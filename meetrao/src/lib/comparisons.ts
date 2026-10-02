/* ─────────────────────────────────────────────────────────────────────────────
   What Meetrao says about the tools people are choosing between.

   Three rules, and they are not politeness — they are what keeps a comparison
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
   rather than quietly misleading somebody — see README § SEO for the re-check.
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

const CHECKED = "September 2026";

/* Figures below were taken from third-party pricing trackers rather than from
   each vendor's own page, which could not be reached from the machine that
   wrote this. They are consistent across sources and are the widely reported
   numbers — and they are still second-hand, which is exactly why each page
   prints the date and links to the vendor so a reader can check. */

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
    "The difference that sends people looking is the free plan's shape. Calendly's free tier is limited to one active event type and one connected calendar, enough for a single repeated meeting, and the point at which most people either upgrade or go looking. Meetrao has no such line: every feature on this site is available on the free account, because there is no paid account to upsell you to.",
    "Meetrao is narrower on purpose. If what you need is a booking link that respects your real calendar and puts a Google Meet link on both sides, it does that and does not charge for it. If you need more than that, this page says so.",
  ],
  rows: [
    { feature: "Price", meetrao: "Free", them: "Free tier; paid plans from $10/seat/month billed annually, $12 monthly", edge: "meetrao" },
    { feature: "Meeting types on the free plan", meetrao: "Unlimited", them: "One", edge: "meetrao" },
    { feature: "Calendars connected", meetrao: "One (Google)", them: "One on free; more on paid", edge: "even" },
    { feature: "Guests need an account", meetrao: "No", them: "No", edge: "even" },
    { feature: "Video link on every booking", meetrao: "Google Meet, always", them: "Meet, Zoom, Teams and others", edge: "them" },
    { feature: "Timezone conversion for guests", meetrao: "Yes", them: "Yes", edge: "even" },
    { feature: "Buffers, notice period, booking window", meetrao: "Yes", them: "Yes", edge: "even" },
    { feature: "Branding on your booking page", meetrao: "Meetrao wordmark", them: "Calendly badge on free; removable on paid", edge: "even" },
    { feature: "Reschedule flow", meetrao: "Not built: cancel and rebook", them: "Yes", edge: "them" },
    { feature: "Take payment at booking", meetrao: "No", them: "Yes, on paid plans", edge: "them" },
    { feature: "Round-robin team links", meetrao: "Yes, free", them: "Yes, on team plans", edge: "meetrao" },
    { feature: "Collective availability and routing forms", meetrao: "No", them: "Yes, on team plans", edge: "them" },
    { feature: "CRM and automation integrations", meetrao: "None", them: "Many", edge: "them" },
    { feature: "Reads your event titles", meetrao: "Never: busy/free only", them: "See their privacy policy", edge: "meetrao" },
  ],
  theirWins: [
    ["It does considerably more", "Payments at booking, collective scheduling, routing forms, multiple video providers, and a long list of integrations. Meetrao has round-robin team links and none of the rest, and is not planning most of them."],
    ["Rescheduling", "Calendly lets a guest move a booking. Meetrao does not yet, a guest cancels and books again, which works but is two steps where one would do."],
    ["Calendars beyond Google", "Outlook, iCloud and Exchange. Meetrao connects to Google Calendar and nothing else."],
    ["It is not one person", "Calendly has a support organisation, an uptime commitment and a company behind it. Meetrao is built and run by one person, and this page would be dishonest if it pretended otherwise."],
  ],
  meetraoWins: [
    ["No limit that exists to sell you something", "Every feature on this site is on the free account. There is no second tier whose absence is the product."],
    ["Unlimited meeting types, free", "Calendly's free plan allows one. If you run a 15-minute intro and a 60-minute deep dive, that is the wall most people hit first."],
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
    "You want a booking link and nothing else bolted on",
    "You would rather not have a card on file for a scheduling tool",
    "You care what a scheduling tool can read in your calendar",
  ],
  faq: [
    [
      "Is Meetrao a free alternative to Calendly?",
      "Yes, for the core job: a booking link that checks your Google Calendar, converts timezones for guests, and puts a Google Meet link on both calendars, plus rescheduling, reminders, group sessions and round-robin team links. It does not replace Calendly's payments, routing forms or CRM integrations.",
    ],
    [
      "What is the catch?",
      "Free is the whole booking product, not a trial of it: your link, unlimited meeting types and bookings, reminders, rescheduling and time off, with no card. Pro is $10 a year and adds a custom domain, your own branding, team links, shared sessions and the API. A free account is never billed automatically. The real limits are the ones on this page: Google Calendar only, no payments at booking, no Zoom or Teams integration, round-robin without collective availability, email-only reminders.",
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
    { feature: "Price for one person", meetrao: "Free", them: "Free", edge: "even" },
    { feature: "Price for a team", meetrao: "Free, round-robin only", them: "Paid, per user", edge: "meetrao" },
    { feature: "Meeting types", meetrao: "Unlimited", them: "Unlimited", edge: "even" },
    { feature: "Calendars connected", meetrao: "One (Google)", them: "Unlimited, multiple providers", edge: "them" },
    { feature: "Video providers", meetrao: "Meet, or your own link pasted in", them: "Cal Video, Meet, Zoom and others", edge: "them" },
    { feature: "Guests need an account", meetrao: "No", them: "No", edge: "even" },
    { feature: "Timezone conversion for guests", meetrao: "Yes", them: "Yes", edge: "even" },
    { feature: "Buffers, notice period, booking window", meetrao: "Yes", them: "Yes", edge: "even" },
    { feature: "Workflows and reminders", meetrao: "Booking emails only", them: "Yes", edge: "them" },
    { feature: "Routing forms", meetrao: "No", them: "Yes", edge: "them" },
    { feature: "Take payment at booking", meetrao: "No", them: "Yes", edge: "them" },
    { feature: "Reschedule flow", meetrao: "Not built: cancel and rebook", them: "Yes", edge: "them" },
    { feature: "Self-hosting", meetrao: "No", them: "Yes", edge: "them" },
    { feature: "Settings to get through before your first link", meetrao: "Three screens", them: "More", edge: "meetrao" },
  ],
  theirWins: [
    ["More of everything", "Routing forms, workflows, several calendar providers, several video providers, payments, collective scheduling. On features this is not close, and pretending otherwise would waste your time."],
    ["Self-hosting", "You can run Cal.com on your own infrastructure. Meetrao has no self-hosted edition."],
    ["Teams", "Cal.com has the full set: round-robin, collective availability, routing, per-team billing. Meetrao has a round-robin team link and stops there."],
    ["A company behind it", "Cal.com is a funded company with a roadmap and a support function. Meetrao is one person."],
  ],
  meetraoWins: [
    ["Less to set up", "Connect Google, describe one meeting, tick your hours. Three screens and the link works."],
    ["One obvious way to do each thing", "There is one weekly schedule, one meeting location and one calendar. Fewer choices is the feature, and it is the wrong feature for some people."],
    ["The free plan is not a demo", "Taking bookings (link, calendar, reminders, rescheduling, time off) costs nothing and always has. Pro is $10 a year for branding, a domain, team links and the API."],
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
      "Less. The honest answer is that Meetrao's advantage is scope, not capability: fewer screens, fewer decisions, and one way to do each thing. That is worth something to some people and nothing to others.",
    ],
    [
      "Will Meetrao add teams and payments?",
      "Not soon, and possibly never. It is built and maintained by one person, and the things on this page it does not do are mostly things it has chosen not to do.",
    ],
  ],
};

export const COMPARISONS = [CALENDLY, CAL_COM];
