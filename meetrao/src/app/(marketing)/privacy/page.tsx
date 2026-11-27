import type { Metadata } from "next";
import Link from "next/link";
import {
  DocContextStrip,
  DocFooterNote,
  DocHeader,
  DocLayout,
  type TocEntry,
} from "@/components/marketing/legal-doc";
import { ChangeAnalyticsChoice } from "@/components/analytics/consent";
import { Icon } from "@/components/ui/icon";
import { OPERATOR_NAME, OPERATOR_SITE, OPERATOR_URL, POSTAL_ADDRESS, SUPPORT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Meetrao collects, why it keeps only busy times from your calendar feed, and what " +
    "it leaves alone, including the Google Limited Use disclosure.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "27 November 2026";

const TOC: TocEntry[] = [
  { id: "p-who", label: "1. Who we are" },
  { id: "p-collect", label: "2. What we collect" },
  { id: "p-calendar-feed", label: "3. Your calendar feed" },
  { id: "p-invites", label: "· Calendar invites" },
  { id: "p-google", label: "4. Sign in with Google" },
  /* Sub-entries, indented in the rail. A verification reviewer should be able
     to reach each disclosure in one click from the top of the page rather
     than by scrolling section 4. */
  { id: "p-google-share", label: "· Who we share it with" },
  { id: "p-google-protect", label: "· How we protect it" },
  { id: "p-limited-use", label: "· Google Limited Use" },
  { id: "p-not", label: "5. What we don't do" },
  { id: "p-why", label: "6. Why we use it" },
  { id: "p-share", label: "7. Who else touches it" },
  { id: "p-where", label: "8. Where it is stored" },
  { id: "p-keep", label: "9. How long we keep it" },
  { id: "p-rights", label: "10. Your rights" },
  { id: "p-security", label: "11. Security" },
  { id: "p-cookies", label: "12. Cookies and analytics" },
  { id: "p-children", label: "13. Children" },
  { id: "p-changes", label: "14. Changes to this policy" },
  { id: "p-contact", label: "15. Contact us" },
];

const SHORT_VERSION = [
  "From your calendar feed we keep only when you are busy: never what your meetings are about.",
  "We do not sell your data, or your guests' data, to anyone.",
  "We never use your data or your guests' data to train machine-learning models.",
  "Delete your account and it goes immediately. There is no grace-period copy.",
];

const PURPOSES: [string, string][] = [
  ["Account details", "Signing you in, and keeping your booking link yours."],
  ["Calendar feed address", "Fetching your calendar's feed so busy times can be found."],
  ["Busy start and end times", "Never offering a time you already have something in."],
  ["Your video link", "Putting the link you saved on each video booking."],
  ["Guest name, email and note", "Confirming the booking, sending both of you the calendar invite, and telling you who is coming."],
  ["Notification preferences", "Sending only the messages you asked for."],
  ["Page views", "Knowing which pages are read and whether the site works on real phones."],
];

/**
 * Which providers receive Google user data specifically, and what each one gets.
 *
 * Google user data is now only what Sign in with Google returns: name, email
 * address and profile picture. Deliberately separate from PROCESSORS below.
 * That list answers "who helps run Meetrao"; this one answers the narrower
 * question Google's verification review asks, and the answers differ. Google
 * Analytics is on the first list and must never be on this one.
 */
const GOOGLE_DATA_RECIPIENTS: [string, string][] = [
  [
    "Convex (database and authentication, N. Virginia)",
    "Stores the name, email address and profile picture from Sign in with Google as part of your account, and runs the sign-in itself. The only provider that holds Google user data at rest.",
  ],
  [
    "Vercel (hosting, functions in Tokyo)",
    "Processes it in memory while a page is being served, for example showing your name in the dashboard. Stores none of it.",
  ],
  [
    "Resend (email, United States)",
    "Receives your name and email address when an email is sent to you or names you as the host, such as a booking confirmation and its calendar invite.",
  ],
  [
    "Google",
    "The source. Google confirms who you are when you sign in. Meetrao sends nothing back to your Google account.",
  ],
];

const PROCESSORS: [string, string, string][] = [
  ["Vercel", "Hosting and content delivery", "United States"],
  ["Convex", "Database, authentication and file storage", "United States (N. Virginia)"],
  ["Google", "Sign in with Google, and Google Analytics", "United States"],
  ["Resend", "Transactional email delivery, including calendar invites", "United States"],
];

export default function PrivacyPage() {
  return (
    <>
      <DocContextStrip title="Privacy Policy" otherLabel="Terms of Service" otherHref="/terms" />

      <DocLayout toc={TOC} ariaLabel="Privacy Policy contents">
        <DocHeader
          eyebrow="Privacy Policy"
          title="What we collect, and what we don't"
          intro="Meetrao needs to know when you are busy to do its job. That is still trust, so this page is specific about what we take, what we leave alone, and who else touches it. No vague language about “improving your experience”."
          meta={[`Last updated ${UPDATED}`, `Data controller: ${OPERATOR_NAME}, Alexandria, Virginia, USA`]}
        />

        <p>
          <strong>What changed on {UPDATED}:</strong> Meetrao is now operated by {OPERATOR_NAME} in the United
          States, which is now the data controller (sections 1 and 8).
        </p>
        <p>
          <strong>Also on {UPDATED}:</strong> Google Calendar connection removed; calendar feeds and emailed
          invites described (section 3).
        </p>

        <div className="mb-[26px] flex flex-col gap-[11px] rounded-[10px] border border-accent-line bg-accent-soft px-[16px] py-[15px]">
          <span className="text-[13.5px] font-semibold text-accent-ink">The short version</span>
          <div className="flex flex-col gap-[8px]">
            {SHORT_VERSION.map((text) => (
              <div key={text} className="flex items-start gap-[10px]">
                <Icon name="check" weight="solid" size={10} className="mt-[4px] flex-none text-accent-ink" />
                <span className="text-[13px] leading-[1.55] text-ink-2">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <h2 id="p-who">1. Who we are</h2>
        <p>
          Meetrao is a scheduling service operated by {OPERATOR_NAME}, at {POSTAL_ADDRESS} (
          <a href={OPERATOR_URL}>{OPERATOR_SITE}</a>). In this policy, &ldquo;we&rdquo;, &ldquo;us&rdquo; and
          &ldquo;Meetrao&rdquo; mean {OPERATOR_NAME}, and
          &ldquo;you&rdquo; means the person using the service.
        </p>
        <p>
          We are the data controller for the personal data described here, except for the data your guests give
          you when they book, see <a href="#p-rights">section 10</a>. The one address to reach us at is{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>

        <h2 id="p-collect">2. What we collect</h2>
        <p>Everything below is either something you typed, or something the product cannot work without.</p>

        <h3>From you, the host</h3>
        <ul>
          <li>
            <strong>Account details</strong>, your name, email address, password (stored hashed, never in
            readable form), and whether your email is confirmed.
          </li>
          <li>
            <strong>Profile</strong>, job title, username and profile photo if you add one. Your name, title
            and photo are shown publicly on your booking page.
          </li>
          <li>
            <strong>Your setup</strong>, meeting names and descriptions, durations, booking rules, weekly
            availability and your timezone. We detect your timezone from your browser and you can change it.
          </li>
          <li>
            <strong>Notification preferences</strong>, the switches in Settings that decide which emails we
            send you.
          </li>
          <li>
            <strong>Your calendar feed address</strong>, if you add one, and the busy times taken from it. See{" "}
            <a href="#p-calendar-feed">section 3</a>.
          </li>
          <li>
            <strong>Your video link</strong>, if you save one, such as a Zoom, Google Meet or Teams room. It is
            shared with each guest who books a video call.
          </li>
        </ul>

        <h3>From your guests</h3>
        <ul>
          <li>
            <strong>Name and email</strong>, required to confirm a booking and send the invitation.
          </li>
          <li>
            <strong>An optional note</strong>, whatever they choose to type. It is passed to you and included
            in your notification email.
          </li>
          <li>
            <strong>Their timezone</strong>, detected in the browser so times display correctly for them.
          </li>
        </ul>

        <p>
          Guests do not create accounts and do not get passwords. For guest data, the host is the one who decides
          how it is used. We handle it on their instructions.
        </p>
        <p>
          Every booking email carries a calendar invite naming both host and guest, so each can see the
          other&rsquo;s name and email address in it. That exchange is how the meeting reaches both calendars.
        </p>

        <h3>Automatically, when you visit the website</h3>
        <p>
          We count page views on the public pages, the home page, this one, the Terms, Help, Support, the
          sign-in pages and public booking pages. It works without cookies and without storing anything on your
          device. For each page view we record:
        </p>
        <ul>
          <li>the path of the page, with the query string removed before it is stored;</li>
          <li>the host of the site you arrived from, if any, &ldquo;google.com&rdquo;, never the full address;</li>
          <li>a country, and sometimes a region and city, derived by our host from your IP address;</li>
          <li>whether you are on a phone, a tablet or a desktop, and which browser and operating system family;</li>
          <li>
            a one-way hash of your IP address, your browser&rsquo;s user-agent string and a secret, which lets us
            count the same person&rsquo;s two page views as one visit.
          </li>
        </ul>
        <p>
          <strong>We do not store your IP address.</strong> It is used to compute that hash and to look up a
          country, and is not written anywhere. The hash includes today&rsquo;s date, so it changes at midnight
          UTC: we can tell how many people visited today, and we cannot tell whether any of them came back next
          week. The signed-in product (your dashboard, bookings, meetings, contacts and settings) is not
          counted at all.
        </p>
        <p>
          Separately, our email provider tells us whether a message we sent was delivered and opened, so we can
          tell when a booking confirmation has failed to arrive.
        </p>
        <p>
          Google Analytics is also available on this site, and it is off unless you turn it on. See{" "}
          <a href="#p-cookies">section 12</a>.
        </p>

        <h2 id="p-calendar-feed">3. Your calendar feed</h2>
        <p>
          Adding a calendar feed is optional. Meetrao works without it; it then blocks only the times already
          booked through Meetrao. If you add one, here is exactly what happens.
        </p>
        <p>
          <strong>What you give us.</strong> The private address of a calendar feed in iCal (.ics) format, such
          as Google Calendar&rsquo;s secret address, an Outlook published calendar link or an iCloud public
          calendar link. Anyone holding that address can read the calendar, so we treat it as a secret.
        </p>
        <p>
          <strong>How it is stored.</strong> Only in our database, with our backend provider, Convex. After you
          save it, it is shown to you masked and never in full again. It is not shown to your guests and not
          shared with anyone.
        </p>
        <p>
          <strong>What we keep.</strong> When it is needed, at most every few minutes, Meetrao fetches the feed
          and keeps only the start and end times of busy periods, for a limited window ahead. Event titles,
          descriptions, attendees and locations are discarded as the feed is read and are never stored. The feed
          is read only; Meetrao never writes to your calendar.
        </p>
        <p>
          <strong>How to remove it.</strong> In Settings. Removing the feed deletes the address and the busy times
          kept from it. To cut off the address everywhere, you can also reset or stop publishing it in your
          calendar&rsquo;s own settings.
        </p>
        <p>
          <strong>Earlier Google Calendar connections.</strong> Meetrao used to connect to Google Calendar
          directly. That connection has been removed: access granted by earlier connections has been revoked with
          Google and the stored tokens deleted. Meetrao no longer requests any Google Calendar permission.
        </p>

        <h3 id="p-invites">Calendar invites by email</h3>
        <p>
          Each booking email, to the host and to the guest, includes a standard calendar invite (an .ics file) so
          your calendar app can add the meeting. The invite contains the meeting details sent to the
          participants: the meeting name, the time, the host&rsquo;s and guest&rsquo;s names and email addresses,
          and the location or video link. A reschedule sends an updated
          invite and a cancellation sends one that removes the meeting.
        </p>

        <h2 id="p-google">4. Sign in with Google</h2>
        <p>
          Signing in with Google is optional; an email address and password work too. If you use it, Meetrao
          asks Google only for the basic profile scopes <strong>openid</strong>, <strong>email</strong> and{" "}
          <strong>profile</strong>: your name, email address and profile picture. They are used to create your
          Meetrao account and sign you in, and for nothing else. Signing in with Google gives Meetrao no access to
          your calendar, your email or anything else in your Google account. In this policy, that sign-in data is
          the only Google user data we hold.
        </p>

        {/* ── the disclosures Google's reviewer checks for by name ──────────
            The same facts are in section 7 and section 11, about "your data"
            in general. A reviewer works a checklist against the phrase
            "Google user data", so they are restated here in those words.
            Duplication is the point; do not "tidy" these away. */}

        <h3 id="p-google-share">Who we share Google user data with</h3>
        <p>
          Only the providers below, and only for the purpose named. Each is bound by contract to use it solely
          to provide that service to us, and none may use it for their own purposes.
        </p>
        <div className="mb-[16px] flex flex-col gap-[1px] overflow-hidden rounded-[10px] border border-line bg-line">
          {GOOGLE_DATA_RECIPIENTS.map(([name, receives]) => (
            <div key={name} className="flex flex-col gap-[4px] bg-surface px-[15px] py-[12px]">
              <span className="text-[13px] font-semibold text-ink">{name}</span>
              <span className="text-[12.5px] leading-[1.55] text-ink-2">{receives}</span>
            </div>
          ))}
        </div>
        <p>
          <strong>Nobody else.</strong> Google user data is not sold, rented or traded. It is not shared with
          advertisers, ad networks, data brokers or analytics providers, Google Analytics receives none of it.
          It is not used to develop, improve or train generalised or general-purpose artificial intelligence or
          machine-learning models, by us or by any provider above. The only disclosures outside this list are
          where the law compels us, or where it is strictly necessary to protect the service or someone&rsquo;s
          safety; if Meetrao is ever sold or merged we will tell you before your data transfers.
        </p>

        <h3 id="p-google-protect">How we protect Google user data</h3>
        <ul>
          <li>
            <strong>Encrypted in transit.</strong> Every connection, browser to Meetrao, Meetrao to Google,
            Meetrao to its database, uses TLS. The site is served over HTTPS only.
          </li>
          <li>
            <strong>Encrypted at rest.</strong> Our database provider encrypts stored data at rest with AES-256.
          </li>
          <li>
            <strong>Reachable only through your own session.</strong> Account data is read through
            internal database functions and authorised against the signed-in account, so one person&rsquo;s
            details are not reachable from another&rsquo;s session.
          </li>
          <li>
            <strong>The least data we can hold.</strong> Name, email address and profile picture, and nothing
            more from Google.
          </li>
          <li>
            <strong>Human access.</strong> Production data can be reached only by authorised {OPERATOR_NAME}
            personnel, using individually authenticated accounts with two-factor authentication, and only to fix a
            fault.
          </li>
          <li>
            <strong>Deleted with your account.</strong> There is no grace-period copy and no backup that outlives
            it beyond the short rotation window in section 9.
          </li>
        </ul>

        <h3 id="p-limited-use">Google Limited Use</h3>
        <p>
          Meetrao&rsquo;s use and transfer of information received from Google APIs to any other app will adhere
          to the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" rel="noreferrer" target="_blank">
            Google API Services User Data Policy
          </a>
         , including the Limited Use requirements.
        </p>
        <p>In plain terms, and specifically:</p>
        <ul>
          <li>we use Google user data only to sign you in and run your account;</li>
          <li>we do not transfer it to anyone except as needed to provide those features, for security, or where the law requires it;</li>
          <li>we do not use it for advertising, and we do not sell it;</li>
          <li>
            we do not use it to develop, improve or train generalised or general-purpose artificial intelligence
            or machine-learning models;
          </li>
          <li>no human at Meetrao reads your Google user data, except with your explicit permission for a support request you have raised, for security, or where the law requires it.</li>
        </ul>

        <h2 id="p-not">5. What we don&rsquo;t do</h2>
        <ul>
          <li>We do not sell your data, or your guests&rsquo; data, to anyone.</li>
          <li>We do not store the contents of your calendar events, only busy times.</li>
          <li>We do not write to your calendar.</li>
          <li>We do not use your data or your guests&rsquo; data to train machine-learning models.</li>
          <li>We do not run advertising or share data with ad networks.</li>
          <li>We do not email your guests marketing. They hear from us only about the booking they made.</li>
        </ul>

        <h2 id="p-why">6. Why we use it</h2>
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
          sending booking emails); legitimate interests (keeping the service secure, and counting page views in a
          way that cannot identify anyone); your consent (adding a calendar feed, Google Analytics, marketing
          email); and legal obligation where one applies. You can withdraw a consent at any time without
          affecting what was done before you did.
        </p>

        <h2 id="p-share">7. Who else touches it</h2>
        <p>
          We use a small number of companies to run Meetrao. Each is contractually limited to what we hire them
          for, and none may use your data for their own purposes.
        </p>
        <div className="mb-[16px] flex flex-col gap-[1px] overflow-hidden rounded-[10px] border border-line bg-line">
          {PROCESSORS.map(([name, role, region]) => (
            <div key={name} className="flex flex-wrap items-baseline gap-x-[16px] gap-y-[3px] bg-surface px-[15px] py-[12px]">
              <span className="w-[110px] flex-none text-[13px] font-semibold text-ink">{name}</span>
              <span className="min-w-[200px] flex-1 text-[13px] text-ink-2">{role}</span>
              <span className="flex-none text-[11.5px] text-ink-3">{region}</span>
            </div>
          ))}
        </div>
        <p>
          Google Analytics is the one item on that list that does not run unless you allow it, and it is the only
          one that receives anything about you before you have an account. It receives no Google user data at
          all, <a href="#p-google-share">who receives that, and what each one gets</a>, is set out in section 4.
        </p>
        <p>
          The people you meet with also see things: your guest sees your name, title, photo, meeting details and
          the times you are free, and your video link if the meeting is a video call; you see your
          guest&rsquo;s name, email and note. That exchange is the point
          of the product.
        </p>
        <p>
          We will disclose data if the law requires it, and to protect the service or someone&rsquo;s safety. If
          Meetrao is ever sold or merged, your data may transfer with it. We will tell you first.
        </p>

        <h2 id="p-where">8. Where it is stored</h2>
        <p>
          Meetrao is operated from the United States. Your account data and bookings are stored by Convex in the
          United States, in the US&nbsp;East (N.&nbsp;Virginia) region. The website is served by
          Vercel&rsquo;s global network, and email and analytics are handled by providers in the
          United States. Your data will therefore be transferred and stored outside your own country.
        </p>
        <p>
          Where we move personal data out of the EU or UK, we rely on the European Commission&rsquo;s Standard
          Contractual Clauses, or the UK Addendum, as incorporated into our agreements with the providers named
          above, and the same clauses cover the data reaching us in the United States. You can
          ask us for a copy of the mechanism that applies to you.
        </p>

        <h2 id="p-keep">9. How long we keep it</h2>
        <p>
          While your account is open, we keep your data so the service works. When your account is deleted (by
          you, or by us for a breach of the terms), we delete it immediately. Profile, booking link, meetings,
          availability, booking history, your calendar feed address and its busy times all go. We do not keep a grace-period copy, so export
          anything you want to keep first.
        </p>
        <p>
          Busy times from your calendar feed are kept only for a limited window ahead and replaced on each
          refresh. Removing the feed deletes the address and those busy times at once, which does not require
          deleting your account. Page-view records are deleted automatically after 400 days.
        </p>
        <p>
          Two caveats, both narrow. Encrypted backups may hold deleted data for a short window before they rotate
          out. And where the law requires us to retain a record, we keep only that record and only for as long as
          required.
        </p>

        <h2 id="p-rights">10. Your rights</h2>
        <p>
          Wherever you are, you can ask us to show you what we hold, correct it, delete it, or send you a copy.
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will reply within 30 days. We will
          not charge you or treat you differently for asking.
        </p>
        <p>
          Some of it you can do yourself: edit your profile in Settings, change your notification preferences,
          remove your calendar feed, or delete your account outright.
        </p>
        <p>
          <strong>If you are in the EU or UK</strong>, you also have the right to object to processing, to
          restrict it, to data portability, and to withdraw consent at any time. You can complain to your
          national data protection authority, for the UK, the ICO.
        </p>
        <p>
          <strong>If you are in California</strong>, you have the right to know what we collect, to delete it, to
          correct it, and to opt out of sale or sharing, although we do not sell or share personal information
          as those terms are defined, so there is nothing to opt out of.
        </p>
        <p>
          <strong>If you are a guest</strong>, not a host: the person you booked with controls your booking data,
          and we handle it on their instructions. Ask them, or ask us and we will pass it on.
        </p>

        <h2 id="p-security">11. Security</h2>
        <p>
          Traffic is encrypted in transit with TLS, and our database provider encrypts its storage at rest.
          Passwords are hashed and never stored readably. Your calendar feed address is readable only by
          internal database functions that no client can call, and is never returned to any browser in full,
          including yours. Every request is authorised against the signed-in account before it
          reads a single row, so one person&rsquo;s bookings are not reachable from another&rsquo;s session.
          Email addresses have to be confirmed before an account works, which keeps someone from signing up as
          you.
        </p>
        <p>
          Access to production data is limited to authorised {OPERATOR_NAME} personnel, and is used to fix faults,
          not to read your bookings.
        </p>
        <p>
          The mechanisms protecting Google user data in particular are listed in full under{" "}
          <a href="#p-google-protect">how we protect Google user data</a>.
        </p>
        <p>
          No system is perfectly secure. If a breach affects your data, we will tell you and the relevant
          regulator as quickly as the law requires.
        </p>

        <h2 id="p-cookies">12. Cookies and analytics</h2>
        <p>
          <strong>Necessary cookies.</strong> Signing in sets a cookie that keeps you signed in. It is required
          for the product to work at all and cannot be turned off without breaking it. If you never sign in, we
          set no cookie.
        </p>
        <p>
          <strong>Our own page counting.</strong> Described in <a href="#p-collect">section 2</a>. It sets no
          cookie, stores nothing on your device, and cannot follow you from one day to the next. Because it does
          not touch your device and cannot identify you, we do not ask permission for it.
        </p>
        <p>
          <strong>Google Analytics.</strong> We may run Google Analytics to understand which pages get read.
          Google Analytics does set cookies, so it loads <em>only</em> if you press Accept on the banner, before
          that, no script from Google is on the page and no request reaches Google at all. Pressing &ldquo;No
          thanks&rdquo; keeps it off, and costs you nothing: the site behaves identically. If Google Analytics is
          not switched on for this site, no banner appears, because there is nothing to consent to.
        </p>
        <p>You can change your mind whenever you like:</p>
        <div className="my-[16px]">
          <ChangeAnalyticsChoice measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ""} />
        </div>
        <p>
          Clearing your browser&rsquo;s storage for this site also clears the answer, and the banner will ask
          again.
        </p>

        <h2 id="p-children">13. Children</h2>
        <p>
          Meetrao is not for children. We do not knowingly collect data from anyone under 16. If you believe a
          child has given us their information, email us and we will delete it.
        </p>

        <h2 id="p-changes">14. Changes to this policy</h2>
        <p>
          If we change how we use your data in a way that matters, we will email you before it takes effect and
          update the date at the top. Minor wording fixes we will just make. The date at the top of this page is
          the date of the current version.
        </p>

        <h2 id="p-contact">15. Contact us</h2>
        <p>
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> for anything in this policy, including a
          request to see, correct, export or delete your data. You can also{" "}
          <Link href="/support">use the contact form</Link>. By post: {OPERATOR_NAME}, {POSTAL_ADDRESS}.
        </p>

        <DocFooterNote title="Privacy questions or requests">
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, or write to {OPERATOR_NAME}, {POSTAL_ADDRESS}. A person
          reads it.
        </DocFooterNote>
      </DocLayout>
    </>
  );
}
