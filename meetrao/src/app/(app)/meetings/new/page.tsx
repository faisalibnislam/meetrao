import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import {
  MeetingForm,
  defaultMeetingValues,
} from "@/components/app/meeting-form";
import { requireProfile } from "@/lib/data/host";

export const metadata: Metadata = { title: "New meeting" };

export default async function NewMeetingPage() {
  const profile = await requireProfile();

  return (
    <>
      <PageHeader
        title="New meeting"
        crumb={{ href: "/meetings", label: "Meetings", current: "New" }}
      />
      <PageBody>
        <MeetingForm
          initial={defaultMeetingValues({
            durationMinutes: profile.default_duration_minutes,
            minimumNoticeMinutes: profile.default_notice_minutes,
          })}
        />
      </PageBody>
    </>
  );
}
