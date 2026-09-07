"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Eyebrow } from "./eyebrow";

/**
 * Fourteen questions in two columns, so they take half the height. Copy is
 * taken from the design verbatim — including the deliberately careful answer
 * about "free forever", which does not promise it.
 */
const FAQS: { id: string; q: string; a: string }[] = [
  { id: "what", q: "What is Meetrao?", a: "A meeting and appointment scheduler. Connect your Google Calendar, set the hours you are free, and share one link. People pick from what is actually open, and the meeting is booked with a Google Meet link on both calendars." },
  { id: "free", q: "Is Meetrao really free?", a: "Yes. Every feature on this page is free to use, with no card required and no subscription." },
  { id: "forever", q: "Is it free forever?", a: "We cannot honestly promise “forever”. What we do commit to: Meetrao is free today, and if paid plans ever arrive we will email you before anything becomes chargeable and you would have to opt in. A free account is never billed automatically." },
  { id: "account", q: "Do guests need an account?", a: "No. They give a name, an email and an optional note. No sign-up, no password, no download." },
  { id: "google", q: "Does it work with Google Calendar?", a: "Yes — it is the integration Meetrao is built on, and currently the only calendar it connects to." },
  { id: "meet", q: "Does it create Google Meet links?", a: "Yes. Every confirmed booking gets its own Meet link, attached to the calendar event on both sides." },
  { id: "double", q: "How does it prevent double booking?", a: "Before offering any slot, Meetrao checks your calendar for conflicts and hides anything you are already busy for. It checks again at the moment of booking, so if two people pick the same slot only the first gets it." },
  { id: "tz", q: "Does it handle timezones?", a: "Yes. Set yours once; guests see your hours converted into theirs. Ninety-four timezones, correct through daylight saving." },
  { id: "hours", q: "Can I set working hours?", a: "Yes. Tick the days you work and set the hours in each. A day can have more than one range, so you can protect a lunch break." },
  { id: "buffer", q: "Can I add buffer time?", a: "Yes — a buffer either side, a minimum notice period so nobody grabs the next ten minutes, and a booking window limiting how far ahead people can book." },
  { id: "cancel", q: "Can people cancel or reschedule?", a: "Both sides can cancel, and the other party is notified with the event removed and the slot reopened. Rescheduling is not built yet — cancel and book a new time." },
  { id: "private", q: "Is my calendar private?", a: "Meetrao reads only whether a period is busy or free. Never event titles, guests, descriptions, locations or attachments. Disconnect any time from Settings." },
  { id: "who", q: "Who is Meetrao for?", a: "Anyone whose work starts with a conversation — freelancers, consultants, agencies, sales teams, coaches and remote teams." },
  { id: "compare", q: "How does it compare with paid tools?", a: "Meetrao does the core job and does not charge for it. It is deliberately narrow: one calendar provider, one meeting location, one weekly schedule. If you need payments, round-robin booking or CRM integrations, a paid tool will serve you better." },
];

const COLUMNS = [FAQS.slice(0, 7), FAQS.slice(7)];

export function Faq() {
  const [open, setOpen] = useState<string | null>("what");

  return (
    <section id="faq" className="border-t border-line bg-ground">
      <div className="mx-auto max-w-[1200px] px-[18px] py-[64px] sm:px-[26px]">
        <div className="flex max-w-[620px] flex-col gap-[11px]">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="m-0 font-serif text-[clamp(28px,3.6vw,44px)] leading-[1.04] font-normal tracking-[-0.02em] text-ink text-balance">
            Questions people actually ask.
          </h2>
        </div>

        <div className="mt-[26px] grid items-start gap-[14px] [grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr))]">
          {COLUMNS.map((col, i) => (
            <div
              key={i}
              className="min-w-0 self-start overflow-hidden rounded-[14px] border border-line bg-surface"
            >
              {col.map((item) => {
                const isOpen = open === item.id;
                return (
                  <div key={item.id} className="border-b border-line-soft last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : item.id)}
                      aria-expanded={isOpen}
                      className="flex min-h-[52px] w-full cursor-pointer items-center gap-[12px] bg-transparent px-[18px] py-[14px] text-left hover:bg-fill"
                    >
                      <span className="min-w-0 flex-1 text-[13.5px] font-semibold text-ink">
                        {item.q}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex-none text-[16px] leading-none text-ink-3 transition-transform duration-[160ms]",
                          isOpen && "rotate-45",
                        )}
                      >
                        +
                      </span>
                    </button>
                    {isOpen ? (
                      <div className="animate-mu-in px-[18px] pb-[16px]">
                        <span className="block text-[13.5px] leading-[1.65] text-ink-2 text-pretty">
                          {item.a}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-[16px] flex flex-wrap items-center gap-[14px] rounded-[12px] border border-line bg-surface px-[18px] py-[15px]">
          <span className="min-w-[210px] flex-1 text-[13.5px] leading-[1.55] text-ink-2">
            Something not answered here?
          </span>
          <div className="flex flex-none flex-wrap gap-[9px]">
            <Link
              href="/help"
              className="inline-flex h-[44px] items-center rounded-[7px] border border-line-strong bg-surface px-[13px] text-[13px] font-semibold text-ink no-underline hover:bg-fill-2 hover:text-ink sm:h-[36px]"
            >
              Help centre
            </Link>
            <Link
              href="/support"
              className="inline-flex h-[44px] items-center rounded-[7px] border border-line-strong bg-surface px-[13px] text-[13px] font-semibold text-ink no-underline hover:bg-fill-2 hover:text-ink sm:h-[36px]"
            >
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
