import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteNav } from "@/components/marketing/site-chrome";
import { signOut } from "@/lib/actions/auth";
import { optionalSession } from "@/lib/data/session";
import { Eyebrow } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icon";
import { cx } from "@/lib/cx";

export const metadata: Metadata = {
  title: "Help Centre",
  description: "Every part of Meetrao explained, in the order you would meet it.",
};

const PILLARS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "link",
    title: "One link, always current",
    text: "Share meetrao.com/your-name once. It reflects your calendar and hours as they are today, not as they were when you sent it.",
  },
  {
    icon: "calendar",
    title: "Never double-booked",
    text: "Meetrao checks your Google Calendar before offering any slot, so nothing lands on top of what you already have.",
  },
  {
    icon: "video",
    title: "On both calendars",
    text: "Each booking creates one event with its own Google Meet link, and invites your guest — so it lands on their calendar as well as yours.",
  },
];

const TOC: { id: string; icon: IconName; label: string }[] = [
  { id: "start", icon: "sign-in", label: "Getting started" },
  { id: "setup", icon: "rectangle-list", label: "Setting up" },
  { id: "dashboard", icon: "house", label: "Dashboard" },
  { id: "meetings", icon: "list", label: "Meetings" },
  { id: "availability", icon: "clock", label: "Availability" },
  { id: "bookings", icon: "calendar", label: "Bookings" },
  { id: "emails", icon: "envelope", label: "Emails" },
  { id: "guests", icon: "users", label: "What guests see" },
  { id: "settings", icon: "gear", label: "Settings" },
  { id: "faq", icon: "circle-question", label: "Common questions" },
];

const STEPS: [string, string, string][] = [
  ["1", "Welcome", "A short summary of what is coming. Nothing to fill in."],
  [
    "2",
    "Connect your calendar",
    "One Google permission. Meetrao reads when you are busy, writes each booking to your calendar and invites your guest — it never reads what your meetings are about.",
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
    "How far ahead people can book — 7, 14, 30 or 60 days. Keeps your calendar from filling out to next quarter.",
  ],
];

const NOTICES: [string, string, "On" | "Off"][] = [
  ["New booking", "Someone books a time with you.", "On"],
  ["Booking changed", "A booking is rescheduled or edited.", "On"],
  ["Booking cancelled", "You or your guest cancels.", "On"],
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
    text: "Connect or disconnect Google Calendar, and set your timezone. Disconnecting stops conflict checking straight away.",
  },
  {
    icon: "sliders",
    title: "Booking",
    text: "Defaults applied to every new meeting you create — a starting duration and minimum notice, so you are not setting them each time.",
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
    "Yes. Create as many as you like — each gets its own link, and your main link shows all the active ones.",
  ],
  [
    "Can guests reschedule?",
    "Not yet. They can cancel and book a new time from your link, which achieves the same thing in two steps.",
  ],
  [
    "Does Meetrao read my meeting titles or notes?",
    "No. It sees only whether a period is busy or free. Titles, guests, descriptions and attachments are never read. It does write the bookings you accept, and invites your guest to them.",
  ],
  [
    "What if I disconnect my calendar?",
    "Your link keeps working, but Meetrao can no longer see conflicts — so guests may be offered times you are not free. A banner reminds you until you reconnect.",
  ],
  [
    "Can I use something other than Google Meet?",
    "Not in this release. Every booking gets a Google Meet link. Other options may come later.",
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
    "Yes, by default. Meetrao creates one event and adds your guest as an attendee, so the meeting, description and Meet link appear on both calendars. If they do not use Google Calendar, the invitation still arrives by email and they can download an .ics file.",
  ],
  [
    "What does it cost?",
    "Nothing while Meetrao is in beta. If paid plans arrive we will email you first, and you would have to opt in — a free account is never billed automatically.",
  ],
  [
    "How do I get my data out?",
    "Email us and we will send you a copy. Do it before deleting your account, since deletion is immediate and we keep no copy.",
  ],
];

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-[16px] flex gap-[11px] rounded-[8px] border border-line bg-fill px-[15px] py-[13px]">
      <Icon name="circle-info" weight="solid" size={12} className="mt-[3px] flex-none text-accent" />
      <span className="text-[13px] leading-[1.6] text-pretty text-ink-2">{children}</span>
    </div>
  );
}

