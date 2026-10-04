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
import { activeContext } from "@/lib/data/context";
import { heldElsewhere } from "@/lib/data/elsewhere";
import { ElsewhereEmptyState } from "@/components/app/elsewhere-empty";

export const metadata: Metadata = { title: "Meetings" };

export default async function MeetingsPage() {
  const { profile } = await requireOnboardedSession();
  const convex = await convexServer();
  const all = (await convex.query(api.meetingTypes.listOwn, {})) as unknown as MeetingType[];

  /* Only the meetings belonging to the context in force. Showing all of them
     under a company heading would make it look as though a personal meeting
     is published on that company's domain, which is the one thing company
     scoping exists to make false. */
  const context = await activeContext();
  const meetings = all.filter((m) => (m.company_id ?? null) === context.companyId);

  /* Only when there is nothing to show. "No meetings yet" is a confident
     claim that somebody has none, and for a host whose meetings all belong to
     their company it is false in the most alarming way available: it looks
     exactly like the meetings have been deleted. Costs one extra query, paid
     only on the screen that would otherwise mislead. */
  const elsewhere = meetings.length === 0 ? await heldElsewhere(all, context) : [];

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
      ) : elsewhere.length ? (
        <ElsewhereEmptyState
          here={context.name}
          what="meeting"
          found={elsewhere}
          action={
            <ButtonLink variant="secondary" size={30} href="/meetings/new" icon="plus">
              Create one here
            </ButtonLink>
          }
        />
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
