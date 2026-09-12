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
import { POSTAL_ADDRESS, SUPPORT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Meetrao collects from your calendar, and what it deliberately leaves alone.",
};

const UPDATED = "12 September 2026";

const TOC: TocEntry[] = [
  { id: "p-who", label: "1. Who we are" },
  { id: "p-collect", label: "2. What we collect" },
  { id: "p-google", label: "3. Google user data" },
  { id: "p-limited-use", label: "4. Google Limited Use" },
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
  "We read whether you are busy — never what your meetings are about.",
  "We do not sell your data, or your guests' data, to anyone.",
  "We never use your data or your guests' data to train machine-learning models.",
  "Delete your account and it goes immediately. There is no grace-period copy.",
];

/* Every scope in CALENDAR_SCOPES (lib/google/oauth.ts), plus the three Supabase
   requests for Sign in with Google. Named in full because Google's verification
   review compares this table against the consent screen — a policy that says
   "calendar access" where the grant says calendar.events is the single most
   common reason a review comes back. */
const SCOPES: [string, string, string][] = [
  [
    "calendar.freebusy",
    "See when you are busy or free",
    "Every time somebody opens your booking page, so a slot you already have something in is never offered.",
  ],
  [
    "calendar.events",
    "See, edit and delete events on your calendar",
    "Creating the event for each confirmed booking with its Google Meet link, inviting your guest so it reaches their calendar too, and updating or deleting that event when the booking changes or is cancelled.",
  ],
  [
    "userinfo.email",
    "Your Google account's email address",
    "Showing you which Google account is connected, on the Settings page, so you can tell a work account from a personal one.",
  ],
  [
    "openid · email · profile",
    "Your name, email address and profile picture",
    "Only if you choose Sign in with Google instead of a password. Used to create your Meetrao account and sign you in.",
  ],
];

const PURPOSES: [string, string][] = [
  ["Account details", "Signing you in, and keeping your booking link yours."],
  ["Calendar busy times", "Never offering a time you already have something in."],
  ["Permission to create events", "Writing each confirmed booking to your calendar with its Meet link."],
  ["Guest name, email and note", "Confirming the booking, inviting them to the event, and telling you who is coming."],
  ["Notification preferences", "Sending only the messages you asked for."],
  ["Page views", "Knowing which pages are read and whether the site works on real phones."],
];

const PROCESSORS: [string, string, string][] = [
  ["Vercel", "Hosting and content delivery", "United States"],
  ["Supabase", "Database, authentication and file storage", "Asia Pacific (Tokyo)"],
  ["Google", "Calendar, Meet, Sign in with Google, and Google Analytics", "United States"],
  ["Resend", "Transactional email delivery", "United States"],
];

