import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteNav } from "@/components/marketing/site-chrome";
import { signOut } from "@/lib/actions/auth";
import { Eyebrow } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icon";
import { cx } from "@/lib/cx";
import { JsonLd } from "@/components/seo/json-ld";
import { articleLd, breadcrumbLd, faqLd, graph } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Help Centre: how scheduling works",
  description:
    "How Meetrao works, in the order you meet it: add your calendar feed, set your hours, " +
    "share your link, and see exactly what a guest sees when they book.",
  alternates: { canonical: "/help" },
};

const PILLARS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "link",
    title: "One link, always current",
    text: "Share meetrao.com/your-name/intro-call once. It reflects your calendar and hours as they are today, not as they were when you sent it.",
  },
  {
    icon: "calendar",
    title: "Never double-booked",
    text: "Meetrao checks the busy times in your calendar feed before offering any slot, so nothing lands on top of what you already have.",
  },
  {
    icon: "video",
    title: "On both calendars",
    text: "Each booking emails you and your guest a calendar invite with your video link, so it lands on their calendar as well as yours.",
  },
];

const TOC: { id: string; icon: IconName; label: string }[] = [
  { id: "start", icon: "sign-in", label: "Getting started" },
  { id: "setup", icon: "rectangle-list", label: "Setting up" },
  { id: "calendar", icon: "calendar", label: "Your calendar feed" },
  { id: "video", icon: "video", label: "Video link" },
  { id: "invites", icon: "envelope", label: "Calendar invites" },
  { id: "dashboard", icon: "house", label: "Dashboard" },
  { id: "meetings", icon: "list", label: "Meetings" },
  { id: "availability", icon: "clock", label: "Availability" },
  { id: "bookings", icon: "calendar", label: "Bookings" },
  { id: "emails", icon: "envelope", label: "Emails" },
  { id: "guests", icon: "users", label: "What guests see" },
  { id: "branding", icon: "palette", label: "Your branding" },
  { id: "domain", icon: "globe", label: "Your own domain" },
  { id: "settings", icon: "gear", label: "Settings" },
  { id: "faq", icon: "circle-question", label: "Common questions" },
];

const STEPS: [string, string, string][] = [
  ["1", "Welcome", "A short summary of what is coming. Nothing to fill in."],
  [
    "2",
    "Add your calendar feed",
    "Paste your calendar's private feed address (.ics). Meetrao keeps only when you are busy, never what your meetings are about, and never asks for access to your calendar account.",
  ],
  [
    "3",
    "Create your first meeting",
    "A name, a description and a duration. This is what guests see and book. Most people start with one and add more later.",
  ],
  [
    "4",
    "Set your hours",
    "Tick the days you work and the times within them. Your timezone is detected automatically.",
  ],
  [
    "5",
    "You are ready",
    "Your booking link is shown with a copy button, plus a summary of what you set up. Send it to someone.",
  ],
];

/* Where to find the private feed address in each calendar. The menu names are
   the providers' own, so a host can follow them with the settings page open. */
const FEED_STEPS: { provider: string; steps: string[] }[] = [
  {
    provider: "Google Calendar",
    steps: [
      "On a computer, open Google Calendar and go to Settings (the gear icon).",
      "Under Settings for my calendars, choose your calendar.",
      "Open Integrate calendar.",
      "Copy the Secret address in iCal format. Not the public address: that one only works if the calendar is public.",
    ],
  },
  {
    provider: "Outlook",
    steps: [
      "In Outlook on the web, open Settings, then Calendar, then Shared calendars.",
      "Under Publish a calendar, choose your calendar and Can view when I'm busy, then Publish.",
      "Copy the ICS link.",
    ],
  },
  {
    provider: "iCloud",
    steps: [
      "In the Calendar app (or at icloud.com/calendar), open the share settings for your calendar.",
      "Turn on Public Calendar.",
      "Copy the link it shows.",
    ],
  },
];

/* What a host actually wants to know, in the order they ask it. */
const CALENDAR_FACTS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "eye",
    title: "What is kept",
    text: "Busy periods from your feed: start and end times, for a limited window ahead, refreshed every few minutes when needed.",
  },
  {
    icon: "lock",
    title: "What is never kept",
    text: "Event titles, descriptions, attendees and locations. They are dropped as the feed is read.",
  },
  {
    icon: "calendar",
    title: "What is written",
    text: "Nothing. Meetrao never writes to your calendar. Bookings reach it through the calendar invite in your email.",
  },
  {
    icon: "sign-out",
    title: "How to stop it",
    text: "Settings → Calendar → Remove. The feed address and the busy times kept from it are deleted.",
  },
];

