"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cx } from "@/lib/cx";

/* The answers are deliberately plain about what Meetrao does not do — one
   calendar provider, one meeting location, one weekly schedule, no promise of
   "free forever" that could not be kept. */

export const FAQS: [string, string, string][] = [
  [
    "what",
    "What is Meetrao?",
    "A meeting and appointment scheduler. Connect your Google Calendar, set the hours you are free, and share one link. People pick from what is actually open, and the meeting is booked with a Google Meet link on both calendars.",
  ],
  [
    "free",
    "Is Meetrao really free?",
    "Yes. Every feature on this page is free to use, with no card required and no subscription.",
  ],
  [
    "forever",
    "Is it free forever?",
    'We cannot honestly promise "forever". What we do commit to: Meetrao is free today, and if paid plans ever arrive we will email you before anything becomes chargeable and you would have to opt in. A free account is never billed automatically.',
  ],
  [
    "account",
    "Do guests need an account?",
    "No. They give a name, an email and an optional note. No sign-up, no password, no download.",
  ],
  [
    "google",
    "Does it work with Google Calendar?",
    "Yes — it is the integration Meetrao is built on, and currently the only calendar it connects to.",
  ],
  [
    "meet",
    "Does it create Google Meet links?",
    "Yes. Every confirmed booking gets its own Meet link, attached to the calendar event on both sides.",
  ],
  [
    "double",
    "How does it prevent double booking?",
    "Before offering any slot, Meetrao checks your calendar for conflicts and hides anything you are already busy for. It checks again at the moment of booking, so if two people pick the same slot only the first gets it.",
  ],
  [
    "tz",
    "Does it handle timezones?",
    "Yes. Set yours once; guests see your hours converted into theirs. Ninety-four timezones, correct through daylight saving.",
  ],
  [
    "hours",
    "Can I set working hours?",
    "Yes. Tick the days you work and set the hours in each. A day can have more than one range, so you can protect a lunch break.",
  ],
  [
    "buffer",
    "Can I add buffer time?",
    "Yes — a buffer either side, a minimum notice period so nobody grabs the next ten minutes, and a booking window limiting how far ahead people can book.",
  ],
  [
    "cancel",
    "Can people cancel or reschedule?",
    "Both sides can cancel, and the other party is notified with the event removed and the slot reopened. Rescheduling is not built yet — cancel and book a new time.",
  ],
  [
    "private",
    "Is my calendar private?",
    "Meetrao reads only whether a period is busy or free. Never event titles, guests, descriptions, locations or attachments. Disconnect any time from Settings.",
  ],
  [
    "who",
    "Who is Meetrao for?",
    "Anyone whose work starts with a conversation — freelancers, consultants, agencies, sales teams, coaches and remote teams.",
  ],
  [
    "compare",
    "How does it compare with paid tools?",
    "Meetrao does the core job and does not charge for it. It is deliberately narrow: one calendar provider, one meeting location, one weekly schedule. If you need payments, round-robin booking or CRM integrations, a paid tool will serve you better.",
  ],
];

export function Faq() {
  const [open, setOpen] = useState("what");

  const columns = [FAQS.slice(0, 7), FAQS.slice(7)];

  return (
    <div className="mt-[26px] grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] items-start gap-[14px]">
      {columns.map((items, ci) => (
        <div
          key={ci}
          className="min-w-0 self-start overflow-hidden rounded-[14px] border border-line bg-surface"
        >
          {items.map(([key, question, answer], i) => {
            const isOpen = open === key;
            return (
              <div
                key={key}
                className={cx("flex flex-col", i > 0 && "border-t border-line-soft", isOpen && "bg-fill")}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? "" : key)}
                  className="box-border flex w-full cursor-pointer items-center gap-[14px] border-0 bg-transparent px-[18px] py-[15px] font-sans text-[14px] font-semibold text-ink transition-colors duration-[120ms] hover:bg-fill"
                >
                  <span className="min-w-0 flex-1 text-left">{question}</span>
                  <Icon
                    name="plus"
                    size={12}
                    className={cx(
                      "flex-none transition-transform duration-[180ms] ease-[cubic-bezier(.22,1,.36,1)]",
                      isOpen ? "rotate-45 text-accent" : "text-ink-3",
                    )}
                  />
                </button>

                {isOpen ? (
                  <div className="animate-in px-[18px] pb-[16px]">
                    <span className="block text-[13.5px] leading-[1.65] text-pretty text-ink-2">{answer}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
