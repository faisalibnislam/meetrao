import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { MeetingForm } from "@/components/app/meeting-form";
import { requireOnboardedSession } from "@/lib/data/session";
import { scheduleOptions } from "@/lib/data/schedules";
import { isProNow } from "@/lib/data/teams";
import { ownMeetings } from "@/lib/data/own";
import { activeContext, contextChoices } from "@/lib/data/context";
import { connectionStatus } from "@/lib/google/connection";
import { meetingAddress } from "../meeting-address";

export const metadata: Metadata = { title: "New meeting" };

export default async function NewMeetingPage() {
  const { profile } = await requireOnboardedSession();
  /* All at once: the Link field needs the host's other meetings (to say a
     slug is taken before Save) and the workspace (for the address in front
     of it), and the Meet warning needs the calendar connection. */
  const [pro, schedules, meetings, context, choices, calendar] = await Promise.all([
    isProNow(),
    scheduleOptions(profile.id),
    ownMeetings(),
    activeContext(),
    contextChoices(),
    connectionStatus(profile.id),
  ]);

  // A new meeting is filed under the workspace in force, so its address is that one's.
  const here = choices.find((c) => c.id === context.companyId) ?? null;
  const { prefix } = meetingAddress(here, profile.username);

  return (
    <AppScreen title="New meeting" crumb={{ label: "Meetings", href: "/meetings" }} crumbCurrent="New">
      <MeetingForm
        pro={pro}
        schedules={schedules}
        linkPrefix={prefix}
        siblings={meetings.map((m) => ({ id: m.id, name: m.name, slug: m.slug, previous_slugs: m.previous_slugs ?? [] }))}
        google={{ connected: calendar.connected, needsReconnect: calendar.needsReconnect }}
        initial={{
          name: "",
          slug: "",
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
