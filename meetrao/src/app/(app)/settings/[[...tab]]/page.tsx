import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { SettingsNav } from "@/components/app/settings-nav";
import { SETTINGS_TABS, type SettingsTab } from "@/lib/settings-tabs";
import {
  AccountPanel,
  BookingPanel,
  CalendarPanel,
  ProfilePanel,
} from "@/components/app/settings-panels";
import { requireProfile } from "@/lib/data/host";
import { getConnectionSummary } from "@/lib/google/calendar";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };

const VALID: ReadonlySet<string> = new Set(SETTINGS_TABS.map((t) => t.slug));

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ tab?: string[] }>;
}) {
  const { tab } = await params;

  if (tab && tab.length > 1) notFound();
  const current = (tab?.[0] ?? "profile") as SettingsTab;
  if (!VALID.has(current)) notFound();

  const profile = await requireProfile();

  return (
    <>
      <PageHeader title="Settings" />
      <PageBody>
        <div className="mx-auto flex w-full max-w-[780px] flex-col gap-[18px] md:grid md:grid-cols-[158px_minmax(0,1fr)] md:items-start md:gap-[34px]">
          <SettingsNav />

          <div className="flex min-w-0 max-w-[560px] flex-col gap-[20px]">
            {current === "profile" ? (
              <ProfilePanel
                bookingHost={publicEnv.bookingHost}
                avatarUrl={profile.avatar_url}
                initial={{
                  fullName: profile.full_name,
                  jobTitle: profile.job_title,
                  email: profile.email,
                  username: profile.username,
                }}
              />
            ) : null}

            {current === "calendar" ? (
              <CalendarSettings
                userId={profile.id}
                timezone={profile.timezone}
              />
            ) : null}

            {current === "booking" ? (
              <BookingPanel
                durationMinutes={profile.default_duration_minutes}
                noticeMinutes={profile.default_notice_minutes}
              />
            ) : null}

            {current === "account" ? <AccountPanel /> : null}
          </div>
        </div>
      </PageBody>
    </>
  );
}

async function CalendarSettings({
  userId,
  timezone,
}: {
  userId: string;
  timezone: string;
}) {
  const { connected, accountEmail } = await getConnectionSummary(userId);
  return (
    <CalendarPanel
      connected={connected}
      accountEmail={accountEmail}
      timezone={timezone}
    />
  );
}
