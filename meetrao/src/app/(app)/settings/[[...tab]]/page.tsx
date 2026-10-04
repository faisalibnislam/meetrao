import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppScreen } from "@/components/app/app-screen";
import { SettingsNav } from "@/components/app/settings-nav";
import { SETTINGS_TABS, defaultTab, tabsFor, type SettingsTab } from "@/lib/settings-tabs";
import { activeContext } from "@/lib/data/context";
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
import { TeamPitch } from "@/components/app/team-pitch";
import { DeveloperPanel } from "@/components/app/developer-panel";
import { BillingPanel } from "@/components/app/billing-panel";
import { BrandingPanel } from "@/components/app/branding-panel";
import { CompaniesPanel } from "@/components/app/companies-panel";
import {
  billingPanelData,
  brandingPanelData,
  companiesPanelData,
  developerPanelData,
  soloCompany,
  teamPanelData,
} from "@/lib/data/teams";
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

  const session = await requireOnboardedSession();

  /* Which panels exist depends on the workspace. In a company you are editing
     that company's brand, domain and people; in Personal you are editing your
     own profile, calendar and account. */
  const context = await activeContext();
  const tabs = tabsFor(context.companyId);

  const tab = (segments?.[0] ?? defaultTab(context.companyId)) as SettingsTab;
  if (segments && segments.length > 1) notFound();
  if (!SETTINGS_TABS.some((t) => t.key === tab)) notFound();

  /* A tab that exists but belongs to the other workspace sends you to that
     workspace's first panel rather than 404ing. Somebody following a bookmark
     to /settings/branding while in Personal has asked a reasonable question;
     the answer is just that branding lives in a company now. */
  if (!tabs.some((t) => t.key === tab)) redirect(`/settings/${defaultTab(context.companyId)}`);

  return (
    <AppScreen title="Settings">
      <div className="mx-auto grid w-full max-w-[780px] grid-cols-[158px_minmax(0,1fr)] items-start gap-[34px] max-[820px]:flex max-[820px]:flex-col max-[820px]:gap-[18px]">
        <SettingsNav current={tab} tabs={tabs} />

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
        {tab === "companies" ? <CompaniesPanel {...(await companiesPanelData())} /> : null}
        {tab === "people" ? <CompaniesPanel {...(await companiesPanelData())} only={context.companyId} /> : null}
        {tab === "developer" ? <DeveloperPanel {...(await developerPanelData())} siteUrl={siteUrl()} /> : null}
        {/* A team link is answered by whoever of you is free, so it needs a
            second person to be anything at all. A company that can hold one
            cannot have one, and the useful thing to show is the reason. */}
        {tab === "team" ? (
          (await soloCompany(context.companyId)) ? (
            <TeamPitch />
          ) : (
            <TeamPanel {...(await teamPanelData(session.profile.id))} siteUrl={siteUrl()} />
          )
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
