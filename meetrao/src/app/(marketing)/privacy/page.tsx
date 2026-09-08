import type { Metadata } from "next";
import {
  DocContextStrip,
  DocFooterNote,
  DocHeader,
  DocLayout,
  DraftNotice,
  NeedsDecision,
  type TocEntry,
} from "@/components/marketing/legal-doc";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Meetrao collects from your calendar, and what it deliberately leaves alone.",
};

const TOC: TocEntry[] = [
  { id: "p-collect", label: "1. What we collect" },
  { id: "p-not", label: "2. What we don't do" },
  { id: "p-why", label: "3. Why we use it" },
  { id: "p-share", label: "4. Who else touches it" },
  { id: "p-where", label: "5. Where it is stored" },
  { id: "p-keep", label: "6. How long we keep it" },
  { id: "p-rights", label: "7. Your rights" },
  { id: "p-security", label: "8. Security" },
  { id: "p-cookies", label: "9. Cookies" },
  { id: "p-children", label: "10. Children" },
  { id: "p-changes", label: "11. Changes to this policy" },
];

/* The design's template loops over `shortVersion`, `purposes` and `processors`
   but its logic never defines them, so they render empty in the prototype.
   These are written from the policy's own text and the stack the product
   actually runs on — nothing here claims anything the rest of the page does
   not already say. Worth a check against the final infrastructure. */

const SHORT_VERSION = [
  "We read whether you are busy — never what your meetings are about.",
  "We do not sell your data, or your guests' data, to anyone.",
  "We never use your data or your guests' data to train machine-learning models.",
  "Delete your account and it goes immediately. There is no grace-period copy.",
];

const PURPOSES: [string, string][] = [
  ["Account details", "Signing you in, and keeping your booking link yours."],
  ["Calendar busy times", "Never offering a time you already have something in."],
  ["Permission to create events", "Writing each confirmed booking to your calendar with its Meet link."],
  ["Guest name, email and note", "Confirming the booking, inviting them to the event, and telling you who is coming."],
  ["Notification preferences", "Sending only the messages you asked for."],
];

const PROCESSORS: [string, string, string][] = [
  ["Vercel", "Hosting and content delivery", "United States"],
  ["Supabase", "Database, authentication and file storage", "Asia Pacific (Tokyo)"],
  ["Google", "Calendar, Meet, and Sign in with Google", "United States"],
  ["Resend", "Transactional email delivery", "United States"],
];

