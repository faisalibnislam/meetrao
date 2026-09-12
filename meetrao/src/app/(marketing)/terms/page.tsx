import type { Metadata } from "next";
import Link from "next/link";
import {
  DocContextStrip,
  DocFooterNote,
  DocHeader,
  DocLayout,
  type TocEntry,
} from "@/components/marketing/legal-doc";
import { POSTAL_ADDRESS, SUPPORT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The agreement between you and Meetrao, written plainly.",
};

const UPDATED = "12 September 2026";

const TOC: TocEntry[] = [
  { id: "t-who", label: "1. Who we are" },
  { id: "t-account", label: "2. Your account" },
  { id: "t-google", label: "3. Connecting Google Calendar" },
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
          intro="Meetrao is a scheduling tool. You share one link, guests pick a time you are genuinely free, and each booking gets a Google Meet link. These terms say what you can expect from us and what we expect from you. They are written plainly on purpose."
          meta={[`Last updated ${UPDATED}`, "Operated by Meetrao, Cumilla, Bangladesh"]}
        />

        <p>
          These terms are a contract between you and Meetrao. By creating an account, or by booking a meeting
          through somebody&rsquo;s Meetrao link, you accept them. If you do not, do not use the service.
        </p>

        <h2 id="t-who">1. Who we are</h2>
        <p>
          Meetrao is built and run by one person, trading as a sole proprietor under the name Meetrao, from{" "}
          {POSTAL_ADDRESS}. There is no company behind it and no team — which is why this page says what it says
          about support times and about liability, rather than implying an organisation that does not exist.
        </p>
        <p>
          When these terms say &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;Meetrao&rdquo;, they mean that
          operator. When they say &ldquo;you&rdquo;, they mean the person or organisation using the service.
        </p>
        <p>
          You can reach us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, or by post at{" "}
          {POSTAL_ADDRESS}. Email is read by a person, usually within a few working days.
        </p>

        <h2 id="t-account">2. Your account</h2>
        <p>You need an account to host meetings. Your guests do not — they book without signing up.</p>
        <p>
          If you sign up with an email address, you must confirm that address before you can use Meetrao. The
          confirmation link expires after 24 hours; you can ask for a new one. If you sign up with Google, your
          address is already confirmed and we skip that step.
        </p>
        <p>
          You are responsible for keeping your password to yourself and for everything that happens under your
          account. Tell us promptly if you think someone else has access. One account is for one person — do not
          share logins.
        </p>
        <p>
          You choose a username, and it becomes your public booking link — for example{" "}
          <code>meetrao.com/adam</code>. We may reclaim a username that impersonates someone, infringes a
          trademark, or is being held without use.
        </p>
        <p>
          You must be at least 16 to use Meetrao. If you are using it for an employer, you confirm you are
          allowed to accept these terms on their behalf.
        </p>

        <h2 id="t-google">3. Connecting Google Calendar</h2>
        <p>
          Connecting Google Calendar is optional. Without it Meetrao still works — it simply cannot see your
          conflicts, so it will offer every time your availability allows.
        </p>
        <p>
          When you connect it, you give us permission to see when you are busy and to create events on your
          behalf. We use that permission for two things only: avoiding times you already have something in, and
          creating the event for each confirmed booking — with its own Google Meet link, and your guest invited
          so it appears on their calendar too.
        </p>
        <p>
          We do not read the contents of your existing events. Titles, guests, notes and attachments are none of
          our business; we ask Google only which periods are busy. The permission Google asks you for is broader
          than that, because adding your guest as an attendee requires a permission that also allows reading —
          the <Link href="/privacy#p-google">Privacy Policy</Link> sets out exactly what we request and what we
          do with it.
        </p>
        <p>
          You can disconnect at any time from Settings, and revoke access in your Google account. Doing so stops
          us checking for conflicts, which means guests may be offered times you are not actually free. Google
          Calendar and Google Meet are Google&rsquo;s services, governed by Google&rsquo;s own terms — we cannot
          control their availability or behaviour.
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
        <p>Meetrao is free while it is in beta. We intend to introduce paid plans later.</p>
        <p>
          When we do, we will tell you by email before anything becomes chargeable, and you will have to opt in —
          we will not start billing a free account automatically. If you choose not to pay, you will be able to
          export your data and close your account. Payments, when they exist, will be handled by a payment
          processor; we will not see or store your full card number.
        </p>
        <p>
          Because it is a beta, features may change or disappear, and we may set limits on usage. We will not do
          that in a way designed to break your existing bookings.
        </p>

        <h2 id="t-ip">6. Who owns what</h2>
        <p>
          You own your content: your profile, your meeting descriptions, your availability, and the booking
          records that belong to you. You give us only the permission we need to run the service — to store that
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
          bookings, but leaves existing bookings on the calendar; it can be reversed. Removal is permanent —
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
          never show a wrong time, or never miss a conflict — particularly when the cause is Google&rsquo;s side,
          your calendar settings, or a disconnected integration.
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
          rise to the claim, or US$50. While Meetrao is free, that figure is US$50 — stated as a real number
          rather than left blank, because a cap that resolves to nothing is not a cap.
        </p>
        <p>
          Nothing in these terms limits liability that cannot be limited by law — including for fraud, or for
          death or personal injury caused by negligence — and nothing here takes away rights your local consumer
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
          These terms are governed by the laws of Bangladesh, and the courts of Cumilla, Bangladesh have
          jurisdiction over any dispute. If you are a consumer somewhere else, this does not take away rights
          your local law gives you that cannot be waived by agreement, or your right to bring a claim in your own
          country where your law allows it.
        </p>
        <p>Before going to court, please email us — most things are quicker to sort out directly.</p>

        <DocFooterNote title="Questions about these terms">
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. A person reads it. You can also{" "}
          <Link href="/support">use the contact form</Link>.
        </DocFooterNote>
      </DocLayout>
    </>
  );
}
