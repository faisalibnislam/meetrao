import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { ScheduleForm } from "@/components/app/schedule-form";
import { timeOptions } from "@/lib/booking/time";
import { requireOnboardedSession } from "@/lib/data/session";
import { supabaseServer } from "@/lib/supabase/server";
import { timezoneLabel } from "@/lib/timezones";

export const metadata: Metadata = { title: "Invite to Meet" };

export default async function NewBookingPage() {
  const { profile } = await requireOnboardedSession();
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("meeting_types")
    .select("id, name, duration_minutes")
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .order("created_at");

  // "One-off" first, because a host reaching for this screen usually has
  // something in mind that is not one of their published types.
  const meetingTypes = [
    { value: "", label: "One-off meeting" },
    ...(data ?? []).map((m) => ({ value: m.id, label: `${m.name} · ${m.duration_minutes} min` })),
  ];

  // The host's today, in their own zone — the date field must not open on
  // yesterday for anyone east of the server.
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: profile.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <AppScreen
      title="Invite to Meet"
      crumb={{ label: "Bookings", href: "/bookings" }}
      crumbCurrent="Invite"
      subtitle="Pick the time yourself and invite the people who should be there."
    >
      <ScheduleForm
        meetingTypes={meetingTypes}
        timeOptions={timeOptions()}
        timezoneLabel={timezoneLabel(profile.timezone)}
        today={today}
      />
    </AppScreen>
  );
}