export default function PrivacyPage() {
  return (
    <>
      <DocContextStrip title="Privacy Policy" otherLabel="Terms of Service" otherHref="/terms" />

      <DraftNotice>
        Written from how Meetrao actually works, not from a template. A lawyer in Bangladesh and the US should
        review it before it goes live. Two things still need attention — a transfer-mechanism decision and a
        cookie-consent banner that is not built yet. Both are marked in yellow inline.
      </DraftNotice>

      <DocLayout toc={TOC} ariaLabel="Privacy Policy contents">
        <DocHeader
          eyebrow="Privacy Policy"
          title="What we collect, and what we don't"
          intro="Meetrao needs your calendar to do its job. That is a lot of trust, so this page is specific about what we take, what we leave alone, and who else touches it. No vague language about “improving your experience”."
          meta={["Last updated 7 September 2026", "Controller: Airly Studio"]}
        />

        <div className="mb-[26px] flex flex-col gap-[11px] rounded-[10px] border border-accent-line bg-accent-soft px-[16px] py-[15px]">
          <span className="text-[13.5px] font-semibold text-accent">The short version</span>
          <div className="flex flex-col gap-[8px]">
            {SHORT_VERSION.map((text) => (
              <div key={text} className="flex items-start gap-[10px]">
                <Icon name="check" weight="solid" size={10} className="mt-[4px] flex-none text-accent" />
                <span className="text-[13px] leading-[1.55] text-ink-2">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <h2 id="p-collect">1. What we collect</h2>
        <p>Everything below is either something you typed, or something the product cannot work without.</p>

        <h3>From you, the host</h3>
        <ul>
          <li>
            <strong>Account details</strong> — your name, email address, password (stored hashed, never in
            readable form), and whether your email is confirmed.
          </li>
          <li>
            <strong>Profile</strong> — job title, username and profile photo if you add one. Your name, title
            and photo are shown publicly on your booking page.
          </li>
          <li>
            <strong>Your setup</strong> — meeting names and descriptions, durations, booking rules, weekly
            availability and your timezone. We detect your timezone from your browser and you can change it.
          </li>
          <li>
            <strong>Notification preferences</strong> — the five switches in Settings that decide which emails
            we send you.
          </li>
        </ul>

        <h3>From your Google Calendar</h3>
        <ul>
          <li>
            <strong>Busy and free times</strong> — when you have something on, so we never offer that slot. We
            do not read event titles, guest lists, descriptions, locations or attachments.
          </li>
          <li>
            <strong>Permission to create events</strong> — used only to write confirmed bookings to your
            calendar with a Google Meet link, to invite your guest to that event so it reaches their calendar,
            and to update or remove it when the booking changes or is cancelled.
          </li>
          <li>
            <strong>An access token</strong> — stored encrypted so we can do the above without asking you again.
            Deleted when you disconnect or delete your account.
          </li>
        </ul>

        <h3>From your guests</h3>
        <ul>
          <li>
            <strong>Name and email</strong> — required to confirm a booking and send the invitation.
          </li>
          <li>
            <strong>An optional note</strong> — whatever they choose to type. It is passed to you and included
            in your notification email.
          </li>
          <li>
            <strong>Their timezone</strong> — detected in the browser so times display correctly for them.
          </li>
        </ul>

        <p>
          Guests do not create accounts and do not get passwords. For guest data, the host is the one who decides
          how it is used — we handle it on their instructions.
        </p>
        <p>
          Because Meetrao invites the guest to the host&rsquo;s calendar event by default, the guest&rsquo;s name
          and email are passed to Google Calendar as an attendee, and host and guest can each see the
          other&rsquo;s address on the event. That exchange is how the meeting reaches both calendars.
        </p>

        <h3>Automatically</h3>
        <ul>
          <li>
            Basic technical data — IP address, browser and device type, and pages visited — used to keep the
            service running, prevent abuse and understand which features get used.
          </li>
          <li>
            Whether our emails were delivered and opened, so we can tell when a confirmation has failed to
            arrive.
          </li>
        </ul>

        <h2 id="p-not">2. What we don&rsquo;t do</h2>
        <ul>
          <li>We do not sell your data, or your guests&rsquo; data, to anyone.</li>
          <li>We do not read the contents of your calendar events.</li>
          <li>We do not use your data or your guests&rsquo; data to train machine-learning models.</li>
          <li>We do not run advertising or share data with ad networks.</li>
          <li>We do not email your guests marketing. They hear from us only about the booking they made.</li>
        </ul>

        <h2 id="p-why">3. Why we use it</h2>
        <div className="mb-[16px] flex flex-col gap-[1px] overflow-hidden rounded-[10px] border border-line bg-line">
          {PURPOSES.map(([what, why]) => (
            <div key={what} className="flex flex-wrap gap-x-[16px] gap-y-[3px] bg-surface px-[15px] py-[12px]">
              <span className="w-[210px] flex-none text-[13px] font-semibold text-ink">{what}</span>
              <span className="min-w-[200px] flex-1 text-[13px] leading-[1.55] text-ink-2">{why}</span>
            </div>
          ))}
        </div>
        <p>
          If you are in the EU or UK, our legal bases are: performing our contract with you (running the service,
          sending booking emails), legitimate interests (keeping the service secure and working), your consent
          (connecting Google Calendar, marketing email), and legal obligation where one applies.
        </p>

        <h2 id="p-share">4. Who else touches it</h2>
        <p>
          We use a small number of companies to run Meetrao. Each is contractually limited to what we hire them
          for, and none may use your data for their own purposes.
        </p>
        <div className="mb-[16px] flex flex-col gap-[1px] overflow-hidden rounded-[10px] border border-line bg-line">
          {PROCESSORS.map(([name, role, region]) => (
            <div key={name} className="flex flex-wrap items-baseline gap-x-[16px] gap-y-[3px] bg-surface px-[15px] py-[12px]">
              <span className="w-[110px] flex-none text-[13px] font-semibold text-ink">{name}</span>
              <span className="min-w-[200px] flex-1 text-[13px] text-ink-2">{role}</span>
              <span className="flex-none font-mono text-[11.5px] text-ink-3">{region}</span>
            </div>
          ))}
        </div>
        <p>
          The people you meet with also see things: your guest sees your name, title, photo, meeting details and
          the times you are free, and you see your guest&rsquo;s name, email and note. That exchange is the point
          of the product.
        </p>
        <p>
          We will disclose data if the law requires it, and to protect the service or someone&rsquo;s safety. If
          Meetrao is ever sold or merged, your data may transfer with it — we will tell you first.
        </p>

        <h2 id="p-where">5. Where it is stored</h2>
        <p>
          Airly Studio operates from Bangladesh and the United States, and our providers run servers in several
          countries. Your data will therefore be transferred and stored outside your own country, including in
          the United States.
        </p>
        <p>
          Where we move personal data out of the EU or UK, we rely on the European Commission&rsquo;s Standard
          Contractual Clauses, or the UK Addendum, with the providers concerned.
        </p>

        <NeedsDecision>
          name the actual hosting regions once infrastructure is fixed, and confirm SCCs are signed with each
          provider. Bangladesh has no EU adequacy decision, so EU user data needs a transfer mechanism in place
          before launch — not after.
        </NeedsDecision>

        <h2 id="p-keep">6. How long we keep it</h2>
        <p>
          While your account is open, we keep your data so the service works. When your account is deleted — by
          you, or by us for a breach of the terms — we delete it immediately. Profile, booking link, meetings,
          availability, booking history and calendar tokens all go. We do not keep a grace-period copy, so export
          anything you want to keep first.
        </p>
        <p>
          Two caveats, both narrow. Encrypted backups may hold deleted data for a short window before they rotate
          out. And where the law requires us to retain a record, we keep only that record and only for as long as
          required.
        </p>

        <h2 id="p-rights">7. Your rights</h2>
        <p>
          Wherever you are, you can ask us to show you what we hold, correct it, delete it, or send you a copy.
          Email <a href="mailto:hello@airlystudio.com">hello@airlystudio.com</a> and we will reply within 30
          days. We will not charge you or treat you differently for asking.
        </p>
        <p>
          Some of it you can do yourself: edit your profile in Settings, change your notification preferences,
          disconnect Google Calendar, or delete your account outright.
        </p>
        <p>
          <strong>If you are in the EU or UK</strong>, you also have the right to object to processing, to
          restrict it, to data portability, and to withdraw consent at any time. You can complain to your
          national data protection authority — for the UK, the ICO.
        </p>
        <p>
          <strong>If you are in California</strong>, you have the right to know what we collect, to delete it, to
          correct it, and to opt out of sale or sharing — although we do not sell or share personal information
          as those terms are defined, so there is nothing to opt out of.
        </p>
        <p>
          <strong>If you are a guest</strong>, not a host: the person you booked with controls your booking data.
          Ask them, or ask us and we will pass it on.
        </p>

        <h2 id="p-security">8. Security</h2>
        <p>
          Data is encrypted in transit and at rest. Passwords are hashed, never stored readably. Calendar tokens
          are encrypted. Access to production data is limited to the people who need it. Email addresses have to
          be confirmed before an account works, which keeps someone from signing up as you.
        </p>
        <p>
          No system is perfectly secure. If a breach affects your data, we will tell you and the relevant
          regulator as quickly as the law requires.
        </p>

        <h2 id="p-cookies">9. Cookies</h2>
        <p>
          We use cookies to keep you signed in and to remember basic preferences — these are necessary and cannot
          be turned off without breaking the service. We also use analytics cookies to understand which features
          get used. You can refuse those without losing anything.
        </p>

        <NeedsDecision label="Not yet built">
          EU and UK visitors must be able to refuse analytics cookies <em>before</em> they are set, which needs a
          consent banner. There is none in the design yet. Either add one, or configure analytics to run
          cookieless.
        </NeedsDecision>

        <h2 id="p-children">10. Children</h2>
        <p>
          Meetrao is not for children. We do not knowingly collect data from anyone under 16. If you believe a
          child has given us their information, email us and we will delete it.
        </p>

        <h2 id="p-changes">11. Changes to this policy</h2>
        <p>
          If we change how we use your data in a way that matters, we will email you before it takes effect and
          update the date at the top. Minor wording fixes we will just make.
        </p>

        <DocFooterNote title="Privacy questions or requests">
          Email <a href="mailto:hello@airlystudio.com">hello@airlystudio.com</a>, or write to 44/A Judge Court
          Road, Cumilla, Bangladesh, or Alexandria, VA, USA.
        </DocFooterNote>
      </DocLayout>
    </>
  );
}