/* The problems a host meets in practice, and what each one means. */
const CALENDAR_TROUBLE: [string, string][] = [
  [
    "A new event did not block a slot",
    "Calendar feeds are not instant. Google can take a few hours to update its feed, and Outlook and iCloud also refresh on their own schedule. The event will be picked up once the feed changes. Bookings made through Meetrao always block their slot straight away.",
  ],
  [
    "Settings says the feed cannot be read",
    "The address was probably reset, unpublished or copied incompletely. Copy it again from your calendar and paste the new one. While the feed cannot be read, Meetrao still blocks its own bookings, but not your other events.",
  ],
  [
    "Guests were offered a time I was busy",
    "Either the event is on a calendar other than the one whose feed you added, or the feed has not caught up yet. Meetrao checks only the feed you gave it.",
  ],
  [
    "I pasted the public Google address and nothing is busy",
    "Use the Secret address in iCal format. The public address only works when the whole calendar is public.",
  ],
  [
    "Is the feed address safe to paste?",
    "Anyone with the address can read that calendar, so treat it like a password. Meetrao stores it privately, shows it masked after you save it, and never shares it. If it ever leaks, reset it in your calendar's settings and paste the new one.",
  ],
];

const RULES: [string, string][] = [
  [
    "Buffer between meetings",
    "Adds a gap either side of a booking, so you are not on calls back to back. None, 5, 10 or 15 minutes.",
  ],
  [
    "Minimum notice",
    "How close to the start someone can book. Set to 1 hour and nobody can grab the next ten minutes.",
  ],
  [
    "Booking window",
    "How far ahead people can book: 7, 14, 30 or 60 days. Keeps your calendar from filling out to next quarter.",
  ],
];

const NOTICES: [string, string, "On" | "Off"][] = [
  ["New booking", "Someone books a time with you.", "On"],
  ["Booking changed", "A booking is rescheduled or edited.", "On"],
  ["Booking cancelled", "You or your guest cancels.", "On"],
  ["Meeting reminders", "A nudge the day before and an hour before. Your guest is reminded either way.", "On"],
  ["Daily agenda", "One email each morning listing the day’s meetings.", "Off"],
  ["Product news", "Occasional updates about new Meetrao features.", "Off"],
];

const PANELS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "user",
    title: "Profile",
    text: "Your name, job title, email, photo and username. Your username is your booking link, so changing it changes the link you have already shared.",
  },
  {
    icon: "calendar",
    title: "Calendar",
    text: "Add, replace or remove your calendar feed, save your video link, and set your timezone. Removing the feed stops conflict checking against it straight away.",
  },
  {
    icon: "sliders",
    title: "Booking",
    text: "Defaults applied to every new meeting you create, a starting duration and minimum notice, so you are not setting them each time.",
  },
  {
    icon: "palette",
    title: "Branding",
    text: "Your logo, your colour and your own domain on the pages guests see. Part of Pro. The controls are there on Free, with a note saying so.",
  },
  {
    icon: "envelope",
    title: "Notifications",
    text: "The five switches covering which emails Meetrao sends you.",
  },
  {
    icon: "lock",
    title: "Account",
    text: "Your email address and whether it is verified, changing your password, logging out, and deleting your account.",
  },
];

