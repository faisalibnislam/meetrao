import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { MeetingForm } from "@/components/app/meeting-form";
import { requireOnboardedSession } from "@/lib/data/session";
import { scheduleOptions } from "@/lib/data/schedules";

export const metadata: Metadata = { title: "New meeting" };

export default async function NewMeetingPage() {
  const { profile } = await requireOnboardedSession();

  return (
    <AppScreen title="New meeting" crumb={{ label: "Meetings", href: "/meetings" }} crumbCurrent="New">
      <MeetingForm
        schedules={await scheduleOptions(profile.id)}
        initial={{
          name: "",
          description: "",
          // The booking defaults from Settings apply to every new meeting.
          duration: profile.default_duration_minutes,
          buffer: 0,
          notice: profile.default_notice_minutes,
          window: 30,
          active: true,
          scheduleId: null,
          questions: [],
          capacity: 1,
          location: "google_meet",
          locationDetail: "",
        }}
      />
    </AppScreen>
  );
}
