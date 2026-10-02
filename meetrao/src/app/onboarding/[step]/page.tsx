import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StepRail } from "@/components/onboarding/step-rail";
import { StepClaimLink } from "@/components/onboarding/step-claim-link";
import {
  StepAvailability,
  StepCalendar,
  StepFirstMeeting,
  StepReady,
} from "@/components/onboarding/steps";
import { rulesToDays, type Day } from "@/lib/availability";
import { signOut } from "@/lib/actions/auth";
import { ensureDefaultAvailability } from "@/lib/data/availability";
import { minutesToLabel } from "@/lib/booking/time";
import { requireSession } from "@/lib/data/session";
import { connectionStatus } from "@/lib/google/connection";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { timezoneOptions } from "@/lib/timezones";

export const metadata: Metadata = { title: "Set up Meetrao" };

const FAILURES: Record<string, string> = {
  denied: "Google didn't confirm the permission. Try again and allow calendar access.",
  scope: "Calendar access was not granted in full. Reconnect and allow inviting guests.",
  state: "That connection attempt expired. Start it again from this page.",
  failed: "Google didn't complete the handshake. Try again in a moment.",
};

export default async function OnboardingStep({
  params,
  searchParams,
}: {
  params: Promise<{ step: string }>;
  searchParams: Promise<{ calendar?: string }>;
}) {
  const { step: raw } = await params;
  const { calendar } = await searchParams;

  const step = Number(raw);
  if (!Number.isInteger(step) || step < 1 || step > 5) notFound();

  const session = await requireSession();
  // Onboarding is for setting up. Once it is done, this is the dashboard's job.
  if (session.profile.onboarding_completed_at) redirect("/dashboard");

  const convex = await convexServer();
  const name = session.profile.full_name || session.profile.username;

  return (
    <div className="box-border flex min-h-screen flex-col">
      <StepRail step={step} name={name} email={session.profile.email} onSignOut={signOut} />
      {await stepContent(step, session, convex, calendar)}
    </div>
  );
}

type Session = Awaited<ReturnType<typeof requireSession>>;
type Client = Awaited<ReturnType<typeof convexServer>>;

async function stepContent(step: number, session: Session, convex: Client, calendar?: string) {
  if (step === 1) {
    return <StepClaimLink initial={session.profile.username} />;
  }

  if (step === 2) {
    const status = await connectionStatus(session.userId);
    return (
      <StepCalendar
        connected={status.connected}
        accountEmail={status.accountEmail}
        failure={calendar && calendar !== "connected" ? (FAILURES[calendar] ?? FAILURES.failed) : null}
      />
    );
  }

  if (step === 3) {
    const data = await convex.query(api.profiles.firstMeeting, {});

    return (
      <StepFirstMeeting
        initialName={data?.name ?? ""}
        initialDescription={data?.description ?? ""}
        initialDuration={data?.duration_minutes ?? session.profile.default_duration_minutes}
      />
    );
  }

  if (step === 4) {
    // The design's default week is seeded the first time this step is opened,
    // so the host edits a sensible schedule rather than an empty one. Through
    // the service role, and never fatal — see the helper.
    await ensureDefaultAvailability(session.userId);

    // Onboarding edits the default schedule. A new host has exactly one, and
    // naming schedules is not a step-4 concern — the Availability screen is
    // where a host adds more.
    const defaultSchedule = (await convex.query(api.availability.listSchedules, {}))[0] ?? null;

    const data = defaultSchedule
      ? await convex.query(api.availability.listRules, { scheduleId: defaultSchedule.id })
      : [];

    return (
      <StepAvailability
        scheduleId={defaultSchedule?.id ?? ""}
        initialDays={rulesToDays(data ?? [])}
        initialTimezone={session.profile.timezone}
        timezones={timezoneOptions()}
        detected={session.profile.timezone !== "UTC"}
      />
    );
  }

  const [meeting, screen, status] = await Promise.all([
    convex.query(api.profiles.firstMeeting, {}),
    convex.query(api.availability.screen, {}),
    connectionStatus(session.userId),
  ]);

  const days: Day[] = rulesToDays(screen.rules);
  const open = days.filter((d) => d.on);

  return (
    <StepReady
      username={session.profile.username}
      meetingName={meeting?.name ?? "Your first meeting"}
      duration={meeting?.duration_minutes ?? session.profile.default_duration_minutes}
      openDays={open.length}
      firstStart={open.length ? minutesToLabel(open[0].ranges[0].start) : "–"}
      connected={status.connected}
    />
  );
}
