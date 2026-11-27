import type { Metadata } from "next";
import { BUSINESS_LIMITS } from "@/lib/pricing";
import Link from "next/link";
import {
  DocContextStrip,
  DocFooterNote,
  DocHeader,
  DocLayout,
  type TocEntry,
} from "@/components/marketing/legal-doc";
import { OPERATOR_NAME, OPERATOR_SITE, OPERATOR_URL, POSTAL_ADDRESS, SUPPORT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The agreement between you and Meetrao, written plainly: what the service does, what it " +
    "costs today, and what happens if that ever changes.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "27 November 2026";

const TOC: TocEntry[] = [
  { id: "t-who", label: "1. Who we are" },
  { id: "t-account", label: "2. Your account" },
  { id: "t-google", label: "3. Your calendar feed and video link" },
  { id: "t-use", label: "4. Acceptable use" },
  { id: "t-price", label: "5. What it costs" },
  { id: "t-ip", label: "6. Who owns what" },
  { id: "t-close", label: "7. Ending your account" },
  { id: "t-liability", label: "8. What we do not promise" },
  { id: "t-cap", label: "9. Limit of liability" },
  { id: "t-changes", label: "10. Changes to these terms" },
  { id: "t-law", label: "11. Governing law" },
];

export default function TermsPage() {
  return (
    <>
      <DocContextStrip title="Terms of Service" otherLabel="Privacy Policy" otherHref="/privacy" />

      <DocLayout toc={TOC} ariaLabel="Terms of Service contents">
        <DocHeader
          eyebrow="Terms of Service"
          title="The agreement between you and Meetrao"
          intro="Meetrao is a scheduling tool. You share one link, guests pick a time you are free, and each booking reaches both of you as a calendar invite. These terms say what you can expect from us and what we expect from you. They are written plainly on purpose."
          meta={[`Last updated ${UPDATED}`, `Operated by ${OPERATOR_NAME}, Alexandria, Virginia, USA`]}
        />

        <p>
          <strong>What changed on {UPDATED}:</strong> Meetrao is now operated by {OPERATOR_NAME}, a company in
          Virginia, USA. These terms now name it as the operator, and Virginia law now governs them (section 11).
        </p>
        <p>
          <strong>Also on {UPDATED}:</strong> Google Calendar connection removed; calendar feeds, your own video
          link and emailed invites described (section 3).
        </p>

        <p>
          These terms are a contract between you and {OPERATOR_NAME}, which operates Meetrao. By creating an account, or by booking a meeting
          through somebody&rsquo;s Meetrao link, you accept them. If you do not, do not use the service.
        </p>

        <h2 id="t-who">1. Who we are</h2>
        <p>
          Meetrao is a product and service operated by {OPERATOR_NAME}, a limited liability company, at{" "}
          {POSTAL_ADDRESS}. More about the company is at <a href={OPERATOR_URL}>{OPERATOR_SITE}</a>.
        </p>
        <p>
          When these terms say &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;Meetrao&rdquo;, they mean{" "}
          {OPERATOR_NAME}. When they say &ldquo;you&rdquo;, they mean the person or organisation using the service.
        </p>
        <p>
          You can reach us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, or by post at{" "}
          {POSTAL_ADDRESS}. Email is read by a person, usually within a few working days.
        </p>

        <h2 id="t-account">2. Your account</h2>
        <p>You need an account to host meetings. Your guests do not: they book without signing up.</p>
        <p>
          If you sign up with an email address, you must confirm that address before you can use Meetrao. The
          confirmation link expires after 24 hours; you can ask for a new one. If you sign up with Google, your
          address is already confirmed and we skip that step.
        </p>
        <p>
          You are responsible for keeping your password to yourself and for everything that happens under your
          account. Tell us promptly if you think someone else has access. One account is for one person. Do not
          share logins.
        </p>
        <p>
          You choose a username, and it becomes part of every public booking link you share, for example{" "}
          <code>meetrao.com/adam/intro-call</code>. We may reclaim a username that impersonates someone, infringes a
          trademark, or is being held without use.
        </p>
        <p>
          You must be at least 16 to use Meetrao. If you are using it for an employer, you confirm you are
          allowed to accept these terms on their behalf.
        </p>

        <h2 id="t-google">3. Your calendar feed and video link</h2>
        <p>
          Adding a calendar feed is optional. Without it Meetrao still works, but it can only avoid times already
          booked through Meetrao, so it will offer every other time your availability allows.
        </p>
        <p>
          If you add one, you give us the private address of a calendar feed that you are entitled to share, and
          permission to fetch it to find the times you are busy. We keep only those busy times, not what your
          events are about, and we never write to your calendar. The{" "}
          <Link href="/privacy#p-calendar-feed">Privacy Policy</Link> sets out exactly what we keep and for how
          long. Feeds are published by your calendar provider and can be slow to update, so a new event may not
          block a time straight away. You can remove the feed at any time from Settings.
        </p>
        <p>
          Video meetings use the meeting link you save. You are responsible for that link and for the service
          behind it, which is governed by its provider&rsquo;s own terms. Meetrao sends each booking to you and
          your guest as a standard calendar invite by email; whether and how it appears in a calendar depends
          on the calendar app each of you uses.
        </p>

        <h2 id="t-use">4. Acceptable use</h2>
        <p>Use Meetrao to schedule meetings people actually want. Do not use it to:</p>
        <ul>
          <li>send unsolicited bulk messages, or collect email addresses for that purpose;</li>
          <li>impersonate another person or organisation;</li>
          <li>harass, threaten or deceive the people who book with you;</li>
          <li>break the law where you or your guests are;</li>
          <li>probe, scrape, overload or reverse-engineer the service, or work around its limits;</li>
          <li>resell Meetrao as your own product without a written agreement with us.</li>
        </ul>
        <p>
          If your booking page collects information from guests, you are the one answerable to them for how it is
          used. That includes anything a guest types into the optional note field.
        </p>

        <h2 id="t-price">5. What it costs</h2>
        <p>
          There are three plans. <strong>Free</strong> covers taking bookings, your link, your meeting types,
          your calendar, reminders, rescheduling and cancellation, with no card and no limit on how many
          bookings you take. <strong>Pro</strong> is $30 a year, or $3 a month, and adds a custom domain,
          removal of Meetrao branding, team links, shared sessions, the API and control over reminder timing.
          Pro includes one company, with you as its only member. <strong>Business</strong> is $99 a year, or $9
          a month, and adds everything in Pro plus up to {BUSINESS_LIMITS.companies} companies of up to{" "}
          {BUSINESS_LIMITS.membersPerCompany} people each, with their own links on the company&rsquo;s domain.
          The price is for the account that owns the companies, not for each person in them.
        </p>
        <p>
          <strong>A free account is never billed automatically.</strong> A paid plan begins only when you choose
          it and complete a payment, and it ends when you cancel. If you cancel, the plan runs to the end of the
          period you have already paid for and then the account returns to Free, your bookings, your link and
          your data stay where they are. The people in a company you own keep their own Meetrao accounts.
        </p>
        <p>
          Payments are handled by Polar, which is the merchant of record: Polar takes the payment, issues the
          receipt and is responsible for sales tax. We do not see or store your card number. You can change your
          payment method or cancel at any time through the billing portal linked from your settings.
        </p>
        <p>
          Features may still change while Meetrao is young, and some that were free have moved to a paid plan as the
          product has grown. We will not do that in a way designed to break bookings you have already taken:
          existing bookings, and the links guests already hold, keep working either way.
        </p>

        <h2 id="t-ip">6. Who owns what</h2>
        <p>
          You own your content: your profile, your meeting descriptions, your availability, and the booking
          records that belong to you. You give us only the permission we need to run the service, to store that
          content, show it on your booking page, and send it in the emails Meetrao sends on your behalf.
        </p>
        <p>
          We own Meetrao: the software, the name, the logo and the design. These terms do not give you any right
          to use our brand beyond what the product itself does.
        </p>
        <p>
          If you send us feedback, we may act on it without owing you anything. We appreciate it and we are not
          going to run a royalty scheme for suggestions.
        </p>

        <h2 id="t-close">7. Ending your account</h2>
        <p>
          You can delete your account yourself from Settings, at any time. When you do, your booking page stops
          working, every upcoming meeting is cancelled, and your guests are notified.
        </p>
        <p>
          We can suspend or remove an account that breaks these terms. Suspension blocks sign-in and stops new
          bookings, but leaves existing bookings on the calendar; it can be reversed. Removal is permanent:
          profile, booking link, meetings, availability and booking history are deleted, upcoming meetings
          cancelled, guests notified, and you would have to sign up again from scratch. Where it is reasonable
          and lawful to do so, we will warn you first.
        </p>
        <p>
          Deletion is immediate and irreversible. We do not keep a copy for you, so export anything you need
          before you delete it.
        </p>
        <p>
          We may also stop offering Meetrao altogether. If that happens we will give you at least 30 days&rsquo;
          notice by email so you can export your data and move your booking link somewhere else.
        </p>

        <h2 id="t-liability">8. What we do not promise</h2>
        <p>
          Meetrao is provided as it is, without warranties of any kind, express or implied, to the fullest extent
          the law allows. We work to keep it accurate and available, but we cannot promise it will never be down,
          never show a wrong time, or never miss a conflict, particularly when the cause is a calendar feed that is late or unreachable,
          your calendar settings, or an email that does not arrive.
        </p>
        <p>
          A scheduling tool sits in the middle of arrangements that matter to you. Check anything important.
        </p>

        <h2 id="t-cap">9. Limit of liability</h2>
        <p>
          To the fullest extent the law allows, we are not liable for meetings missed, double-booked or held at
          the wrong time, nor for lost profits, lost business, lost opportunities or lost data arising from your
          use of the service.
        </p>
        <p>
          Where we are liable despite the above, our total liability to you for all claims taken together is
          limited to whichever is greater of: the fees you paid us in the twelve months before the event giving
          rise to the claim, or US$50. While Meetrao is free, that figure is US$50, stated as a real number
          rather than left blank, because a cap that resolves to nothing is not a cap.
        </p>
        <p>
          Nothing in these terms limits liability that cannot be limited by law, including for fraud, or for
          death or personal injury caused by negligence, and nothing here takes away rights your local consumer
          law gives you that cannot be waived by agreement.
        </p>

        <h2 id="t-changes">10. Changes to these terms</h2>
        <p>
          We may update these terms. If a change materially affects you, we will email you at least 14 days
          before it takes effect, using the address on your account. Continuing to use Meetrao after that means
          you accept the new terms. If you do not, delete your account. The date at the top of this page is the
          date of the current version.
        </p>

        <h2 id="t-law">11. Governing law</h2>
        <p>
          These terms are governed by the laws of the Commonwealth of Virginia, USA, without regard to its
          conflict-of-law rules. The state and federal courts located in Fairfax County, Virginia have
          jurisdiction over any dispute. If you are a consumer somewhere else, this does not take away rights
          your local law gives you that cannot be waived by agreement, or your right to bring a claim in your own
          country where your law allows it.
        </p>
        <p>Before going to court, please email us. Most things are quicker to sort out directly.</p>

        <DocFooterNote title="Questions about these terms">
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. A person reads it. You can also{" "}
          <Link href="/support">use the contact form</Link>.
        </DocFooterNote>
      </DocLayout>
    </>
  );
}
