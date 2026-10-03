import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { Kicker } from "@/components/marketing/site-chrome";
import { OG_IMAGE, articleLd, breadcrumbLd, faqLd, graph } from "@/lib/seo";

/* ─────────────────────────────────────────────────────────────────────────────
   What a scheduling tool can read in your calendar.

   The question gets asked constantly and is answered almost nowhere, because
   the honest answer is a sentence about OAuth scopes and nobody selling a
   scheduler wants to write it down. Meetrao can afford to: it asks for
   freebusy, and the one broad scope it does hold is named here rather than
   hidden behind "calendar access".

   RULE FOR THIS PAGE. It describes the OAuth scopes, which are a published,
   checkable fact about how Google's API works. It does NOT characterise what
   any other company does with what it is granted, because that is a claim
   about their behaviour and this page has no way to check it. Where it names
   another product it says what its consent screen asks for and stops.
   ───────────────────────────────────────────────────────────────────────────── */

/* Written out again below rather than interpolated. seo-invariants.test.ts
   reads each page's metadata without executing it, so a title behind a
   reference is a title it cannot measure, and the 60-character limit stops
   being checked for this page only. */
const TITLE = "What a scheduling app can read in your calendar";

export const metadata: Metadata = {
  title: "What a scheduling app can read in your calendar",
  description:
    "The difference between a scheduler that reads your free/busy times and one that reads your " +
    "events, how to check which you granted, and how to take it back.",
  alternates: { canonical: "/guides/calendar-privacy" },
  openGraph: {
    images: [OG_IMAGE],
    type: "article",
    title: `${TITLE} · Meetrao`,
    description:
      "Free/busy against full event access, how to check which one you granted, and how to revoke it from your Google account.",
    url: "/guides/calendar-privacy",
  },
};

const FAQ: [string, string][] = [
  [
    "Can a scheduling app read my meeting titles?",
    "It depends on the permission you granted, not on the app's marketing. A tool holding only calendar.freebusy receives intervals: busy from 10:00 to 10:30, and nothing else. A tool holding calendar.events or calendar.readonly can read the title, the description, the guest list and the attachments of every event in that calendar. Google's consent screen names the grant when you connect; the app's home page usually does not.",
  ],
  [
    "Which permissions does Meetrao ask for?",
    "Two calendar scopes. calendar.freebusy, which is what the booking page runs on, and calendar.events, which is what writes the confirmed booking to your calendar and invites your guest. The second is broader than the use made of it, which the Privacy Policy says in those words rather than leaving you to work out.",
  ],
  [
    "How do I check what I have already granted?",
    "Open your Google Account, go to Data and privacy, then Third-party apps and services. Every app you have connected is listed with the access it holds, and you can remove any of them from that screen. Revoking from there is immediate and does not require the app's cooperation.",
  ],
  [
    "If I revoke access, what happens to my bookings?",
    "On Meetrao, the booking records stay and the calendar stops being read, so the page can no longer tell whether a slot is free. Other tools behave differently. Revoking is always safe to do; it is reconnecting that takes a minute.",
  ],
  [
    "Is free/busy enough to run a booking page?",
    "For showing availability, yes, entirely. It is the only thing Meetrao's booking page consults. Writing the event afterwards is the part that needs more, and that is a separate grant doing a separate job.",
  ],
];

