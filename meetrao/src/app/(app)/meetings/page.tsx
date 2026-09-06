import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { CopyLinkButton } from "@/components/app/copy-link";
import { MeetingsTable } from "@/components/app/meetings-table";
import { buttonClass } from "@/components/ui/button-style";
import { EmptyState } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icon";
import { getMeetingTypes, requireProfile } from "@/lib/data/host";
import { bookingLink } from "@/lib/env";

export const metadata: Metadata = { title: "Meetings" };

export default async function MeetingsPage() {
  const profile = await requireProfile();
  const types = await getMeetingTypes();
  const active = types.filter((t) => t.is_active);

  return (
    <>
      <PageHeader
        title="Meetings"
        subtitle="What guests can book from your link."
        actions={
          <>
            <CopyLinkButton
              allLink={bookingLink(profile.username)}
              targets={active.map((t) => ({
                id: t.id,
                name: t.name,
                link: bookingLink(profile.username, t.slug),
              }))}
            />
            <Link href="/meetings/new" className={buttonClass()}>
              <Icon name="plus" size={11} />
              New meeting
            </Link>
          </>
        }
      />
      <PageBody>
        {types.length > 0 ? (
          <MeetingsTable
            meetings={types.map((t) => ({
              id: t.id,
              name: t.name,
              description: t.description,
              durationMinutes: t.duration_minutes,
              slug: t.slug,
              link: bookingLink(profile.username, t.slug),
              isActive: t.is_active,
              previewHref: `/${profile.username}/${t.slug}`,
            }))}
          />
        ) : (
          <EmptyState
            title="No meetings yet"
            body="Create one so guests have something to book from your link."
            action={
              <Link href="/meetings/new" className={buttonClass({ size: "md" })}>
                <Icon name="plus" size={10} />
                Create meeting
              </Link>
            }
          />
        )}
      </PageBody>
    </>
  );
}