const FAQS: [string, string][] = [
  [
    "Can I have more than one type of meeting?",
    "Yes. Create as many as you like: each gets its own link, and your main link shows all the active ones.",
  ],
  [
    "Can guests reschedule?",
    "Yes. The link in their confirmation lets them pick a new time, and you both get an updated calendar invite.",
  ],
  [
    "Does Meetrao read my meeting titles or notes?",
    "No. From your calendar feed it keeps only busy start and end times. Titles, descriptions, attendees and locations are not stored, and Meetrao never asks for access to your calendar account.",
  ],
  [
    "What if I remove my calendar feed?",
    "Your link keeps working, and Meetrao still blocks the times already booked through it, but it can no longer see your other events, so guests may be offered times you are not free. The address and the busy times kept from it are deleted.",
  ],
  [
    "Which video service can I use?",
    "Any one with a link you can reuse: Zoom, Google Meet, Teams, Whereby or another personal room. Save it once in Settings and every video call uses it. A meeting can also be a phone call or an address.",
  ],
  [
    "Can two people book the same slot?",
    "No. The slot is checked again at the moment of booking. If someone got there first, the second person is told immediately and nothing is scheduled.",
  ],
  ["Do guests need an account?", "Never. They give a name, an email and optionally a note. That is all."],
  [
    "Why can I not sign in after signing up?",
    "Your email address is probably not confirmed yet. Check your inbox for the verification link, or ask for a new one from the waiting screen.",
  ],
  [
    "Does the meeting appear on my guest’s calendar too?",
    "Yes. Their confirmation email carries a standard calendar invite, which Gmail, Outlook and Apple Calendar can add with one click, often automatically. If they move or cancel the meeting, the updated invite follows.",
  ],
  [
    "What does it cost?",
    "Nothing while Meetrao is in beta. If paid plans arrive we will email you first, and you would have to opt in, a free account is never billed automatically.",
  ],
  [
    "How do I get my data out?",
    "Email us and we will send you a copy. Do it before deleting your account, since deletion is immediate and we keep no copy.",
  ],
];

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-[16px] flex gap-[11px] rounded-[8px] border border-line bg-fill px-[15px] py-[13px]">
      <Icon name="circle-info" weight="solid" size={12} className="mt-[3px] flex-none text-accent-ink" />
      <span className="text-[13px] leading-[1.6] text-pretty text-ink-2">{children}</span>
    </div>
  );
}

/* STATIC, like the rest of the marketing pages. This used to read the session
   on the server to draw the signed-in nav, which made the Help Centre the
   one long marketing page rendered on every request (865 ms at the 95th
   percentile). The nav now reads the session in the browser after hydration,
   exactly as the landing page does; see components/marketing/site-account-live.tsx. */
