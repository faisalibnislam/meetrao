import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { AvailabilityScreen } from "@/components/app/availability-screen";
import { rulesToDays, type ScheduleView } from "@/lib/availability";
import { ensureDefaultAvailability } from "@/lib/data/availability";
import { requireOnboardedSession } from "@/lib/data/session";
import { supabaseServer } from "@/lib/supabase/server";
import { timezoneOptions } from "@/lib/timezones";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const { profile } = await requireOnboardedSession();

  // Idempotent, and it is what guarantees the invariant the whole screen rests
  // on: a host always has at least one schedule. An account created before
  // migration 0010 was backfilled; one created after is seeded here.
  await ensureDefaultAvailability(profile.id);

  const supabase = await supabaseServer();

  const [{ data: scheduleRows }, { data: ruleRows }, { data: meetingRows }] = await Promise.all([
    supabase
      .from("availability_schedules")
      .select("id, name, is_default, created_at")
      .eq("user_id", profile.id)
      .order("is_default", { ascending: false })
      .order("created_at"),
    supabase
      .from("availability_rules")
      .select("schedule_id, weekday, start_minute, end_minute")
      .eq("user_id", profile.id),
    supabase.from("meeting_types").select("name, schedule_id").eq("user_id", profile.id).order("created_at"),
  ]);

  const rules = ruleRows ?? [];
  const meetings = meetingRows ?? [];
  const defaultId = (scheduleRows ?? []).find((s) => s.is_default)?.id ?? null;

  const schedules: ScheduleView[] = (scheduleRows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    isDefault: s.is_default,
    days: rulesToDays(rules.filter((r) => r.schedule_id === s.id)),
    // A meeting with no schedule of its own follows the default, so the default
    // has to claim it too — otherwise the busiest schedule looks unused.
    usedBy: meetings.filter((m) => m.schedule_id === s.id || (m.schedule_id === null && s.id === defaultId)).map((m) => m.name),
  }));

  return (
    <AppScreen title="Availability" subtitle="When people can book you.">
      <AvailabilityScreen
        initialSchedules={schedules}
        initialTimezone={profile.timezone}
        timezones={timezoneOptions()}
      />
    </AppScreen>
  );
}
