import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { AvailabilityScreen } from "@/components/app/availability-screen";
import { rulesToDays } from "@/components/app/availability-editor";
import { requireOnboardedSession } from "@/lib/data/session";
import { supabaseServer } from "@/lib/supabase/server";
import { timezoneOptions } from "@/lib/timezones";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const { profile } = await requireOnboardedSession();
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("availability_rules")
    .select("weekday, start_minute, end_minute")
    .eq("user_id", profile.id);

  return (
    <AppScreen title="Availability" subtitle="When people can book you.">
      <AvailabilityScreen
        initialDays={rulesToDays(data ?? [])}
        initialTimezone={profile.timezone}
        timezones={timezoneOptions()}
      />
    </AppScreen>
  );
}
