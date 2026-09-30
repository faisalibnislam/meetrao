import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { CopyLinkControl } from "@/components/app/copy-link";
import { MeetingsTable, type MeetingRow } from "@/components/app/meetings-table";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panels";
import { requireOnboardedSession } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { siteUrl } from "@/lib/env";
import { api } from "@/convex/_generated/api";
import { bookingLink } from "@/lib/username";
import type { MeetingType } from "@/lib/types";

export const metadata: Metadata = { title: "Meetings" };

export default async function MeetingsPage() {
  const { profile } = await requireOnboardedSession();
  const convex = await convexServer();
  const meetings = (await convex.query(api.meetingTypes.listOwn, {})) as unknown as MeetingType[];

  const rows: MeetingRow[] = meetings.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    duration: m.duration_minutes,
    slug: m.slug,
    active: m.is_active,
    link: bookingLink(profile.username, m.slug),
    previewHref: `/${profile.username}/${m.slug}`,
  }));

  return (
    <AppScreen
      title="Meetings"
      subtitle="What guests can book from your link."
      actions={
        <>
          <CopyLinkControl
            accountLink={bookingLink(profile.username)}
            meetings={rows
              .filter((r) => r.active)
              .map((r) => ({ id: r.id, name: r.name, link: r.link }))}
          />
          <ButtonLink variant="accent" size={32} href="/meetings/new" icon="plus">
            New meeting
          </ButtonLink>
        </>
      }
    >
      {rows.length ? (
        <MeetingsTable meetings={rows} siteUrl={siteUrl()} username={profile.username} />
      ) : (
        <EmptyState
          title="No meetings yet"
          text="Create one and its link becomes bookable straight away."
          action={
            <ButtonLink variant="accent" size={30} href="/meetings/new" icon="plus">
              Create meeting
            </ButtonLink>
          }
        />
      )}
    </AppScreen>
  );
}
