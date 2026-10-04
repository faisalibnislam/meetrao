import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { AvailabilityScreen } from "@/components/app/availability-screen";
import { rulesToDays, type ScheduleView, type TimeOffView } from "@/lib/availability";
import { ensureDefaultAvailability } from "@/lib/data/availability";
import { requireOnboardedSession } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { timezoneOptions } from "@/lib/timezones";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const { profile } = await requireOnboardedSession();

  const convex = await convexServer();
  let screen = await convex.query(api.availability.screen, {});

  /* The invariant the whole screen rests on: a host always has at least one
     schedule. Seeding guarantees it, and is idempotent, but it is a write and
     a whole round trip, and it used to run before the read on every visit.
     Reading first means it runs only for the host who actually has none. */
  if (screen.schedules.length === 0 && (await ensureDefaultAvailability(profile.id))) {
    screen = await convex.query(api.availability.screen, {});
  }
  const { schedules: scheduleRows, rules, meetings, overrides } = screen;

  const defaultId = scheduleRows.find((s) => s.is_default)?.id ?? null;

  const schedules: ScheduleView[] = scheduleRows.map((s) => ({
    id: s.id,
    name: s.name,
    isDefault: s.is_default,
    days: rulesToDays(rules.filter((r) => r.schedule_id === s.id)),
    // A meeting with no schedule of its own follows the default, so the default
    // has to claim it too, otherwise the busiest schedule looks unused.
    usedBy: meetings.filter((m) => m.schedule_id === s.id || (m.schedule_id === null && s.id === defaultId)).map((m) => m.name),
  }));

  const timeOff: TimeOffView[] = overrides.map((o) => ({
    id: o.id,
    scheduleId: o.schedule_id,
    date: o.date,
    ranges: o.ranges.map((r) => ({ start: r.start_minute, end: r.end_minute })),
    note: o.note,
  }));

  return (
    <AppScreen title="Availability" subtitle="When people can book you.">
      <AvailabilityScreen
        initialSchedules={schedules}
        initialTimeOff={timeOff}
        initialTimezone={profile.timezone}
        timezones={timezoneOptions()}
      />
    </AppScreen>
  );
}
