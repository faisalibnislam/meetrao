"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-class";
import { ChoiceChip, Field, Help, Input, Textarea } from "@/components/ui/controls";
import { Eyebrow } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { MenuSelect } from "@/components/ui/menu-select";
import { Callout } from "@/components/ui/panels";
import { useToast } from "@/components/ui/toast";
import { AvailabilityEditor } from "@/components/app/availability-editor";
import { daysToRules, type Day } from "@/lib/availability";
import { OnboardingCard } from "./onboarding-card";
import { saveAvailability } from "@/lib/actions/availability";
import { completeOnboarding, saveFirstMeeting } from "@/lib/actions/onboarding";
import type { TimezoneOption } from "@/lib/timezones";
import { bookingLink } from "@/lib/username";
import Link from "next/link";
import { copyText } from "@/lib/clipboard";
import { FeedForm, VideoLinkForm, type FeedView } from "@/components/app/calendar-feed-form";

/* ── Step 2 · Calendar ────────────────────────────────────────────────────── */

/* No permission screen any more. Meetrao used to ask Google for access to the
   host's calendar; now the host pastes their calendar's private feed address
   (read for busy times only) and their own video link, and every booking
   email carries a calendar invite. Both are optional here and can be added in
   Settings later; the last step says what is missing. */
