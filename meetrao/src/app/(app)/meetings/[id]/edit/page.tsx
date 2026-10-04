import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppScreen } from "@/components/app/app-screen";
import { MeetingForm } from "@/components/app/meeting-form";
import { requireOnboardedSession } from "@/lib/data/session";
import { scheduleOptions } from "@/lib/data/schedules";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import type { MeetingType } from "@/lib/types";
import { isProNow } from "@/lib/data/teams";

export const metadata: Metadata = { title: "Edit meeting" };

export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireOnboardedSession();
  const convex = await convexServer();
  // Scoped by the caller's own identity inside the query, an id belonging to
  // another host comes back null rather than someone else's meeting. The
  // plan and the schedules are read beside it; they were awaited one after
  // the other inside the JSX.
  const [data, pro, schedules] = await Promise.all([
    convex.query(api.meetingTypes.getOwn, { id }),
    isProNow(),
    scheduleOptions(profile.id),
  ]);

  if (!data) notFound();
  const meeting = data as MeetingType;

  return (
    <AppScreen title="Edit meeting" crumb={{ label: "Meetings", href: "/meetings" }} crumbCurrent="Edit">
      <MeetingForm
        pro={pro}
        schedules={schedules}
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
          questions: meeting.questions ?? [],
          capacity: meeting.capacity ?? 1,
          location: meeting.location,
          locationDetail: meeting.location_detail ?? "",
        }}
      />
    </AppScreen>
  );
}
