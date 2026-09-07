import type { Metadata } from "next";
import { DocPage, type DocSection } from "@/components/marketing/doc-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The agreement between you and Meetrao: your account, connecting Google Calendar, acceptable use, what it costs, and how to end it.",
};

const SECTIONS: DocSection[] = [
  {
    id: "who-we-are",
    title: "1. Who we are",
    body: [
      { kind: "p", text: "Meetrao is operated by Airly Studio. When these terms say “we”, “us” or “Meetrao”, they mean Airly Studio. When they say “you”, they mean the person or organisation using the service." },
      { kind: "p", text: "You can reach us at hello@airlystudio.com, or by post at 44/A Judge Court Road, Cumilla, Bangladesh, or Alexandria, VA, USA." },
      { kind: "decision", text: "if Airly Studio is an incorporated company, add its full registered name and company number here. If it is a sole proprietorship, say so — it changes who is liable." },
    ],
  },
  {
    id: "your-account",
    title: "2. Your account",
    body: [
      { kind: "p", text: "You need an account to host meetings. Your guests do not — they book without signing up." },
      { kind: "p", text: "If you sign up with an email address, you must confirm that address before you can use Meetrao. The confirmation link expires after 24 hours; you can request another." },
      { kind: "p", text: "You are responsible for keeping your password to yourself and for everything that happens under your account. Tell us promptly if you think someone else has access." },
      { kind: "p", text: "You choose a username, and it becomes your public booking link — for example meetrao.com/adam. We may reclaim a username that impersonates someone, infringes a trademark, or is being held without use." },
      { kind: "decision", text: "a minimum age. This draft says 16, which keeps you clear of GDPR’s child-consent rules and most US school-data questions. Change it to 13 or 18 if you have a reason to." },
      { kind: "p", text: "You must be at least 16 to use Meetrao. If you are using it for an employer, you confirm you are allowed to accept these terms on their behalf." },
    ],
  },
  {
    id: "google-calendar",
    title: "3. Connecting Google Calendar",
    body: [
      { kind: "p", text: "Meetrao works by reading your Google Calendar. When you connect it, you give us permission to see when you are busy and to create events on your behalf." },
      { kind: "p", text: "We do not read the contents of your existing events — titles, guests, notes and attachments are none of our business. We look at busy and free." },
      { kind: "p", text: "You can disconnect at any time from Settings, or revoke access in your Google account. Doing so stops us checking for conflicts, which means guests may be offered times you are not actually free." },
    ],
  },
  {
    id: "acceptable-use",
    title: "4. Acceptable use",
    body: [
      { kind: "p", text: "Use Meetrao to schedule meetings people actually want. Do not use it to:" },
      {
        kind: "list",
        items: [
          "send unsolicited bulk messages, or collect email addresses for that purpose;",
          "impersonate another person or organisation;",
          "harass, threaten or deceive the people who book with you;",
          "break the law where you or your guests are;",
          "probe, scrape, overload or reverse-engineer the service, or work around its limits;",
          "resell Meetrao as your own product without a written agreement with us.",
        ],
      },
      { kind: "p", text: "If your booking page collects information from guests, you are the one answerable to them for how it is used. That includes anything a guest types into the note field." },
    ],
  },
  {
    id: "cost",
    title: "5. What it costs",
    body: [
      { kind: "p", text: "Meetrao is free while it is in beta. We intend to introduce paid plans later." },
      { kind: "p", text: "When we do, we will tell you by email before anything becomes chargeable, and you will have to opt in — we will not start billing a free account automatically." },
      { kind: "p", text: "Because it is a beta, features may change or disappear, and we may set limits on usage. We will not do that in a way designed to break your existing bookings." },
    ],
  },
  {
    id: "ownership",
    title: "6. Who owns what",
    body: [
      { kind: "p", text: "You own your content: your profile, your meeting descriptions, your availability, and the booking records that belong to you. You give us only the permission we need to run the service for you." },
      { kind: "p", text: "We own Meetrao: the software, the name, the logo and the design. These terms do not give you any right to use our brand beyond what the product itself does." },
      { kind: "p", text: "If you send us feedback, we may act on it without owing you anything. We appreciate it and we are not going to run a royalty scheme for suggestions." },
    ],
  },
  {
    id: "ending",
    title: "7. Ending your account",
    body: [
      { kind: "p", text: "You can delete your account yourself from Settings, at any time. When you do, your booking page stops working, every upcoming meeting is cancelled, and your data is removed." },
      { kind: "p", text: "Deletion is immediate and irreversible. We do not keep a copy for you, so export anything you need before you delete it." },
    ],
  },
  {
    id: "no-promises",
    title: "8. What we do not promise",
    body: [
      { kind: "p", text: "Meetrao is provided as it is. We work to keep it accurate and available, but we cannot promise it will never be down, never show a wrong time, or never lose a booking." },
      { kind: "p", text: "A scheduling tool sits in the middle of arrangements that matter to you. Check anything important. To the fullest extent the law allows, we are not liable for meetings that did not happen, opportunities missed, or losses that follow from them." },
      { kind: "decision", text: "a liability cap. While Meetrao is free there is no amount paid to cap against, so a lawyer should set a fixed figure or a paid-in-the-last-12-months formula before launch." },
    ],
  },
  {
    id: "changes",
    title: "9. Changes to these terms",
    body: [
      { kind: "p", text: "We may update these terms. If a change materially affects you, we will email you at least 14 days before it takes effect, using the address on your account." },
    ],
  },
  {
    id: "law",
    title: "10. Governing law",
    body: [
      { kind: "p", text: "These terms are governed by the laws of Bangladesh, and the courts of Bangladesh have jurisdiction over any dispute. If you are a consumer somewhere else, you keep the rights your local law gives you." },
      { kind: "p", text: "Before going to court, please email us — most things are quicker to sort out directly." },
    ],
  },
];

export default function TermsPage() {
  return (
    <DocPage
      eyebrow="Terms of Service"
      title="The agreement between you and Meetrao"
      lede="Meetrao is a scheduling tool. You share one link, guests pick a time you are genuinely free, and each booking gets a Google Meet link. These terms say what you can expect from us, and what we expect from you."
      meta={["Last updated 7 September 2026", "Operated by Airly Studio"]}
      sections={SECTIONS}
    />
  );
}