export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#F4F3ED]">
      {/* The Help Centre carried no article markup, so a consumer had nothing
          to say what this page is beyond the sitewide SoftwareApplication. The
          questions come from the same array the page renders below, so the
          machine-readable answers and the ones a person reads cannot drift. */}
      <JsonLd
        json={graph(
          articleLd({
            headline: "Help Centre: how Meetrao scheduling works",
            description:
              "Adding your calendar feed, setting your hours, sharing your link, branding your " +
              "booking page, and what a guest sees when they book.",
            path: "/help",
          }),
          faqLd(FAQS),
          breadcrumbLd([
            ["Meetrao", "/"],
            ["Help Centre", "/help"],
          ]),
        )}
      />
      <SiteNav liveAccount={{ onSignOut: signOut }} />
    <div className="mx-auto max-w-[1148px] px-[26px] pt-[40px] pb-[64px] max-[560px]:px-[18px]">
      <div className="flex max-w-[680px] flex-col gap-[12px]">
        <h1 className="m-0 font-serif text-[clamp(32px,4vw,46px)] leading-[1.04] font-normal tracking-[-0.02em] text-ink">
          Help Centre
        </h1>
        <p className="m-0 text-[15px] leading-[1.65] text-pretty text-ink-2">
          Meetrao replaces the back-and-forth of finding a time. You add your calendar feed once, describe the
          meetings people can book, set the hours you are free, and share one link. Everything below explains a
          section of the app, in the order you would meet it.
        </p>
      </div>

      <div className="mt-[26px] grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-[14px]">
        {PILLARS.map((pillar) => (
          <div
            key={pillar.title}
            className="flex flex-col gap-[10px] rounded-[14px] border border-line bg-surface px-[20px] pt-[20px] pb-[22px]"
          >
            <span className="inline-flex h-[32px] w-[32px] flex-none items-center justify-center rounded-[8px] bg-accent-soft text-accent-ink">
              <Icon name={pillar.icon} size={14} />
            </span>
            <span className="text-[14.5px] font-semibold text-ink">{pillar.title}</span>
            <span className="text-[13px] leading-[1.55] text-pretty text-ink-2">{pillar.text}</span>
          </div>
        ))}
      </div>

      <div className="mt-[36px] flex flex-wrap items-start gap-[40px]">
        <nav
          aria-label="Help contents"
          className="doc-rail box-border flex w-[230px] flex-none flex-col gap-[12px] max-[880px]:w-full"
        >
          <Eyebrow>Jump to</Eyebrow>
          <div className="doc-rail-list flex flex-col gap-[2px]">
            {TOC.map((entry) => (
              <a
                key={entry.id}
                href={`#${entry.id}`}
                className="unlink flex items-center gap-[10px] rounded-[6px] px-[9px] py-[7px] text-[12.5px] text-ink-2 hover:bg-accent-soft hover:text-accent-ink"
              >
                <Icon name={entry.icon} size={12} className="w-[15px] flex-none text-ink-3" />
                {entry.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="doc-prose min-w-[300px] flex-1">
          <section>
            <h2 id="start">Getting started</h2>
            <p>Signing up takes about two minutes. There are two ways in.</p>

            <h3>With an email address</h3>
            <p>
              Enter your name, work email and a password of at least 8 characters. We email you a confirmation
              link straight away. <strong>You cannot use Meetrao until you click it</strong>. this stops anyone
              signing up with an address that is not theirs.
            </p>
            <p>
              The link lasts 24 hours. If it does not arrive, check your spam folder, then use{" "}
              <em>Resend the email</em> on the waiting screen. Typed your address wrong?{" "}
              <em>Use a different email</em> takes you back to sign-up.
            </p>

            <h3>With Google</h3>
            <p>
              Continue with Google and you skip the confirmation step entirely. Google has already verified the
              address. You go straight to setup. Google shares only your name, email address and profile picture;
              signing in this way gives Meetrao no access to your calendar.
            </p>

            <Tip>
              Forgot your password? Use <em>Forgot?</em> next to the password field. We send a reset link that
              expires in one hour.
            </Tip>
          </section>

          <section>
            <h2 id="setup">Setting up: the five steps</h2>
            <p>
              After you confirm your email, Meetrao walks you through setup. The tracker at the top shows where
              you are. Everything here can be changed later, so do not agonise over it.
            </p>

            <div className="mb-[16px] flex flex-col gap-[1px] overflow-hidden rounded-[10px] border border-line bg-line">
              {STEPS.map(([n, title, text]) => (
                <div key={n} className="flex gap-[14px] bg-surface px-[15px] py-[13px]">
                  <span className="inline-flex h-[24px] w-[24px] flex-none items-center justify-center rounded-full bg-accent-soft text-[11px] font-medium text-accent-ink">
                    {n}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="text-[13.5px] font-semibold text-ink">{title}</span>
                    <span className="text-[13px] leading-[1.55] text-pretty text-ink-2">{text}</span>
                  </div>
                </div>
              ))}
            </div>

            <Tip>
              You can skip adding your calendar feed, but then Meetrao sees only its own bookings, and guests
              may be offered times you already have something in. Add it before you share your link.
            </Tip>

            <p>
              Need to stop halfway? Use the account button at the top-right of the setup screen to log out. Your
              progress is saved and you can pick it up later.
            </p>
          </section>

          <section>
            <h2 id="calendar">Add your calendar feed</h2>
            <p>
              Meetrao finds your conflicts from a calendar feed: a private address, in iCal (.ics) format, that
              your calendar publishes. You paste it in once, at step two of setup or any time from{" "}
              <strong>Settings → Calendar</strong>. It works with Google Calendar, Outlook, iCloud and any other
              calendar that publishes an .ics feed. Meetrao never asks for access to your calendar account.
            </p>

            <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-[12px]">
              {CALENDAR_FACTS.map((fact) => (
                <div key={fact.title} className="flex flex-col gap-[7px] rounded-[10px] border border-line bg-fill px-[15px] py-[14px]">
                  <span className="flex items-center gap-[8px] text-[13.5px] font-semibold text-ink">
                    <Icon name={fact.icon} size={12} className="flex-none text-accent-ink" />
                    {fact.title}
                  </span>
                  <span className="text-[13px] leading-[1.55] text-pretty text-ink-2">{fact.text}</span>
                </div>
              ))}
            </div>

            <h3>Finding the address</h3>
            {FEED_STEPS.map((provider) => (
              <div key={provider.provider}>
                <p>
                  <strong>{provider.provider}</strong>
                </p>
                <ol>
                  {provider.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
            <p>
              Then paste the address into <strong>Settings → Calendar</strong> and save. Meetrao checks that it can
              read it, and from then on shows it masked. To change it, paste a new one; to stop, press{" "}
              <em>Remove</em>, which deletes the address and the busy times kept from it.
            </p>

            <Tip>
              Feeds are not instant. Google can take a few hours to update its feed, so an event you added a
              moment ago may not block a slot straight away. Bookings made through Meetrao block their time at
              once, whatever the feed says, and if the feed cannot be read Meetrao still blocks its own bookings.
            </Tip>

            <h3>When something goes wrong</h3>
            <div className="mb-[8px] flex flex-col gap-[1px] overflow-hidden rounded-[10px] border border-line bg-line">
              {CALENDAR_TROUBLE.map(([problem, answer]) => (
                <div key={problem} className="flex flex-col gap-[4px] bg-surface px-[15px] py-[13px]">
                  <span className="text-[13.5px] font-semibold text-ink">{problem}</span>
                  <span className="text-[13px] leading-[1.55] text-pretty text-ink-2">{answer}</span>
                </div>
              ))}
            </div>
            <p>
              Anything else, <Link href="/support">tell us what happened</Link>, including the address you
              were on and roughly when, which is usually enough to find it.
            </p>
          </section>

          <section>
            <h2 id="video">Video link</h2>
            <p>
              Meetrao does not create video meetings. Instead you save your own meeting link once, in{" "}
              <strong>Settings</strong>: a Zoom personal room, a Google Meet link, a Teams meeting, a
              Whereby room, or any other link you reuse. Every meeting set to <em>Video call</em> uses it.
            </p>
            <p>
              The link goes into the confirmation, the reminders and the calendar invite, so your guest has it
              wherever they look. Use a link that stays valid: a personal room rather than a one-off meeting.
              Change it in Settings and future emails carry the new one.
            </p>
          </section>

          <section>
            <h2 id="invites">Calendar invites</h2>
            <p>
              Every booking email, yours and your guest&rsquo;s, carries a standard calendar invite (an .ics
              file). Gmail, Outlook and Apple Calendar recognise it and add the meeting to the calendar, often
              without a click. When a booking is rescheduled, the new email updates the same event; when it is
              cancelled, the email removes it.
            </p>
            <p>
              Meetrao never writes to anyone&rsquo;s calendar directly. If a meeting is missing from yours, open
              the booking email and add the invite from there, and check that the email did not land in spam.
              Replies to the invite (accept or decline) go to the calendar app, not to Meetrao.
            </p>
          </section>

          <section>
            <h2 id="dashboard">Dashboard</h2>
            <p>
              The first thing you see, designed to be read once in the morning and then closed. It greets you
              with today&rsquo;s date, the current time, and when your next meeting starts.
            </p>
            <p>
              Four cards summarise where things stand: how many meetings are <strong>Upcoming</strong>, when your{" "}
              <strong>Next meeting</strong> is and with whom, how many <strong>Active meetings</strong> can be
              booked from your link, and your average <strong>reply time</strong>, how long people take to book
              after opening your link.
            </p>
            <p>
              Below that, <strong>Today</strong> lists what is happening now, each row with a <em>Join</em>{" "}
              button that opens the meeting&rsquo;s video link directly. <strong>Later this week</strong> follows. <em>Details</em>{" "}
              on any row opens the full booking, including any note your guest left.
            </p>
            <p>If you have not added a calendar feed, or it cannot be read, a banner at the top says so. It is worth clearing.</p>
            <p>
              <strong>Copy link</strong> in the header copies your booking link. If more than one meeting is
              active it becomes a dropdown, so you can copy the link for a specific meeting instead of your
              general one.
            </p>
          </section>

          <section>
            <h2 id="meetings">Meetings: what people can book</h2>
            <p>
              A &ldquo;meeting&rdquo; is a type of appointment, not a single booking. Most people have two or
              three, a short intro call, a standard consultation, a longer deep dive. Each has its own link.
            </p>

            <h3>Creating one</h3>
            <p>
              Give it a name guests will recognise and a description, both appear on your booking page. Pick a
              duration (15, 30, 45 or 60 minutes), and where it happens: a video call using the{" "}
              <a href="#video">video link</a> you saved, a phone call, or an address.
            </p>

            <h3>Booking rules</h3>
            <p>Three settings protect your day:</p>
            <div className="mb-[16px] flex flex-col gap-[1px] overflow-hidden rounded-[10px] border border-line bg-line">
              {RULES.map(([name, text]) => (
                <div key={name} className="flex flex-wrap gap-x-[14px] gap-y-[3px] bg-surface px-[15px] py-[12px]">
                  <span className="w-[210px] flex-none text-[13px] font-semibold text-ink">{name}</span>
                  <span className="min-w-[200px] flex-1 text-[13px] leading-[1.55] text-ink-2">{text}</span>
                </div>
              ))}
            </div>

            <h3>Turning one off</h3>
            <p>
              The <strong>Active</strong> switch controls whether a meeting can be booked. Switch it off and it
              stays in your list (with its settings and history intact) but nobody can book it from your link.
              Better than deleting something you might want back.
            </p>
            <p>
              <em>Preview</em> shows you exactly what a guest sees. Worth a look before you send the link to
              anyone.
            </p>
          </section>

          <section>
            <h2 id="availability">Availability: when you are free</h2>
            <p>One weekly schedule covers all your meetings. Tick the days you work and set the hours for each.</p>
            <p>
              A day can have more than one range, <em>Add hours</em> lets you set 9:00–12:00 and 14:00–17:00 so
              nobody books over lunch. Unticking a day marks it Unavailable but keeps its hours, so switching it
              back on later takes one click.
            </p>
            <p>
              Your <strong>timezone</strong> is detected from your browser and you can change it. Guests always
              see your hours converted into their own timezone, so you never have to do the arithmetic.
              Ninety-four timezones are supported and they stay correct through daylight saving.
            </p>

            <Tip>
              These hours are the outer boundary. Within them, Meetrao still hides anything your calendar feed
              says you are busy for, so a meeting already in your calendar at 10am will not be offered, even
              though Tuesday 9–5 is open.
            </Tip>

            <p>
              Changes are not live until you press <strong>Save availability</strong>. The label beside the
              button tells you whether you have unsaved changes.
            </p>
          </section>

          <section>
            <h2 id="bookings">Bookings: who booked you</h2>
            <p>
              Every booking, split into <strong>Upcoming</strong> and <strong>Past</strong>. Each row shows the
              guest and their email, which meeting they booked, the date and time, and whether it is confirmed or
              cancelled. Search by guest name or email address.
            </p>
            <p>
              <em>Join</em> appears on anything still to come. <em>Details</em> opens the full record, including
              the note your guest left, if any, and is where you cancel from.
            </p>

            <h3>Cancelling</h3>
            <p>
              Open <em>Details</em>, then <em>Cancel meeting</em>. Your guest is emailed, the calendar invite is
              withdrawn so the meeting leaves both calendars, and the slot opens for someone else to book. It cannot be undone, but the guest can book
              a new time from your link.
            </p>
            <p>
              Guests can cancel too, from the confirmation email or their confirmation page. You are emailed when
              they do.
            </p>
          </section>

          <section>
            <h2 id="emails">Emails and notifications</h2>
            <p>
              Meetrao emails both sides whenever a booking is made, changed or cancelled. The message carries
              everything needed: the meeting, both names, the date and time in the right timezone, the duration,
              where it happens or the video link, and a <a href="#invites">calendar invite</a>.
            </p>
            <p>
              You control which of these reach you in <strong>Settings → Notifications</strong>:
            </p>

            <div className="mb-[16px] flex flex-col gap-[1px] overflow-hidden rounded-[10px] border border-line bg-line">
              {NOTICES.map(([name, text, def]) => (
                <div
                  key={name}
                  className="flex flex-wrap items-start gap-[14px] bg-surface px-[15px] py-[12px]"
                >
                  <span className="w-[150px] flex-none text-[13px] font-semibold text-ink">{name}</span>
                  <span className="min-w-[180px] flex-1 text-[13px] leading-[1.55] text-ink-2">{text}</span>
                  <span
                    className={cx(
                      "inline-flex h-[20px] flex-none items-center rounded-[4px] border px-[8px] text-[10.5px] whitespace-nowrap",
                      def === "On"
                        ? "border-accent-line bg-accent-soft text-accent-ink"
                        : "border-line bg-fill text-ink-3",
                    )}
                  >
                    {def}
                  </span>
                </div>
              ))}
            </div>

            <Tip>
              Turning these off only affects <em>your</em> inbox. Your guests still get their confirmations, and
              you will still receive password and security emails, which cannot be switched off.
            </Tip>
          </section>

          <section>
            <h2 id="guests">What your guests see</h2>
            <p>
              Your guests never sign up, never download anything and never work out a timezone. They open your
              link and see your name, title, photo and the meeting description on the left, with a calendar on
              the right.
            </p>
            <p>
              Days you do not work are dimmed. They pick a date, then a time from the slots that are genuinely
              open, then give a name, an email and (if they want) a short note. That is the whole flow: two
              taps and a form.
            </p>
            <p>
              Their confirmation email carries a calendar invite, so the meeting goes onto their calendar with
              the video link in it. The confirmation page shows the booking with a button to join the call
              for video meetings, an .ics download, and a way to cancel or reschedule. The same details arrive by
              email.
            </p>
            <p>
              If someone else takes the slot while they are choosing, Meetrao tells them plainly and refreshes
              the list. Nothing is scheduled unless it actually succeeded.
            </p>
          </section>

          <section>
            <h2 id="branding">Your logo and your colours</h2>
            <p>
              A booking page is often the first thing somebody sees of your business, and by default it
              carries our mark and our green. On Pro you can replace both, under{" "}
              <strong>Settings → Branding</strong>.
            </p>

            <h3>Your logo</h3>
            <p>
              Upload a PNG, JPG or WEBP under 1&nbsp;MB and it appears at the top of your booking page in
              place of the Meetrao mark. It is shown about a third larger than our own mark, ours is a
              wordmark drawn to sit quietly, and most logos are square or near-square, which reads as half
              the size at the same height. A wide logo still works better than a tall one, and the file you
              would put in an email signature is usually the right one. SVG
              is not accepted: an SVG can contain a script, and one served from our storage would run on our
              domain. Export a PNG at two or three times the size you need and it will stay crisp.
            </p>

            <h3>Your colours</h3>
            <p>
              You pick two: an accent and a page background. Everything else is worked out from them, the
              chosen date in the calendar, the confirm button, the highlights, the links, the focus rings,
              the panels and every border. You do not set those individually, and there is no way to end up
              with a page where five shades disagree.
            </p>
            <p>
              <strong>The accent</strong> is the colour things are made of: buttons, the selected date, the
              badges.
            </p>
            <p>
              <strong>The background</strong> is the page behind the booking card. Leave it alone and we use
              a pale wash of your accent, which is usually what you want. The point is that none of
              Meetrao&rsquo;s own palette is left on the page either way. Our warm grey, our cream panels and
              our green are all replaced the moment you choose anything at all, including on the cookie
              notice.
            </p>
            <p>
              Dark backgrounds work. The booking card itself stays white, because that is what a form is
              read on, and the few pieces of text that sit directly on the page, the legal links in the
              footer, the small label beside your logo, switch to a light colour to suit. You do not have
              to think about it.
            </p>
            <p>
              <strong>The text on top is chosen for you, by measurement.</strong> A yellow button gets dark
              text and a navy one gets white, because a readable page matters more than a consistent one.
              The same colour used as text (a link, say) is darkened until it is readable on white, which
              is why a bright brand looks slightly deeper where it appears as words than where it appears as
              a button. That is deliberate, and it is what keeps the page legible for everyone.
            </p>
            <p>
              Two kinds of colour are refused, each with a reason shown. A colour too close to white
              (#FFF9E6, a pale mint) makes a button nobody recognises as a button. A colour exactly midway
              between light and dark (around #7A7A7A) has no readable label at all, in either white or
              black. In both cases, pick a deeper or lighter shade of the same hue.
            </p>
            <p>
              The preview on the Branding screen is built from the same code as the real page, so what it
              shows is what your guests get. You do not need to save to see it.
            </p>

            <h3>Where it shows</h3>
            <p>
              Your booking page, the page for each meeting, the confirmation, the reschedule and cancel
              screens, and the embed widget on your own site. Your logo is not repeated inside the embed, because
              your site already has it at the top of the page, and nor is your background, since the widget
              sits on whatever colour your own page already has. Your accent carries through it. Emails to guests stay in
              the plain format they are in today.
            </p>
            <p>
              The “Powered by Meetrao” line comes off every one of those pages while you are on Pro. If a
              subscription lapses, your logo and colour stay saved but your pages go back to ours, and
              everything returns the moment Pro does. You do not upload anything again.
            </p>
          </section>

          <section>
            <h2 id="domain">Your own domain</h2>
            <p>
              On Pro you can serve your booking page from a name you own, so the link you hand out is{" "}
              <strong>meeting.yourcompany.com/your-name/intro</strong> rather than ours. Set it up under{" "}
              <strong>Settings → Branding</strong>.
            </p>

            <h3>Three steps</h3>
            <p>
              <strong>One.</strong> Type the name you want to use, a subdomain such as{" "}
              <code>meeting.yourcompany.com</code> or <code>book.yourcompany.com</code>, and press{" "}
              <strong>Claim</strong>. A domain can belong to one Meetrao account, so claiming it holds it
              for you.
            </p>
            <p>
              <strong>Two.</strong> Add the CNAME record we show you at whoever manages your DNS, your
              registrar, Cloudflare, your hosting provider. It points the subdomain at us.
            </p>
            <p>
              <strong>Three.</strong> Press <strong>Check DNS</strong>. DNS usually takes a few minutes and
              occasionally an hour. Once it resolves, the certificate is issued automatically and the page is
              live. There is nothing to install and nothing to renew.
            </p>

            <h3>What the links look like</h3>
            <p>
              All of these work once the domain is live:
            </p>
            <ul>
              <li>
                <code>meeting.yourcompany.com/your-name/intro</code>, one of your meetings on your own
                domain. This is the one to put in a signature.
              </li>
              <li>
                Each person in the company gets their own name in the path, so{" "}
                <code>meeting.yourcompany.com/sarah/review</code> is Sarah&rsquo;s.
              </li>
              <li>
                The domain on its own is not a page. Every link names a specific meeting, so there is nothing
                at <code>meeting.yourcompany.com</code> to show.
              </li>
            </ul>
            <p>
              Your meetrao.com meeting links keep working the whole time, so anything already shared or
              printed is safe. Search engines are told your domain is the real address, which is the point of having
              one. Confirmation links in emails to guests, and the legal pages, are served unchanged on your
              domain.
            </p>
            <p>
              A custom domain serves your account only. A link on your domain that names somebody else is
              read as one of your meetings and shows nothing if you have no meeting by that name.
            </p>

            <h3>Taking it back</h3>
            <p>
              <strong>Remove</strong> releases the domain immediately and your meetrao.com link carries on.
              Remember to delete the CNAME record at your DNS provider afterwards, or the name will point at
              a page that no longer answers.
            </p>
          </section>

          <section>
            <h2 id="settings">Settings and your account</h2>
            <p>
              Settings live behind your profile at the bottom of the sidebar. Click it and choose{" "}
              <strong>Settings</strong>, or <strong>Log out</strong>. Each panel has its own address, so you can link straight to one.
            </p>

            <div className="mb-[16px] flex flex-col gap-[1px] overflow-hidden rounded-[10px] border border-line bg-line">
              {PANELS.map((panel) => (
                <div key={panel.title} className="flex gap-[14px] bg-surface px-[15px] py-[13px]">
                  <span className="inline-flex h-[32px] w-[32px] flex-none items-center justify-center rounded-[8px] bg-accent-soft text-accent-ink">
                    <Icon name={panel.icon} size={14} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="text-[13.5px] font-semibold text-ink">{panel.title}</span>
                    <span className="text-[13px] leading-[1.55] text-pretty text-ink-2">{panel.text}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="my-[16px] flex gap-[11px] rounded-[8px] border border-red-line bg-red-soft px-[15px] py-[13px]">
              <Icon name="circle-exclamation" weight="solid" size={12} className="mt-[3px] flex-none text-red" />
              <span className="text-[13px] leading-[1.6] text-pretty text-red-ink">
                <strong className="font-semibold text-red">
                  Deleting your account is immediate and permanent.
                </strong>{" "}
                Your booking page stops working, every upcoming meeting is cancelled, your guests are notified,
                and your data is erased. We keep no copy. Export anything you need first.
              </span>
            </div>
          </section>

          <section>
            <h2 id="faq">Common questions</h2>
            <div className="flex flex-col gap-[1px] overflow-hidden rounded-[10px] border border-line bg-line">
              {FAQS.map(([q, a]) => (
                <div key={q} className="flex flex-col gap-[6px] bg-surface px-[17px] py-[15px]">
                  <span className="text-[13.5px] font-semibold text-ink">{q}</span>
                  <span className="text-[13px] leading-[1.6] text-pretty text-ink-2">{a}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-[30px] flex flex-wrap items-center gap-[16px] rounded-[12px] border border-line bg-surface px-[18px] py-[16px]">
            <div className="flex min-w-[220px] flex-1 flex-col gap-[3px]">
              <span className="text-[14px] font-semibold text-ink">Still stuck?</span>
              <span className="text-[13px] leading-[1.55] text-ink-2">
                Email us and a person will read it. Tell us what you were trying to do and what happened instead.
              </span>
            </div>
            <Link
              href="/support"
              className="unlink inline-flex h-[38px] flex-none items-center gap-[9px] rounded-[7px] border border-accent bg-accent px-[15px] text-[13.5px] font-semibold text-on-accent hover:bg-accent-2 hover:text-on-accent"
            >
              <Icon name="envelope" size={12} />
              Contact support
            </Link>
          </div>
        </div>
      </div>
      </div>

      <SiteFooter />
    </div>
  );
}
