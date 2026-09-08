import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppScreen } from "@/components/app/app-screen";
import { SettingsNav, SETTINGS_TABS, type SettingsTab } from "@/components/app/settings-nav";
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
  searchParams: Promise<{ calendar?: string }>;
}) {
  const { tab: segments } = await params;
  const { calendar } = await searchParams;

  const tab = (segments?.[0] ?? "profile") as SettingsTab;
  if (segments && segments.length > 1) notFound();
  if (!SETTINGS_TABS.some((t) => t.key === tab)) notFound();

  const session = await requireOnboardedSession();

  return (
    <AppScreen title="Settings">
      <div className="mx-auto grid w-full max-w-[780px] grid-cols-[158px_minmax(0,1fr)] items-start gap-[34px] max-[820px]:flex max-[820px]:flex-col max-[820px]:gap-[18px]">
        <SettingsNav current={tab} />

        <div className="flex min-w-0 max-w-[560px] flex-col gap-[20px]">
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
