import type { Metadata } from "next";
import { DocPage, type DocSection } from "@/components/marketing/doc-page";

export const metadata: Metadata = {
  title: "Help centre",
  description:
    "How to set up Meetrao, describe the meetings people can book, set your hours, and understand what your guests see.",
};

const SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    body: [
      { kind: "p", text: "Signing up takes about two minutes. There are two ways in." },
      { kind: "term", term: "With an email address —", text: "enter your name, work email and a password of at least 8 characters. We email you a confirmation link straight away, and you cannot use Meetrao until you click it — this stops anyone signing up with an address that is not theirs. The link lasts 24 hours." },
      { kind: "p", text: "If it does not arrive, check your spam folder, then use Resend the email on the waiting screen. Typed your address wrong? Use a different email takes you back to sign-up." },
      { kind: "term", term: "With Google —", text: "continue with Google and you skip the confirmation step entirely, because Google has already verified the address. You go straight to setup." },
      { kind: "p", text: "Forgot your password? Use Forgot? next to the password field. We send a reset link that expires in one hour." },
    ],
  },
  {
    id: "setup",
    title: "Setting up — the five steps",
    body: [
      { kind: "p", text: "After you confirm your email, Meetrao walks you through setup. The tracker at the top shows where you are, and everything here can be changed later." },
      { kind: "p", text: "You can skip connecting your calendar, but then Meetrao cannot see when you are busy — guests may be offered times you already have something in." },
      { kind: "p", text: "Need to stop halfway? Use the account button at the top-right to log out. Your progress is saved and you can pick it up later." },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    body: [
      { kind: "p", text: "The first thing you see, designed to be read once in the morning and then closed. It greets you with today's date, the current time, and where you stand." },
      { kind: "p", text: "Four cards summarise things: how many meetings are Upcoming, when your Next meeting is and with whom, how many Active meetings can be booked from your link, and how many bookings you have taken recently." },
      { kind: "p", text: "Below that, Today lists what is happening now, each row with a Join button that opens Google Meet directly. Later this week follows. Details on any row opens the full booking, including any note your guest left." },
      { kind: "p", text: "If your calendar is not connected, an amber banner sits at the top until it is. It is worth clearing." },
      { kind: "p", text: "Copy link in the header copies your booking link. If more than one meeting is active it becomes a dropdown, so you can copy the link for a specific meeting." },
    ],
  },
  {
    id: "meetings",
    title: "Meetings — what people can book",
    body: [
      { kind: "p", text: "A “meeting” is a type of appointment, not a single booking. Most people have two or three — a short intro call, a standard consultation, a longer deep dive." },
      { kind: "term", term: "Creating one —", text: "give it a name guests will recognise and a description; both appear on your booking page. Pick a duration of 15, 30, 45 or 60 minutes." },
      { kind: "term", term: "Booking rules —", text: "three settings protect your day: a buffer either side, a minimum notice period so nobody grabs the next ten minutes, and a booking window limiting how far ahead people can book." },
      { kind: "term", term: "Turning one off —", text: "the Active switch controls whether a meeting can be booked. Switch it off and it stays in your list, with its settings and history intact, but nobody can book it." },
    ],
  },
  {
    id: "availability",
    title: "Availability — when you are free",
    body: [
      { kind: "p", text: "One weekly schedule covers your whole account. Tick the days you work and set the hours in each. A day can hold more than one range, so a lunch break stays protected." },
      { kind: "p", text: "A day with no hours is Unavailable. Your timezone is set once, and guests always see your hours converted into theirs." },
    ],
  },
  {
    id: "bookings",
    title: "Bookings — who booked you",
    body: [
      { kind: "p", text: "Every booking, split into Upcoming and Past. Each row shows the guest, the date and time, and its status." },
      { kind: "p", text: "Cancelling notifies the other party, removes the calendar event and reopens the slot. Rescheduling is not built yet — cancel and book a new time." },
    ],
  },
  {
    id: "guests",
    title: "What your guests see",
    body: [
      { kind: "p", text: "Your booking page shows your name, title and photo, the meeting and its length, and a calendar of the times you are genuinely free — in the guest's own timezone." },
      { kind: "p", text: "They give a name, an email and an optional note. No account, no password, no download. They get a confirmation with a Google Meet link, and can cancel from it." },
    ],
  },
  {
    id: "account",
    title: "Settings and your account",
    body: [
      { kind: "p", text: "Settings holds your profile and username, the Google Calendar connection, booking defaults applied to new meetings, and your account controls." },
      { kind: "p", text: "Disconnecting Google Calendar takes one click and deletes the stored token. Conflict checking stops immediately, so guests may be offered times you are not free." },
    ],
  },
];

export default function HelpPage() {
  return (
    <DocPage
      eyebrow="Help centre"
      title="Help Centre"
      lede="Meetrao replaces the back-and-forth of finding a time. You connect your calendar once, describe the meetings people can book, set the hours you are free, and share one link."
      meta={["Updated 7 September 2026"]}
      sections={SECTIONS}
    />
  );
}