export function StepCalendar({
  feed,
  videoLink,
}: {
  feed: FeedView;
  videoLink: string | null;
}) {
  const router = useRouter();

  return (
    <OnboardingCard
      title="Add your calendar"
      blurb="Paste your calendar's private address so guests can't book over your other events, and add the video link your video calls should use."
      actions={
        <>
          <Button variant="accent" size={38} onClick={() => router.push("/onboarding/3")}>
            Continue
          </Button>
          {!feed.connected ? (
            <Button variant="ghost" size={38} onClick={() => router.push("/onboarding/3")}>
              Skip for now
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <FeedForm feed={feed} compact />

        <VideoLinkForm initial={videoLink} />

        <div className="flex gap-[11px] rounded-[8px] border border-line bg-fill px-[14px] py-[12px]">
          <Icon name="circle-info" weight="solid" size={11} className="mt-[3px] flex-none text-ink-3" />
          <span className="text-[12.5px] leading-[1.6] text-ink-2">
            Meetrao never asks for access to your calendar. It reads only when you are busy, not what your events
            are, and each booking reaches your calendar and your guest&rsquo;s as an emailed invite.{" "}
            <Link href="/help#calendar">How this works</Link>.
          </span>
        </div>
      </div>
    </OnboardingCard>
  );
}


/* ── Step 3 · First meeting ───────────────────────────────────────────────── */

const DURATIONS = [15, 30, 45, 60];

export function StepFirstMeeting({
  initialName,
  initialDescription,
  initialDuration,
}: {
  initialName: string;
  initialDescription: string;
  initialDuration: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [duration, setDuration] = useState(initialDuration);
  const [touched, setTouched] = useState(false);
  const [saving, startSave] = useTransition();

  const invalid = touched && !name.trim();

  return (
    <OnboardingCard
      title="Create your first meeting"
      blurb="This is what guests will see and book. Most people start with one and add more later."
      actions={
        <Button
          variant="accent"
          size={38}
          busy={saving}
          onClick={() =>
            startSave(async () => {
              if (!name.trim()) {
                setTouched(true);
                return;
              }
              const result = await saveFirstMeeting({ name, description, duration });
              if (result.error) {
                toast({ tone: "bad", title: "Could not save", text: result.error });
                return;
              }
              router.push("/onboarding/4");
            })
          }
        >
          Continue
        </Button>
      }
    >
      <div className="flex flex-col gap-[15px]">
        <Field
          label="Meeting name"
          htmlFor="meeting-name"
          error={invalid ? "Give the meeting a name guests will recognise." : undefined}
        >
          <Input
            id="meeting-name"
            height={36}
            value={name}
            invalid={invalid}
            onChange={(e) => setName(e.target.value)}
            placeholder="30 Minute Consultation"
          />
        </Field>

        <Field
          label="Description"
          htmlFor="meeting-description"
          help="Guests see this on your booking page."
        >
          <Textarea
            id="meeting-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A quick conversation to discuss your project."
          />
        </Field>

        <div className="flex flex-col gap-[7px]">
          <span className="text-[12.5px] font-semibold text-ink">Duration</span>
          <div className="flex flex-wrap gap-[6px]">
            {DURATIONS.map((d) => (
              <ChoiceChip key={d} selected={duration === d} onClick={() => setDuration(d)}>
                {d} min
              </ChoiceChip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-[7px]">
          <span className="text-[12.5px] font-semibold text-ink">Location</span>
          <div className="flex h-[36px] items-center gap-[9px] rounded-[6px] border border-line bg-fill px-[12px]">
            <Icon name="video" size={13} className="text-ink-2" />
            <span className="text-[13.5px] text-ink">Video call</span>
            <span className="ml-auto text-[12px] text-ink-3">Only option in this release</span>
          </div>
        </div>
      </div>
    </OnboardingCard>
  );
}

/* ── Step 4 · Availability ────────────────────────────────────────────────── */

export function StepAvailability({
  initialDays,
  initialTimezone,
  timezones,
  scheduleId,
  detected,
}: {
  initialDays: Day[];
  initialTimezone: string;
  timezones: TimezoneOption[];
  /** The default schedule. Onboarding never shows the schedule picker. */
  scheduleId: string;
  detected: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [days, setDays] = useState(initialDays);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [saving, startSave] = useTransition();

  return (
    <OnboardingCard
      title="When are you free?"
      blurb="Guests will only ever be offered times inside these hours, in their own timezone."
      actions={
        <Button
          variant="accent"
          size={38}
          busy={saving}
          onClick={() =>
            startSave(async () => {
              const result = await saveAvailability({ scheduleId, timezone, rules: daysToRules(days) });
              if (result.error) {
                toast({ tone: "bad", title: "Could not save", text: result.error });
                return;
              }
              router.push("/onboarding/5");
            })
          }
        >
          Continue
        </Button>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <div className="flex max-w-[320px] flex-col gap-[6px]">
          <span className="text-[12.5px] font-semibold text-ink">Timezone</span>
          <MenuSelect
            searchable
            aria-label="Timezone"
            options={timezones}
            value={timezone}
            onChange={setTimezone}
          />
          {detected ? <Help>Detected from your browser.</Help> : null}
        </div>

        <AvailabilityEditor days={days} onChange={setDays} />
      </div>
    </OnboardingCard>
  );
}

/* ── Step 5 · Ready ───────────────────────────────────────────────────────── */

export function StepReady({
  username,
  meetingName,
  duration,
  openDays,
  firstStart,
  connected,
  videoMissing,
}: {
  username: string;
  meetingName: string;
  duration: number;
  openDays: number;
  firstStart: string;
  /** A calendar feed is saved. */
  connected: boolean;
  /** The first meeting is a video call and no video link is saved. */
  videoMissing: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [finishing, startFinish] = useTransition();

  const link = bookingLink(username);

  const summary = [
    { ok: true, text: `${meetingName} · ${duration} min` },
    { ok: true, text: `${openDays} days a week, from ${firstStart}` },
    { ok: connected, text: connected ? "Calendar feed added" : "No calendar feed yet" },
    ...(videoMissing ? [{ ok: false, text: "No video link yet" }] : []),
  ];

  return (
    <OnboardingCard
      title="You are ready"
      blurb="Share your link and let people pick a time that works for both of you."
      actions={
        <>
          <Button
            variant="accent"
            size={38}
            busy={finishing}
            onClick={() =>
              startFinish(async () => {
                await completeOnboarding();
                router.push("/dashboard");
              })
            }
          >
            Go to dashboard
          </Button>
          {/* A real anchor: middle-click and cmd-click should work, and the host
              should not lose their place to preview their page. */}
          <a
            href={`/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`unlink no-underline ${buttonClass("ghost", 38)}`}
          >
            View booking page
            <Icon name="external-link" size={10} />
          </a>
        </>
      }
    >
      <div className="flex flex-col gap-[15px]">
        <div className="flex flex-col gap-[7px]">
          <Eyebrow size={10.5}>Your booking link</Eyebrow>
          <div className="flex h-[40px] items-center gap-[10px] rounded-[6px] border border-line-strong bg-fill pr-[6px] pl-[12px]">
            <span className="min-w-0 flex-1 overflow-hidden text-[13px] text-ellipsis whitespace-nowrap text-ink">
              {link}
            </span>
            <Button
              variant="secondary"
              size={30}
              icon={copied ? "check" : "copy"}
              className="flex-none rounded-[5px]"
              onClick={async () => {
                if (!(await copyText(`https://${link}`))) return;
                setCopied(true);
                toast({ tone: "ok", title: "Copied", text: link });
                setTimeout(() => setCopied(false), 1800);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-[10px] rounded-[8px] border border-line px-[15px] py-[14px]">
          {summary.map((row) => (
            <div key={row.text} className="flex items-center gap-[10px]">
              <Icon
                name={row.ok ? "check" : "triangle-exclamation"}
                weight="solid"
                size={10}
                className={`w-[14px] flex-none ${row.ok ? "text-accent-ink" : "text-amber"}`}
              />
              <span className="text-[13px] text-ink-2">{row.text}</span>
            </div>
          ))}
        </div>

        {/* The one upsell in onboarding, and it is at the END, after the
            link works. Asking somebody to consider paying before they have
            seen the thing work is how a setup flow loses people. */}
        <div className="flex flex-col gap-[7px] rounded-[8px] border border-accent-line bg-accent-soft px-[15px] py-[13px]">
          <span className="text-[13px] font-semibold text-ink">Everything here is free</span>
          <span className="text-[12.5px] leading-[1.55] text-ink-2">
            Pro is $30 a year when you want the page to look like yours, your logo, your colour, and your
            own domain at meeting.yourcompany.com/your-name, or one link your whole team answers.{" "}
            <Link href="/settings/plan" className="font-semibold">
              See Pro
            </Link>
          </span>
        </div>

        {videoMissing ? (
          <Callout
            tone="red"
            align="center"
            action={
              <ButtonLink variant="amber" size={28} href="/onboarding/2">
                Add link
              </ButtonLink>
            }
          >
            Add your video link: guests can&rsquo;t book {meetingName} until Meetrao has a call link to send them.
          </Callout>
        ) : !connected ? (
          <Callout
            tone="amber"
            align="center"
            action={
              <ButtonLink variant="amber" size={28} href="/onboarding/2">
                Add calendar
              </ButtonLink>
            }
          >
            Add your calendar feed before you share this link, so guests can&rsquo;t book over something you
            already have.
          </Callout>
        ) : null}
      </div>
    </OnboardingCard>
  );
}
