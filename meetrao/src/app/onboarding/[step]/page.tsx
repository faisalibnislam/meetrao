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
import { supabaseServer } from "@/lib/supabase/server";
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

  const supabase = await supabaseServer();
  const name = session.profile.full_name || session.profile.username;

  return (
    <div className="box-border flex min-h-screen flex-col">
      <StepRail step={step} name={name} email={session.profile.email} onSignOut={signOut} />
      {await stepContent(step, session, supabase, calendar)}
    </div>
  );
}

type Session = Awaited<ReturnType<typeof requireSession>>;
type Client = Awaited<ReturnType<typeof supabaseServer>>;

async function stepContent(step: number, session: Session, supabase: Client, calendar?: string) {
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
    const { data } = await supabase
      .from("meeting_types")
      .select("name, description, duration_minutes")
      .eq("user_id", session.userId)
      .order("created_at")
      .limit(1)
      .maybeSingle();

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

    const { data } = await supabase
      .from("availability_rules")
      .select("weekday, start_minute, end_minute")
      .eq("user_id", session.userId);

    return (
      <StepAvailability
        initialDays={rulesToDays(data ?? [])}
        initialTimezone={session.profile.timezone}
        timezones={timezoneOptions()}
        detected={session.profile.timezone !== "UTC"}
      />
    );
  }

  const [{ data: meeting }, { data: rules }, status] = await Promise.all([
    supabase
      .from("meeting_types")
      .select("name, duration_minutes")
      .eq("user_id", session.userId)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    supabase.from("availability_rules").select("weekday, start_minute, end_minute").eq("user_id", session.userId),
    connectionStatus(session.userId),
  ]);

  const days: Day[] = rulesToDays(rules ?? []);
  const open = days.filter((d) => d.on);

  return (
    <StepReady
      username={session.profile.username}
      meetingName={meeting?.name ?? "Your first meeting"}
      duration={meeting?.duration_minutes ?? session.profile.default_duration_minutes}
      openDays={open.length}
      firstStart={open.length ? minutesToLabel(open[0].ranges[0].start) : "—"}
      connected={status.connected}
    />
  );
}
