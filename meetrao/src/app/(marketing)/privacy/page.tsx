import type { Metadata } from "next";
import { DocPage, type DocSection } from "@/components/marketing/doc-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Meetrao collects, what it deliberately leaves alone, who else touches it, and the rights you have over it.",
};

const SECTIONS: DocSection[] = [
  {
    id: "collect",
    title: "1. What we collect",
    body: [
      { kind: "p", text: "Everything below is either something you typed, or something the product cannot work without." },
      { kind: "term", term: "Account details —", text: "your name, email address, password (stored hashed, never in readable form), and whether your email is confirmed." },
      { kind: "term", term: "Profile —", text: "job title, username and profile photo if you add one. Your name, title and photo are shown publicly on your booking page." },
      { kind: "term", term: "Your setup —", text: "meeting names and descriptions, durations, booking rules, weekly availability and your timezone." },
      { kind: "term", term: "Notification preferences —", text: "the switches in Settings that decide which emails we send you." },
      { kind: "term", term: "Busy and free times —", text: "when you have something on, so we never offer that slot. We do not read event titles, guest lists, descriptions, locations or attachments." },
      { kind: "term", term: "Permission to create events —", text: "used only to write confirmed bookings to your calendar with a Google Meet link, and to invite your guest to that event." },
      { kind: "term", term: "An access token —", text: "stored encrypted so we can do the above without asking you again. Deleted when you disconnect or delete your account." },
      { kind: "term", term: "From your guests —", text: "a name and email, required to confirm a booking and send the invitation; an optional note, whatever they choose to type; and their timezone, detected in the browser so times display correctly." },
      { kind: "p", text: "Guests do not create accounts and do not get passwords. For guest data, the host is the one who decides how it is used — we handle it on their instruction." },
      { kind: "p", text: "Because Meetrao invites the guest to the host’s calendar event, the guest’s name and email are passed to Google Calendar as an attendee, and both parties can see each other’s address on the event." },
      { kind: "term", term: "Automatically —", text: "basic technical data such as IP address, browser and device type, and pages visited, used to keep the service running and prevent abuse; and whether our emails were delivered and opened, so we can tell when a confirmation has failed to arrive." },
    ],
  },
  {
    id: "dont",
    title: "2. What we don’t do",
    body: [
      {
        kind: "list",
        items: [
          "We do not sell your data, or your guests’ data, to anyone.",
          "We do not read the contents of your calendar events.",
          "We do not use your data or your guests’ data to train machine-learning models.",
          "We do not run advertising or share data with ad networks.",
          "We do not email your guests marketing. They hear from us only about the booking they made.",
        ],
      },
    ],
  },
  {
    id: "why",
    title: "3. Why we use it",
    body: [
      { kind: "p", text: "If you are in the EU or UK, our legal bases are: performing our contract with you (running the service and sending booking emails), legitimate interests (keeping the service secure and working), and consent where the law requires it." },
    ],
  },
  {
    id: "who-else",
    title: "4. Who else touches it",
    body: [
      { kind: "p", text: "We use a small number of companies to run Meetrao. Each is contractually limited to what we hire them for, and none may use your data for their own purposes." },
      { kind: "p", text: "The people you meet with also see things: your guest sees your name, title, photo, meeting details and the times you are free, and you see your guest’s name, email and note." },
      { kind: "p", text: "We will disclose data if the law requires it, and to protect the service or someone’s safety. If Meetrao is ever sold or merged, your data may transfer with it." },
    ],
  },
  {
    id: "where",
    title: "5. Where it is stored",
    body: [
      { kind: "p", text: "Airly Studio operates from Bangladesh and the United States, and our providers run servers in several countries. Your data will therefore be transferred across borders." },
      { kind: "p", text: "Where we move personal data out of the EU or UK, we rely on the European Commission’s Standard Contractual Clauses, or the UK Addendum." },
      { kind: "decision", text: "name the actual hosting regions once infrastructure is fixed, and confirm SCCs are signed with each provider. Bangladesh has no EU adequacy decision, so this has to be settled before launch." },
    ],
  },
  {
    id: "retention",
    title: "6. How long we keep it",
    body: [
      { kind: "p", text: "While your account is open, we keep your data so the service works. When your account is deleted — by you, or by us for a breach of the terms — we remove it." },
      { kind: "p", text: "Two caveats, both narrow. Encrypted backups may hold deleted data for a short window before they rotate out, and where the law requires us to retain something, we retain it." },
    ],
  },
  {
    id: "rights",
    title: "7. Your rights",
    body: [
      { kind: "p", text: "Wherever you are, you can ask us to show you what we hold, correct it, delete it, or send you a copy. Email hello@airlystudio.com and we will reply within 30 days. We will not charge you or treat you differently for asking." },
      { kind: "p", text: "Some of it you can do yourself: edit your profile in Settings, change your notification preferences, disconnect Google Calendar, or delete your account." },
    ],
  },
  {
    id: "security",
    title: "8. Security",
    body: [
      { kind: "p", text: "Passwords are hashed, calendar tokens are encrypted, and traffic runs over HTTPS. No service can promise perfect security, but we will tell you promptly if something goes wrong that affects you." },
    ],
  },
  {
    id: "cookies",
    title: "9. Cookies",
    body: [
      { kind: "p", text: "We use cookies to keep you signed in and to remember basic preferences. These are necessary for the service to work." },
      { kind: "decision", text: "a cookie-consent banner does not exist yet. EU and UK visitors must be able to refuse analytics cookies before any are set, so this has to be built before launch." },
    ],
  },
  {
    id: "children",
    title: "10. Children",
    body: [
      { kind: "p", text: "Meetrao is not intended for children. You must be at least 16 to hold an account, as set out in the Terms of Service." },
    ],
  },
  {
    id: "policy-changes",
    title: "11. Changes to this policy",
    body: [
      { kind: "p", text: "We may update this policy. If a change materially affects you, we will email you before it takes effect, using the address on your account." },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <DocPage
      eyebrow="Privacy Policy"
      title="What we collect, and what we don’t"
      lede="Meetrao needs your calendar to do its job. That is a lot of trust, so this page is specific about what we take, what we leave alone, and who else can see it."
      meta={["Last updated 7 September 2026", "Controller: Airly Studio"]}
      sections={SECTIONS}
    />
  );
}
