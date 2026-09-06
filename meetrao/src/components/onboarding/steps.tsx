"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Badge, Eyebrow } from "@/components/ui/controls";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { MenuSelect } from "@/components/ui/menu-select";
import { useToast } from "@/components/ui/toast";
import { RouteLink } from "@/components/ui/route-link";
import { StepCard } from "./step-rail";
import { AvailabilityEditor } from "@/components/app/availability-editor";
import { DurationChips, LocationRow } from "@/components/app/meeting-form";
import { CopyLinkChip } from "@/components/app/copy-link";
import { detectTimezone, timezoneOptions } from "@/lib/timezones";
import { useHydrated } from "@/lib/use-hydrated";
import { completeOnboarding, updateTimezone } from "@/lib/actions/profile";
import { createMeetingType, updateMeetingType } from "@/lib/actions/meetings";
import { calendarFailure } from "@/lib/google/failure";

const CALENDAR_REASONS = [
  "See when you are busy, so guests are never offered a time you cannot make.",
  "Add each booking to your calendar with a Meet link, automatically.",
];

/* ── Step 1 ──────────────────────────────────────────────────────────────── */

export function StepWelcome() {
  return (
    <StepCard
      title="Welcome to Meetrao"
      blurb="Three short steps: connect your calendar, describe one meeting, set the hours you are free. You can change all of it later."
      actions={
        <Link href="/onboarding/2" className={buttonClass({ size: "2xl" })}>
          Get started
        </Link>
      }
    />
  );
}

/* ── Step 2 ──────────────────────────────────────────────────────────────── */