export default function PrivacyPage() {
  return (
    <>
      <DocContextStrip title="Privacy Policy" otherLabel="Terms of Service" otherHref="/terms" />

      <DocLayout toc={TOC} ariaLabel="Privacy Policy contents">
        <DocHeader
          eyebrow="Privacy Policy"
          title="What we collect, and what we don't"
          intro="Meetrao needs your calendar to do its job. That is a lot of trust, so this page is specific about what we take, what we leave alone, and who else touches it. No vague language about “improving your experience”."
          meta={[`Last updated ${UPDATED}`, "Data controller: Meetrao, Cumilla, Bangladesh"]}
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

        <h2 id="p-who">1. Who we are</h2>
        <p>
          Meetrao is a scheduling service operated by a sole proprietor trading as Meetrao, at {POSTAL_ADDRESS}.
          In this policy, &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;Meetrao&rdquo; mean that operator, and
          &ldquo;you&rdquo; means the person using the service.
        </p>
        <p>
          We are the data controller for the personal data described here, except for the data your guests give
          you when they book — see <a href="#p-rights">section 10</a>. The one address to reach us at is{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>

        <h2 id="p-collect">2. What we collect</h2>
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
            <strong>Notification preferences</strong> — the switches in Settings that decide which emails we
            send you.
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
          Because Meetrao invites the guest to the host&rsquo;s calendar event, the guest&rsquo;s name and email
          are passed to Google Calendar as an attendee, and host and guest can each see the other&rsquo;s address
          on the event. That exchange is how the meeting reaches both calendars.
        </p>

        <h3>Automatically, when you visit the website</h3>
        <p>
          We count page views on the public pages — the home page, this one, the Terms, Help, Support, the
          sign-in pages and public booking pages. It works without cookies and without storing anything on your
          device. For each page view we record:
        </p>
        <ul>
          <li>the path of the page, with the query string removed before it is stored;</li>
          <li>the host of the site you arrived from, if any — &ldquo;google.com&rdquo;, never the full address;</li>
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
          week. The signed-in product — your dashboard, bookings, meetings, contacts and settings — is not
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

        <h2 id="p-google">3. Google user data</h2>
        <p>
          Connecting Google Calendar is optional — Meetrao works without it, it just cannot then see your
          conflicts. If you do connect it, here is exactly what we ask Google for and what each permission is
          used for.
        </p>

        <div className="mb-[16px] flex flex-col gap-[1px] overflow-hidden rounded-[10px] border border-line bg-line">
          {SCOPES.map(([scope, what, why]) => (
            <div key={scope} className="flex flex-col gap-[4px] bg-surface px-[15px] py-[12px]">
              <span className="text-[13px] font-semibold text-ink">{scope}</span>
              <span className="text-[12.5px] font-medium text-ink-2">{what}</span>
              <span className="text-[12.5px] leading-[1.55] text-ink-3">{why}</span>
            </div>
          ))}
        </div>

        <p>
          <strong>What we actually read.</strong> To find your conflicts, Meetrao asks Google one question:
          which intervals in the next few weeks are busy. It never requests the contents of your events, and no
          part of the service reads an event title, guest list, description, location or attachment.
        </p>
        <p>
          <strong>What the permission would allow.</strong> We want to be straight about this, because
          Google&rsquo;s consent screen is. Creating an event with your guest as an attendee requires the
          calendar.events permission, and that permission is read as well as write — there is no narrower
          permission that can add an attendee. So the access you grant is broader than the use we make of it.
          Google&rsquo;s screen will tell you it lets us &ldquo;see, edit and delete&rdquo; your events; the
          limit on what we do with it is the commitment below, and our code.
        </p>
        <p>
          <strong>What we store.</strong> A refresh token and a short-lived access token, so we do not have to
          ask you again; the email address of the connected Google account; and the identifier of the calendar to
          use. Busy times are read when they are needed and are not stored. The events Meetrao creates live on
          your calendar, not in our database — we keep only the booking record.
        </p>
        <p>
          <strong>How to take it back.</strong> Disconnect at any time in Settings → Calendar. Two things happen,
          in this order: we ask Google to revoke the grant, which ends it on Google&rsquo;s side and removes
          Meetrao from your account&rsquo;s permissions, and then we delete both tokens from our database.
          Deleting your account does the same thing before it deletes everything else. Throwing our own key away
          is not the same as ending the grant, so we do both.
        </p>
        <p>
          If Google cannot be reached at that moment, the disconnect still happens on our side and you can finish
          it yourself at{" "}
          <a href="https://myaccount.google.com/permissions" rel="noreferrer" target="_blank">
            myaccount.google.com/permissions
          </a>
          , which is also where you can confirm at any time that Meetrao is gone. Events Meetrao already put on
          your calendar stay there for you to keep or delete; disconnecting does not cancel your existing
          bookings, but it does stop us checking for conflicts, so guests may be offered times you are not
          actually free.
        </p>

        <h2 id="p-limited-use">4. Google Limited Use</h2>
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
          <li>
            we use Google user data only to provide and improve the scheduling features you can see in the
            product;
          </li>
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
          <li>We do not read the contents of your calendar events.</li>
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
          way that cannot identify anyone); your consent (connecting Google Calendar, Google Analytics, marketing
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
          one that receives anything about you before you have an account.
        </p>
        <p>
          The people you meet with also see things: your guest sees your name, title, photo, meeting details and
          the times you are free, and you see your guest&rsquo;s name, email and note. That exchange is the point
          of the product.
        </p>
        <p>
          We will disclose data if the law requires it, and to protect the service or someone&rsquo;s safety. If
          Meetrao is ever sold or merged, your data may transfer with it — we will tell you first.
        </p>

        <h2 id="p-where">8. Where it is stored</h2>
        <p>
          Meetrao is operated from Bangladesh. Your account data and bookings are stored in Supabase&rsquo;s
          Asia&nbsp;Pacific (Tokyo) region. The website is served by Vercel&rsquo;s global network, and email,
          calendar and analytics are handled by providers in the United States. Your data will therefore be
          transferred and stored outside your own country.
        </p>
        <p>
          Where we move personal data out of the EU or UK, we rely on the European Commission&rsquo;s Standard
          Contractual Clauses, or the UK Addendum, as incorporated into our agreements with the providers named
          above. Bangladesh has no EU adequacy decision, so the same clauses cover the data reaching us. You can
          ask us for a copy of the mechanism that applies to you.
        </p>

        <h2 id="p-keep">9. How long we keep it</h2>
        <p>
          While your account is open, we keep your data so the service works. When your account is deleted — by
          you, or by us for a breach of the terms — we delete it immediately. Profile, booking link, meetings,
          availability, booking history and calendar tokens all go. We do not keep a grace-period copy, so export
          anything you want to keep first.
        </p>
        <p>
          Google tokens are revoked with Google and then deleted the moment you disconnect the calendar, which
          does not require deleting your account. Page-view records are deleted automatically after 400 days.
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
          <strong>If you are a guest</strong>, not a host: the person you booked with controls your booking data,
          and we handle it on their instructions. Ask them, or ask us and we will pass it on.
        </p>

        <h2 id="p-security">11. Security</h2>
        <p>
          Traffic is encrypted in transit with TLS, and our database provider encrypts its storage at rest.
          Passwords are hashed and never stored readably. Google tokens live in a table that no browser session
          can read: it has row-level security enabled and no policy granting access, so it is reachable only by
          the server, with a key that is never sent to a browser. Email addresses have to be confirmed before an
          account works, which keeps someone from signing up as you.
        </p>
        <p>
          Access to production data is limited to the one person who operates Meetrao, and is used to fix faults,
          not to read your bookings.
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
          Google Analytics does set cookies, so it loads <em>only</em> if you press Accept on the banner — before
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
          <Link href="/support">use the contact form</Link>. By post: {POSTAL_ADDRESS}.
        </p>

        <DocFooterNote title="Privacy questions or requests">
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, or write to {POSTAL_ADDRESS}. A person
          reads it.
        </DocFooterNote>
      </DocLayout>
    </>
  );
}
