import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { MeetingForm } from "@/components/app/meeting-form";
import { getMeetingTypes } from "@/lib/data/host";

export const metadata: Metadata = { title: "Edit meeting" };

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const types = await getMeetingTypes();
  const meeting = types.find((t) => t.id === id);
  if (!meeting) notFound();

  return (
    <>
      <PageHeader
        title="Edit meeting"
        crumb={{ href: "/meetings", label: "Meetings", current: "Edit" }}
      />
      <PageBody>
        <MeetingForm
          meetingId={meeting.id}
          initial={{
            name: meeting.name,
            description: meeting.description,
            durationMinutes: meeting.duration_minutes,
            bufferMinutes: meeting.buffer_minutes,
            minimumNoticeMinutes: meeting.minimum_notice_minutes,
            bookingWindowDays: meeting.booking_window_days,
            isActive: meeting.is_active,
          }}
        />
      </PageBody>
    </>
  );
}