export function StepCalendar({
  connected,
  accountEmail,
  status,
  reason,
}: {
  connected: boolean;
  accountEmail: string | null;
  status?: string;
  reason?: string;
}) {
  const failure = calendarFailure(status, reason);
  const unconfigured = status === "unconfigured";

  return (
    <StepCard
      title="Connect your calendar"
      blurb="Meetrao reads your Google Calendar so guests are never offered a time you already have something in."
      actions={
        <>
          {connected ? (
            <Link href="/onboarding/3" className={buttonClass({ size: "2xl" })}>
              Continue
            </Link>
          ) : (
            <RouteLink
              href="/api/google/connect?next=/onboarding/2"
              className={buttonClass({ size: "2xl" })}
            >
              Connect Google Calendar
            </RouteLink>
          )}
          <Link
            href="/onboarding/3"
            className={buttonClass({ variant: "ghost", size: "2xl" })}
          >
            Skip for now
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-[14px]">
        <div className="flex items-center gap-[13px] rounded-[8px] border border-line bg-fill px-[15px] py-[13px]">
          <Icon name="calendar" size={17} className="text-accent" />
          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="text-[13.5px] font-semibold text-ink">
              Google Calendar
            </span>
            <span className="text-[12.5px] text-ink-3">
              {connected ? (accountEmail ?? "Connected") : "Not connected"}
            </span>
          </div>
          <Badge tone={connected ? "ok" : "off"}>
            {connected ? "Connected" : "Disconnected"}
          </Badge>
        </div>

        {failure ? (
          <div className="flex gap-[11px] rounded-[8px] border border-red-line bg-red-soft px-[14px] py-[12px]">
            <Icon
              name="circleExclamation"
              weight={900}
              size={13}
              className="mt-[2px] text-red"
            />
            <div className="flex flex-col gap-[3px]">
              <span className="text-[13px] font-semibold text-red">
                {failure.title}
              </span>
              <span className="text-[12.5px] leading-[1.5] text-red-ink">
                {failure.body}
              </span>
            </div>
          </div>
        ) : null}

        {unconfigured ? (
          <div className="flex gap-[11px] rounded-[8px] border border-amber-line bg-amber-soft px-[14px] py-[12px]">
            <Icon
              name="triangleExclamation"
              weight={900}
              size={13}
              className="mt-[2px] text-amber"
            />
            <span className="text-[12.5px] leading-[1.5] text-amber-ink">
              Google Calendar is not configured on this deployment. Add
              GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then try again.
            </span>
          </div>
        ) : null}

        <ul className="m-0 flex list-none flex-col gap-[9px] p-0">
          {CALENDAR_REASONS.map((line) => (
            <li key={line} className="flex items-start gap-[10px]">
              <Icon
                name="check"
                weight={900}
                size={10}
                className="mt-[4px] text-accent"
              />
              <span className="text-[13px] leading-[1.5] text-ink-2">
                {line}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </StepCard>
  );
}

/* ── Step 3 ──────────────────────────────────────────────────────────────── */

export function StepMeeting({
  existing,
  defaultDuration,
  defaultNotice,
}: {
  existing: { id: string; name: string; description: string; duration: number } | null;
  defaultDuration: number;
  defaultNotice: number;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [name, setName] = useState(existing?.name ?? "30 Minute Consultation");
  const [description, setDescription] = useState(
    existing?.description ?? "A quick conversation to discuss your project.",
  );
  const [duration, setDuration] = useState(existing?.duration ?? defaultDuration);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) {
      notify("bad", "Name your meeting", "Guests need to recognise it.");
      return;
    }
    startTransition(async () => {
      const input = {
        name,
        description,
        durationMinutes: duration,
        bufferMinutes: 0,
        minimumNoticeMinutes: defaultNotice,
        bookingWindowDays: 30,
        isActive: true,
      };
      const result = existing
        ? await updateMeetingType(existing.id, input)
        : await createMeetingType(input);

      if (!result.ok) {
        notify("bad", "Could not save", result.message);
        return;
      }
      router.push("/onboarding/4");
    });
  }

  return (
    <StepCard
      title="Create your first meeting"
      blurb="This is what guests will see and book. Most people start with one and add more later."
      actions={
        <Button size="2xl" loading={pending} onClick={submit}>
          Continue
        </Button>
      }
    >
      <div className="flex flex-col gap-[15px]">
        <Field label="Meeting name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field
          label="Description"
          helper="Guests see this on your booking page."
        >
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-[7px]">
          <span className="text-[12.5px] font-semibold text-ink">Duration</span>
          <DurationChips value={duration} onChange={setDuration} />
        </div>

        <div className="flex flex-col gap-[7px]">
          <span className="text-[12.5px] font-semibold text-ink">Location</span>
          <LocationRow note="Only option in this release" />
        </div>
      </div>
    </StepCard>
  );
}

/* ── Step 4 ──────────────────────────────────────────────────────────────── */

export function StepHours({
  timezone,
  rules,
}: {
  timezone: string;
  rules: ReadonlyArray<{ weekday: number; start_minute: number; end_minute: number }>;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [picked, setPicked] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const saveRef = useRef<(() => Promise<boolean>) | null>(null);
  const options = useMemo(() => timezoneOptions(), []);
  const hydrated = useHydrated();

  // "Detected from your browser." — a profile still on the UTC default adopts
  // the browser's zone. Derived rather than stored, so the first paint still
  // matches the server HTML.
  const detected =
    hydrated && timezone === "UTC" ? detectTimezone() : timezone;
  const zone = picked ?? detected;
  const setZone = setPicked;

  // Persist the detection once, without holding it in state.
  useEffect(() => {
    if (timezone === "UTC" && detected !== "UTC") void updateTimezone(detected);
  }, [timezone, detected]);

  function submit() {
    startTransition(async () => {
      const saved = await saveRef.current?.();
      if (saved === false) return;
      if (saved === undefined) {
        // Nothing was edited, so persist at least the timezone.
        const result = await updateTimezone(zone);
        if (!result.ok) {
          notify("bad", "Could not save", result.message ?? "Try again.");
          return;
        }
      }
      router.push("/onboarding/5");
    });
  }

  return (
    <StepCard
      title="When are you free?"
      blurb="Guests will only ever be offered times inside these hours, in their own timezone."
      actions={
        <Button size="2xl" loading={pending} onClick={submit}>
          Continue
        </Button>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <div className="flex max-w-[320px] flex-col gap-[6px]">
          <span className="text-[12.5px] font-semibold text-ink">Timezone</span>
          <MenuSelect
            label="Timezone"
            searchable
            options={options}
            value={zone}
            onChange={setZone}
          />
          <span className="text-[12px] text-ink-3">
            Detected from your browser.
          </span>
        </div>

        <AvailabilityEditor
          initialRules={rules}
          timezone={zone}
          showSaveRow={false}
          saveRef={saveRef}
        />
      </div>
    </StepCard>
  );
}

/* ── Step 5 ──────────────────────────────────────────────────────────────── */

export function StepReady({
  bookingLink,
  meetingSummary,
  daysSummary,
  connected,
  username,
}: {
  bookingLink: string;
  meetingSummary: string;
  daysSummary: string;
  connected: boolean;
  username: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();

  const summary = [
    { key: "meeting", ok: true, text: meetingSummary },
    { key: "days", ok: true, text: daysSummary },
    {
      key: "calendar",
      ok: connected,
      text: connected
        ? "Google Calendar connected"
        : "Google Calendar not connected",
    },
  ];

  function finish() {
    startTransition(async () => {
      const result = await completeOnboarding();
      if (!result.ok) {
        notify("bad", "Could not finish", result.message ?? "Try again.");
        return;
      }
      router.push("/dashboard");
    });
  }

  return (
    <StepCard
      title="You are ready"
      blurb="Share your link and let people pick a time that works for both of you."
      actions={
        <>
          <Button size="2xl" loading={pending} onClick={finish}>
            Go to dashboard
          </Button>
          <Link
            href={`/${username}`}
            className={buttonClass({ variant: "ghost", size: "2xl" })}
          >
            View booking page
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-[15px]">
        <div className="flex flex-col gap-[7px]">
          <Eyebrow>Your booking link</Eyebrow>
          <div className="flex h-[40px] items-center gap-[10px] rounded-[6px] border border-line-strong bg-fill pr-[6px] pl-[12px]">
            <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink">
              {bookingLink}
            </span>
            <CopyLinkChip link={bookingLink} />
          </div>
        </div>

        <div className="flex flex-col gap-[10px] rounded-[8px] border border-line px-[15px] py-[14px]">
          {summary.map((row) => (
            <div key={row.key} className="flex items-center gap-[10px]">
              <Icon
                name={row.ok ? "check" : "triangleExclamation"}
                weight={900}
                size={10}
                className={row.ok ? "w-[14px] text-accent" : "w-[14px] text-amber"}
              />
              <span className="text-[13px] text-ink-2">{row.text}</span>
            </div>
          ))}
        </div>

        {!connected ? (
          <div className="flex flex-wrap items-center gap-[12px] rounded-[8px] border border-amber-line bg-amber-soft px-[14px] py-[12px]">
            <Icon
              name="triangleExclamation"
              weight={900}
              size={13}
              className="text-amber"
            />
            <span className="min-w-[200px] flex-1 text-[12.5px] leading-[1.5] text-amber-ink">
              Connect Google Calendar before you share this link, so guests
              can&apos;t book over something you already have.
            </span>
            <RouteLink
              href="/api/google/connect?next=/onboarding/5"
              className="inline-flex h-[28px] flex-none items-center rounded-[6px] border border-amber-line bg-white/75 px-[10px] text-[12.5px] font-semibold text-amber-ink no-underline hover:bg-white hover:text-amber-ink"
            >
              Connect now
            </RouteLink>
          </div>
        ) : null}
      </div>
    </StepCard>
  );
}
