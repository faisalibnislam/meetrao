import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { Kicker } from "@/components/marketing/site-chrome";
import { OG_IMAGE, articleLd, breadcrumbLd, faqLd, graph } from "@/lib/seo";

/* ─────────────────────────────────────────────────────────────────────────────
   What a scheduling tool can read in your calendar.

   The question gets asked constantly and is answered almost nowhere, because
   the honest answer is a sentence about OAuth scopes and nobody selling a
   scheduler wants to write it down. Meetrao no longer holds any calendar
   scope at all: it reads a calendar feed the host gives it and keeps only the
   busy times, which is the smallest version of this there is.

   RULE FOR THIS PAGE. It describes the OAuth scopes and calendar feeds, which
   are published, checkable facts about how the calendar providers work. It
   does NOT characterise what any other company does with what it is granted,
   because that is a claim about their behaviour and this page has no way to
   check it.
   ───────────────────────────────────────────────────────────────────────────── */

/* Written out again below rather than interpolated. seo-invariants.test.ts
   reads each page's metadata without executing it, so a title behind a
   reference is a title it cannot measure, and the 60-character limit stops
   being checked for this page only. */
const TITLE = "What a scheduling app can read in your calendar";

export const metadata: Metadata = {
  title: "What a scheduling app can read in your calendar",
  description:
    "Free/busy access, full event access and calendar feeds compared: what each one exposes, how " +
    "to check what you granted, and how to take it back.",
  alternates: { canonical: "/guides/calendar-privacy" },
  openGraph: {
    images: [OG_IMAGE],
    type: "article",
    title: `${TITLE} · Meetrao`,
    description:
      "Free/busy, full event access and calendar feeds compared, how to check what you granted, and how to revoke it.",
    url: "/guides/calendar-privacy",
  },
};

const FAQ: [string, string][] = [
  [
    "Can a scheduling app read my meeting titles?",
    "It depends on what you gave it, not on the app's marketing. A tool holding only calendar.freebusy receives intervals: busy from 10:00 to 10:30, and nothing else. A tool holding calendar.events or calendar.readonly can read the title, the description, the guest list and the attachments of every event in that calendar. A tool given a calendar feed address receives the whole feed, and what matters is what it keeps.",
  ],
  [
    "What does Meetrao ask for?",
    "No calendar permission at all. Sign in with Google asks only for your name, email address and profile picture. For conflicts you paste your calendar's private feed address, and from that feed Meetrao keeps only busy start and end times. Titles, descriptions, attendees and locations are not stored.",
  ],
  [
    "How do I check what I have already granted?",
    "Open your Google Account, go to Data and privacy, then Third-party apps and services. Every app you have connected is listed with the access it holds, and you can remove any of them from that screen. Revoking from there is immediate and does not require the app's cooperation.",
  ],
  [
    "How do I take back a calendar feed address?",
    "Remove it in the app first. Then, to be certain, reset the address at the source: in Google Calendar, the secret address has a Reset button, and in Outlook or iCloud you can stop publishing or sharing the calendar. The old address stops working for everybody who had it.",
  ],
  [
    "Is busy time enough to run a booking page?",
    "Yes, entirely. Showing availability only needs to know when you are taken. Putting the booking on both calendars does not need write access either: Meetrao emails a standard calendar invite, and your own calendar app adds it.",
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
              "The difference between free/busy access, full event access and a calendar feed, how " +
              "to check what a scheduling app holds, and how to revoke it.",
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
            Connecting a booking link to your calendar usually means granting an app access to it.
            The grants are not all the same size, Google names them on the consent screen, and
            almost nobody reads that screen. Here is what the sizes are, how a calendar feed differs,
            and how to tell what you handed over.
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
            location and no attachment. There is no field for them.
          </p>
          <p>
            <strong>calendar.events</strong> and <strong>calendar.readonly</strong> return events.
            That means the title, the description, who is invited, where it is and what is attached,
            for everything in the calendar. These are the scopes that let an app create the booking
            on your calendar afterwards, which is why many schedulers ask for one, and they are also
            the scopes that let an app list everything already in it.
          </p>
          <p>
            The gap between those two is the whole question, and the consent screen is where it is
            stated. &ldquo;See when you are busy or free&rdquo; is the first. &ldquo;See, edit,
            share and permanently delete all the calendars you can access&rdquo; is the second.
          </p>

          <h2>A third way: a calendar feed</h2>
          <p>
            Google Calendar, Outlook and iCloud can all publish a calendar as a private feed: a long,
            unguessable address in iCal (.ics) format. Anybody holding the address can read the
            feed, and the feed has the full events in it. So the question shifts from &ldquo;what did
            I grant&rdquo; to &ldquo;what does the app keep&rdquo;, and that is a question for its
            privacy policy.
          </p>
          <p>
            A feed has two practical differences from a connection. It is read-only, so the app
            cannot change your calendar. And it can lag: Google can take a few hours to update its
            feed, so an event added a moment ago may not show up straight away.
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
            <li>
              Feeds do not appear on that list. If you have handed out a feed address, reset it in
              your calendar&rsquo;s settings to cut off everybody who had the old one.
            </li>
          </ul>
          <p>
            Worth doing once a year regardless of which scheduler you use. The list is usually
            longer than people expect, and most of it is things tried once.
          </p>

          <h2>What Meetrao asks for</h2>
          <p>
            No calendar permission. The{" "}
            <Link href="/privacy#p-calendar-feed">Privacy Policy</Link> says the same thing in more
            detail.
          </p>
          <ul>
            <li>
              <strong>Sign in with Google</strong>, if you use it, asks only for your name, email
              address and profile picture. It grants no access to your calendar.
            </li>
            <li>
              <strong>Your calendar feed</strong>, if you add one, is fetched every few minutes when
              it is needed. Meetrao keeps only the busy start and end times from it, for a limited
              window ahead, and never the titles, descriptions, attendees or locations. The address
              is stored privately and shown masked after you save it.
            </li>
            <li>
              <strong>Calendar invites</strong> go out by email to you and your guest with each
              booking, so your own calendar app adds the meeting. Meetrao never writes to your
              calendar.
            </li>
          </ul>
          <p>
            Removing the feed in Settings deletes the address and the busy times kept from it.
            Meetrao does not sell your data or your guests&rsquo; data, and does not use either to
            train machine-learning models; both are stated in the policy rather than only here.
          </p>

          <h2>Questions worth asking any scheduler</h2>
          <ul>
            <li>Which OAuth scopes does the consent screen name, and does the privacy policy use the same words?</li>
            <li>If it reads a feed, what does it keep from it, and for how long?</li>
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
            Meetrao keeps busy times and nothing else. Free, with no card.
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