export default function CalendarPrivacyPage() {
  return (
    <>
      <JsonLd
        json={graph(
          articleLd({
            headline: TITLE,
            description:
              "The difference between free/busy access and full event access, how to check which " +
              "one a scheduling app holds, and how to revoke it.",
            path: "/guides/calendar-privacy",
          }),
          faqLd(FAQ),
          /* Two levels, not three. There is no /guides index to point the
             middle crumb at, and a crumb whose URL repeats the one after it
             is a trail that lies about the structure. */
          breadcrumbLd([
            ["Meetrao", "/"],
            [TITLE, "/guides/calendar-privacy"],
          ]),
        )}
      />

      <div className="mx-auto max-w-[1148px] px-[26px] pt-[56px] pb-[64px] max-[560px]:px-[18px]">
        <div className="flex max-w-[720px] flex-col gap-[14px]">
          <Kicker tone="dark">Guide</Kicker>
          <h1 className="m-0 font-serif text-[clamp(30px,4.2vw,46px)] leading-[1.04] font-normal tracking-[-0.02em] text-balance text-ink">
            What a scheduling app can read in your calendar
          </h1>
          <p className="m-0 text-[15.5px] leading-[1.65] text-pretty text-ink-2">
            Connecting a booking link to your calendar means granting an app access to it. The
            grants are not all the same size, Google names them on the consent screen, and almost
            nobody reads that screen. Here is what the two sizes are and how to tell which one you
            handed over.
          </p>
        </div>

        <div className="doc-prose mt-[26px] max-w-[720px]">
          <h2>Two permissions, and the gap between them</h2>
          <p>
            Google Calendar exposes scheduling-relevant data through separate OAuth scopes. The two
            that matter here are not variations of the same thing.
          </p>
          <p>
            <strong>calendar.freebusy</strong> returns intervals. For a given calendar and a given
            window, it answers with a list of the periods that are taken: busy 10:00 to 10:30, busy
            14:00 to 15:00. There is no title in the response, no guest list, no description, no
            location and no attachment. There is no field for them. An app holding this scope and
            nothing else cannot learn what any of your meetings are, because the API it is calling
            does not carry that.
          </p>
          <p>
            <strong>calendar.events</strong> and <strong>calendar.readonly</strong> return events.
            That means the title, the description, who is invited, where it is and what is attached,
            for everything in the calendar. These are the scopes that let an app create the booking
            on your calendar afterwards, which is why most schedulers need one, and they are also
            the scopes that let an app list everything already in it.
          </p>
          <p>
            The gap between those two is the whole question, and the consent screen is where it is
            stated. &ldquo;See when you are busy or free&rdquo; is the first. &ldquo;See, edit,
            share and permanently delete all the calendars you can access&rdquo; is the second.
          </p>

          <h2>Why most schedulers hold the broad one</h2>
          <p>
            Because they write. Showing your availability needs free/busy. Putting the confirmed
            booking on your calendar with a video link, inviting your guest so it lands on theirs,
            moving it when somebody reschedules and removing it when somebody cancels all need
            write access to events, and Google does not offer a write-only scope. There is no way to
            create an event without also being able to read events.
          </p>
          <p>
            So the broad grant is usually real and usually necessary. What varies is whether the
            product says so. A privacy policy that says &ldquo;calendar access&rdquo; where the
            grant says calendar.events is not lying, exactly, but it is choosing the word that
            prompts fewer questions.
          </p>

          <h2>How to check what you have already granted</h2>
          <ul>
            <li>
              Open your Google Account and go to <strong>Data and privacy</strong>, then{" "}
              <strong>Third-party apps and services</strong>.
            </li>
            <li>
              Every app you have connected is listed, with the access each one holds spelled out in
              the same language the consent screen used.
            </li>
            <li>
              Removing access there is immediate and does not need the app&rsquo;s cooperation. It
              is the right first move if you are unsure, because reconnecting takes a minute and
              leaving a forgotten grant in place does not.
            </li>
          </ul>
          <p>
            Worth doing once a year regardless of which scheduler you use. The list is usually
            longer than people expect, and most of it is things tried once.
          </p>

          <h2>What Meetrao asks for</h2>
          <p>
            Two calendar scopes, and the{" "}
            <Link href="/privacy#p-google">Privacy Policy</Link> names both in full because
            Google&rsquo;s verification review compares that table against the consent screen.
          </p>
          <ul>
            <li>
              <strong>calendar.freebusy</strong>, used every time somebody opens your booking page,
              so a slot you already have something in is never offered. This is the only thing the
              booking page consults.
            </li>
            <li>
              <strong>calendar.events</strong>, used to create the event for a confirmed booking
              with its Google Meet link, invite your guest, update or delete that event when the
              booking changes, and read whether your guest accepted it, by that event&rsquo;s own
              identifier rather than by listing or searching your calendar.
            </li>
          </ul>
          <p>
            The second is broader than the use made of it. That is a property of Google&rsquo;s
            scopes rather than a choice, and the honest thing is to write it down rather than let
            &ldquo;calendar access&rdquo; do the work. Meetrao does not sell your data or your
            guests&rsquo; data, and does not use either to train machine-learning models; both are
            stated in the policy rather than only here.
          </p>

          <h2>Questions worth asking any scheduler</h2>
          <ul>
            <li>Which OAuth scopes does the consent screen name, and does the privacy policy use the same words?</li>
            <li>Does the booking page itself read events, or only free/busy?</li>
            <li>What happens to the data when the account is deleted, and is there a grace-period copy?</li>
            <li>Is the data used to train anything?</li>
            <li>Who else receives it, and is that list separate from the general list of subprocessors?</li>
          </ul>
          <p>
            The last one catches more than it looks like it should. A policy often has one list of
            everybody who helps run the service and no separate answer to the narrower question of
            who receives calendar data specifically, and those are different lists.
          </p>

          <h2>Questions</h2>
          {FAQ.map(([question, answer]) => (
            <div key={question}>
              <h3>{question}</h3>
              <p>{answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-[34px] flex max-w-[720px] flex-wrap items-center gap-[12px] rounded-[10px] border border-accent-line bg-accent-soft px-[18px] py-[16px]">
          <span className="min-w-[220px] flex-1 text-[14.5px] leading-[1.5] text-ink">
            Meetrao&rsquo;s booking page runs on free/busy alone. Free, with no card.
          </span>
          <Link
            href="/signup"
            className="unlink inline-flex h-[42px] flex-none items-center rounded-[8px] bg-accent px-[18px] text-[14px] font-semibold whitespace-nowrap text-on-accent no-underline hover:bg-accent-2 hover:text-on-accent"
          >
            Create a free account
          </Link>
          <Link
            href="/privacy"
            className="unlink inline-flex h-[42px] flex-none items-center rounded-[8px] border border-line-strong bg-surface px-[18px] text-[14px] font-semibold text-ink no-underline hover:bg-fill"
          >
            Read the Privacy Policy
          </Link>
        </div>
      </div>
    </>
  );
}
