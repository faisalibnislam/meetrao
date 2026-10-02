import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppScreen } from "@/components/app/app-screen";
import { SettingsNav } from "@/components/app/settings-nav";
import { SETTINGS_TABS, type SettingsTab } from "@/lib/settings-tabs";
import {
  AccountPanel,
  BookingPanel,
  CalendarPanel,
  NotificationsPanel,
  ProfilePanel,
} from "@/components/app/settings-panels";
import { signOut } from "@/lib/actions/auth";
import { requireOnboardedSession } from "@/lib/data/session";
import { connectionStatus } from "@/lib/google/connection";
import { timezoneOptions } from "@/lib/timezones";
import { TeamPanel } from "@/components/app/team-panel";
import { DeveloperPanel } from "@/components/app/developer-panel";
import { BillingPanel } from "@/components/app/billing-panel";
import { BrandingPanel } from "@/components/app/branding-panel";
import { billingPanelData, brandingPanelData, developerPanelData, teamPanelData } from "@/lib/data/teams";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };

const FAILURES: Record<string, string> = {
  denied: "Google didn't confirm the permission. Try again and allow calendar access.",
  scope: "Calendar access was not granted in full. Reconnect and allow inviting guests.",
  state: "That connection attempt expired. Start it again from this page.",
  failed: "Google didn't complete the handshake. Try again in a moment.",
};

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tab?: string[] }>;
  searchParams: Promise<{ calendar?: string; welcome?: string }>;
}) {
  const { tab: segments } = await params;
  const { calendar, welcome } = await searchParams;

  const tab = (segments?.[0] ?? "profile") as SettingsTab;
  if (segments && segments.length > 1) notFound();
  if (!SETTINGS_TABS.some((t) => t.key === tab)) notFound();

  const session = await requireOnboardedSession();

  return (
    <AppScreen title="Settings">
      <div className="mx-auto grid w-full max-w-[780px] grid-cols-[158px_minmax(0,1fr)] items-start gap-[34px] max-[820px]:flex max-[820px]:flex-col max-[820px]:gap-[18px]">
        <SettingsNav current={tab} />

        <div className="flex min-w-0 max-w-[560px] flex-col gap-[20px]">
          {tab === "billing" ? (
          <BillingPanel {...(await billingPanelData())} welcome={welcome === "1"} />
        ) : null}
        {tab === "branding" ? (
          <BrandingPanel
            {...(await brandingPanelData())}
            username={session.profile.username}
            siteHost={new URL(siteUrl()).host}
          />
        ) : null}
        {tab === "developer" ? <DeveloperPanel {...(await developerPanelData())} siteUrl={siteUrl()} /> : null}
        {tab === "team" ? (
          <TeamPanel {...(await teamPanelData(session.profile.id))} siteUrl={siteUrl()} />
        ) : null}
        {tab === "profile" ? <ProfilePanel profile={session.profile} /> : null}

          {tab === "calendar" ? (
            <CalendarPanel
              {...(await connectionStatus(session.userId))}
              timezone={session.profile.timezone}
              timezones={timezoneOptions()}
              failure={calendar && calendar !== "connected" ? (FAILURES[calendar] ?? FAILURES.failed) : null}
            />
          ) : null}

          {tab === "booking" ? <BookingPanel profile={session.profile} /> : null}
          {tab === "notifications" ? <NotificationsPanel profile={session.profile} /> : null}

          {tab === "account" ? (
            <AccountPanel profile={session.profile} verified={session.verified} onSignOut={signOut} />
          ) : null}
        </div>
      </div>
    </AppScreen>
  );
}