export default async function HelpPage() {
  const session = await optionalSession();

  const chrome = session
    ? {
        name: session.profile.full_name || session.profile.username,
        email: session.profile.email,
        avatarUrl: session.profile.avatar_url,
        onSignOut: signOut,
      }
    : null;

  return (
    <div className="min-h-screen bg-[#F4F3ED]">
      <SiteNav account={chrome} />
    <div className="mx-auto max-w-[1148px] px-[26px] pt-[40px] pb-[64px] max-[560px]:px-[18px]">
      <div className="flex max-w-[680px] flex-col gap-[12px]">
        <h1 className="m-0 font-serif text-[clamp(32px,4vw,46px)] leading-[1.04] font-normal tracking-[-0.02em] text-ink">
          Help Centre
        </h1>
        <p className="m-0 text-[15px] leading-[1.65] text-pretty text-ink-2">
          Meetrao replaces the back-and-forth of finding a time. You connect your calendar once, describe the
          meetings people can book, set the hours you are free, and share one link. Everything below explains a
          section of the app, in the order you would meet it.
        </p>
      </div>

      <div className="mt-[26px] grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[14px]">
        {PILLARS.map((pillar) => (
          <div
            key={pillar.title}
            className="flex flex-col gap-[10px] rounded-[14px] border border-line bg-surface px-[20px] pt-[20px] pb-[22px]"
          >
            <span className="inline-flex h-[32px] w-[32px] flex-none items-center justify-center rounded-[8px] bg-accent-soft text-accent">
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
                className="unlink flex items-center gap-[10px] rounded-[6px] px-[9px] py-[7px] text-[12.5px] text-ink-2 hover:bg-accent-soft hover:text-accent"
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
              link straight away. <strong>You cannot use Meetrao until you click it</strong> — this stops anyone
              signing up with an address that is not theirs.
            </p>
            <p>
              The link lasts 24 hours. If it does not arrive, check your spam folder, then use{" "}
              <em>Resend the email</em> on the waiting screen. Typed your address wrong?{" "}
              <em>Use a different email</em> takes you back to sign-up.
            </p>

            <h3>With Google</h3>
            <p>
              Continue with Google and you skip the confirmation step entirely — Google has already verified the
              address. You go straight to setup.
            </p>

            <Tip>
              Forgot your password? Use <em>Forgot?</em> next to the password field. We send a reset link that
              expires in one hour.
            </Tip>
          </section>

          <section>
            <h2 id="setup">Setting up — the five steps</h2>
            <p>
              After you confirm your email, Meetrao walks you through setup. The tracker at the top shows where
              you are. Everything here can be changed later, so do not agonise over it.
            </p>

            <div className="mb-[16px] flex flex-col gap-[1px] overflow-hidden rounded-[10px] border border-line bg-line">
              {STEPS.map(([n, title, text]) => (
                <div key={n} className="flex gap-[14px] bg-surface px-[15px] py-[13px]">
                  <span className="inline-flex h-[24px] w-[24px] flex-none items-center justify-center rounded-full bg-accent-soft font-mono text-[11px] font-medium text-accent">
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
              You can skip connecting your calendar, but then Meetrao cannot see when you are busy — guests may
              be offered times you already have something in. Connect it before you share your link.
            </Tip>

            <p>
              Need to stop halfway? Use the account button at the top-right of the setup screen to log out. Your
              progress is saved and you can pick it up later.
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
              booked from your link, and your average <strong>reply time</strong> — how long people take to book
              after opening your link.
            </p>
            <p>
              Below that, <strong>Today</strong> lists what is happening now, each row with a <em>Join</em>{" "}
              button that opens Google Meet directly. <strong>Later this week</strong> follows. <em>Details</em>{" "}
              on any row opens the full booking, including any note your guest left.
            </p>
            <p>If your calendar is not connected, an amber banner sits at the top until it is. It is worth clearing.</p>
            <p>
              <strong>Copy link</strong> in the header copies your booking link. If more than one meeting is
              active it becomes a dropdown, so you can copy the link for a specific meeting instead of your
              general one.
            </p>
          </section>

          <section>
            <h2 id="meetings">Meetings — what people can book</h2>
            <p>
              A &ldquo;meeting&rdquo; is a type of appointment, not a single booking. Most people have two or
              three — a short intro call, a standard consultation, a longer deep dive. Each has its own link.
            </p>

            <h3>Creating one</h3>
            <p>
              Give it a name guests will recognise and a description — both appear on your booking page. Pick a
              duration (15, 30, 45 or 60 minutes). Location is Google Meet; it is the only option in this
              release, and every booking gets its own link.
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
              stays in your list — with its settings and history intact — but nobody can book it from your link.
              Better than deleting something you might want back.
            </p>
            <p>
              <em>Preview</em> shows you exactly what a guest sees. Worth a look before you send the link to
              anyone.
            </p>
          </section>

          <section>
            <h2 id="availability">Availability — when you are free</h2>
            <p>One weekly schedule covers all your meetings. Tick the days you work and set the hours for each.</p>
            <p>
              A day can have more than one range — <em>Add hours</em> lets you set 9:00–12:00 and 14:00–17:00 so
              nobody books over lunch. Unticking a day marks it Unavailable but keeps its hours, so switching it
              back on later takes one click.
            </p>
            <p>
              Your <strong>timezone</strong> is detected from your browser and you can change it. Guests always
              see your hours converted into their own timezone, so you never have to do the arithmetic.
              Ninety-four timezones are supported and they stay correct through daylight saving.
            </p>

            <Tip>
              These hours are the outer boundary. Within them, Meetrao still hides anything your Google Calendar
              says you are busy for — so a meeting already in your calendar at 10am will not be offered, even
              though Tuesday 9–5 is open.
            </Tip>

            <p>
              Changes are not live until you press <strong>Save availability</strong>. The label beside the
              button tells you whether you have unsaved changes.
            </p>
          </section>

          <section>
            <h2 id="bookings">Bookings — who booked you</h2>
            <p>
              Every booking, split into <strong>Upcoming</strong> and <strong>Past</strong>. Each row shows the
              guest and their email, which meeting they booked, the date and time, and whether it is confirmed or
              cancelled. Search by guest name or email address.
            </p>
            <p>
              <em>Join</em> appears on anything still to come. <em>Details</em> opens the full record — including
              the note your guest left, if any — and is where you cancel from.
            </p>

            <h3>Cancelling</h3>
            <p>
              Open <em>Details</em>, then <em>Cancel meeting</em>. Your guest is emailed, the calendar event is
              removed, and the slot opens for someone else to book. It cannot be undone — but the guest can book
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
              everything needed: the meeting, both names, the date and time in the right timezone, the duration
              and the Google Meet link.
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
                      "inline-flex h-[20px] flex-none items-center rounded-[4px] border px-[8px] font-mono text-[10.5px] whitespace-nowrap",
                      def === "On"
                        ? "border-accent-line bg-accent-soft text-accent"
                        : "border-line bg-fill text-ink-3",
                    )}
                  >
                    {def}
                  </span>
                </div>
              ))}
            </div>

            <Tip>
              Turning these off only affects <em>your</em> inbox. Your guests still get their confirmations — and
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
              open, then give a name, an email and — if they want — a short note. That is the whole flow: two
              taps and a form.
            </p>
            <p>
              Because Meetrao invites them to the calendar event, the meeting appears on their calendar
              automatically with the Meet link attached — they do not have to add it themselves. The confirmation
              page shows the booking with a <em>Join Google Meet</em> button, an .ics download if they use
              something other than Google, and a way to cancel. The same details arrive by email.
            </p>
            <p>
              If someone else takes the slot while they are choosing, Meetrao tells them plainly and refreshes
              the list. Nothing is scheduled unless it actually succeeded.
            </p>
          </section>

          <section>
            <h2 id="settings">Settings and your account</h2>
            <p>
              Settings live behind your profile at the bottom of the sidebar. Click it and choose{" "}
              <strong>Settings</strong> — or <strong>Log out</strong>. There are five panels.
            </p>

            <div className="mb-[16px] flex flex-col gap-[1px] overflow-hidden rounded-[10px] border border-line bg-line">
              {PANELS.map((panel) => (
                <div key={panel.title} className="flex gap-[14px] bg-surface px-[15px] py-[13px]">
                  <span className="inline-flex h-[32px] w-[32px] flex-none items-center justify-center rounded-[8px] bg-accent-soft text-accent">
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
                and your data is erased — we keep no copy. Export anything you need first.
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
              className="unlink inline-flex h-[38px] flex-none items-center gap-[9px] rounded-[7px] border border-accent bg-accent px-[15px] text-[13.5px] font-semibold text-white hover:bg-accent-2 hover:text-white"
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
