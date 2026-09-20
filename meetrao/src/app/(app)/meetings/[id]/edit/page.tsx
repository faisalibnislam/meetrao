import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppScreen } from "@/components/app/app-screen";
import { MeetingForm } from "@/components/app/meeting-form";
import { requireOnboardedSession } from "@/lib/data/session";
import { scheduleOptions } from "@/lib/data/schedules";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import type { MeetingType } from "@/lib/types";

export const metadata: Metadata = { title: "Edit meeting" };

export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireOnboardedSession();
  const convex = await convexServer();
  // Scoped by the caller's own identity inside the query — an id belonging to
  // another host comes back null rather than someone else's meeting.
  const data = await convex.query(api.meetingTypes.getOwn, { id });

  if (!data) notFound();
  const meeting = data as MeetingType;

  return (
    <AppScreen title="Edit meeting" crumb={{ label: "Meetings", href: "/meetings" }} crumbCurrent="Edit">
      <MeetingForm
        schedules={await scheduleOptions(profile.id)}
        initial={{
          id: meeting.id,
          name: meeting.name,
          description: meeting.description,
          duration: meeting.duration_minutes,
          buffer: meeting.buffer_minutes,
          notice: meeting.minimum_notice_minutes,
          window: meeting.booking_window_days,
          active: meeting.is_active,
          scheduleId: meeting.schedule_id,
        }}
      />
    </AppScreen>
  );
}
