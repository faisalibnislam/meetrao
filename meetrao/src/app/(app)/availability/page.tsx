import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { AvailabilityScreen } from "@/components/app/availability-screen";
import { rulesToDays, type ScheduleView } from "@/lib/availability";
import { ensureDefaultAvailability } from "@/lib/data/availability";
import { requireOnboardedSession } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { timezoneOptions } from "@/lib/timezones";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const { profile } = await requireOnboardedSession();

  // Idempotent, and it is what guarantees the invariant the whole screen rests
  // on: a host always has at least one schedule. An account created before
  // migration 0010 was backfilled; one created after is seeded here.
  await ensureDefaultAvailability(profile.id);

  const convex = await convexServer();
  const { schedules: scheduleRows, rules, meetings } = await convex.query(api.availability.screen, {});

  const defaultId = scheduleRows.find((s) => s.is_default)?.id ?? null;

  const schedules: ScheduleView[] = scheduleRows.map((s) => ({
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
