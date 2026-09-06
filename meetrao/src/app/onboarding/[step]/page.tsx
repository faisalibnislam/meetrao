import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  StepCalendar,
  StepHours,
  StepMeeting,
  StepReady,
  StepWelcome,
} from "@/components/onboarding/steps";
import { StepRail, TOTAL_STEPS } from "@/components/onboarding/step-rail";
import { getConnectionSummary } from "@/lib/google/calendar";
import { getAvailability, getMeetingTypes, requireProfile } from "@/lib/data/host";
import { bookingLink } from "@/lib/env";
import { minutesToLabel } from "@/lib/booking/slots";

export const metadata: Metadata = { title: "Set up your account" };

export default async function OnboardingStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ step: string }>;
  searchParams: Promise<{ calendar?: string; reason?: string }>;
}) {
  const { step: rawStep } = await params;
  const { calendar, reason } = await searchParams;

  const step = Number(rawStep);
  if (!Number.isInteger(step) || step < 1 || step > TOTAL_STEPS) notFound();

  const profile = await requireProfile();

  return (
    <>
      <StepRail step={step} />
      {step === 1 ? <StepWelcome /> : null}
      {step === 2 ? (
        <CalendarStep status={calendar} reason={reason} userId={profile.id} />
      ) : null}
      {step === 3 ? (
        <MeetingStep
          defaultDuration={profile.default_duration_minutes}
          defaultNotice={profile.default_notice_minutes}
        />
      ) : null}
      {step === 4 ? <HoursStep timezone={profile.timezone} /> : null}
      {step === 5 ? (
        <ReadyStep username={profile.username} userId={profile.id} />
      ) : null}
    </>
  );
}

async function CalendarStep({
  status,
  reason,
  userId,
}: {
  status?: string;
  reason?: string;
  userId: string;
}) {
  const { connected, accountEmail } = await getConnectionSummary(userId);
  return (
    <StepCalendar
      connected={connected}
      accountEmail={accountEmail}
      status={status}
      reason={reason}
    />
  );
}

async function MeetingStep({
  defaultDuration,
  defaultNotice,
}: {
  defaultDuration: number;
  defaultNotice: number;
}) {
  const types = await getMeetingTypes();
  const first = types[0];

  return (
    <StepMeeting
      existing={
        first
          ? {
              id: first.id,
              name: first.name,
              description: first.description,
              duration: first.duration_minutes,
            }
          : null
      }
      defaultDuration={defaultDuration}
      defaultNotice={defaultNotice}
    />
  );
}

async function HoursStep({ timezone }: { timezone: string }) {
  const rules = await getAvailability();
  return <StepHours timezone={timezone} rules={rules} />;
}

async function ReadyStep({
  username,
  userId,
}: {
  username: string;
  userId: string;
}) {
  const [types, rules, connection] = await Promise.all([
    getMeetingTypes(),
    getAvailability(),
    getConnectionSummary(userId),
  ]);

  const first = types[0];
  const openDays = new Set(rules.map((r) => r.weekday));
  const earliest = rules.length
    ? Math.min(...rules.map((r) => r.start_minute))
    : null;

  return (
    <StepReady
      username={username}
      bookingLink={bookingLink(username)}
      meetingSummary={
        first
          ? `${first.name} · ${first.duration_minutes} min`
          : "No meeting created yet"
      }
      daysSummary={
        openDays.size > 0 && earliest !== null
          ? `${openDays.size} ${openDays.size === 1 ? "day" : "days"} a week, from ${minutesToLabel(earliest)}`
          : "No hours set yet"
      }
      connected={connection.connected}
    />
  );
}
