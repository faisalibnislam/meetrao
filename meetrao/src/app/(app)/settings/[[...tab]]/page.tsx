import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { SettingsNav } from "@/components/app/settings-nav";
import { SETTINGS_TABS, type SettingsTab } from "@/lib/settings-tabs";
import {
  AccountPanel,
  BookingPanel,
  CalendarPanel,
  NotificationsPanel,
  ProfilePanel,
} from "@/components/app/settings-panels";
import { requireProfile } from "@/lib/data/host";
import { getConnectionSummary } from "@/lib/google/calendar";
import { publicEnv } from "@/lib/env";
import { calendarFailure, calendarUnconfigured } from "@/lib/google/failure";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Settings" };

const VALID: ReadonlySet<string> = new Set(SETTINGS_TABS.map((t) => t.slug));

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tab?: string[] }>;
  searchParams: Promise<{ calendar?: string; reason?: string }>;
}) {
  const { tab } = await params;
  const { calendar, reason } = await searchParams;

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
                status={calendar}
                reason={reason}
              />
            ) : null}

            {current === "booking" ? (
              <BookingPanel
                durationMinutes={profile.default_duration_minutes}
                noticeMinutes={profile.default_notice_minutes}
              />
            ) : null}

            {current === "notifications" ? (
              <NotificationsPanel
                initial={{
                  newBooking: profile.notify_new_booking,
                  bookingChanged: profile.notify_booking_changed,
                  bookingCancelled: profile.notify_booking_cancelled,
                  dailyAgenda: profile.notify_daily_agenda,
                  productNews: profile.notify_product_news,
                }}
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
  status,
  reason,
}: {
  userId: string;
  timezone: string;
  status?: string;
  reason?: string;
}) {
  const { connected, accountEmail } = await getConnectionSummary(userId);
  // /api/google/callback returns here by default, so this is where most
  // connection failures actually land.
  const failure = calendarFailure(status, reason);
  const unconfigured =
    status === "unconfigured" ? calendarUnconfigured(reason) : null;
  return (
    <>
      {unconfigured ? (
        <div className="flex gap-[11px] rounded-[8px] border border-amber-line bg-amber-soft px-[14px] py-[12px]">
          <Icon
            name="triangleExclamation"
            weight={900}
            size={13}
            className="mt-[2px] text-amber"
          />
          <span className="text-[12.5px] leading-[1.5] text-amber-ink">
            {unconfigured}
          </span>
        </div>
      ) : null}
      {failure ? (
        <div className="flex gap-[11px] rounded-[8px] border border-red-line bg-red-soft px-[14px] py-[12px]">
          <Icon
            name="circleExclamation"
            weight={900}
            size={13}
            className="mt-[2px] text-red"
          />
          <div className="flex flex-col gap-[3px]">
            <span className="text-[13px] font-semibold text-red">
              {failure.title}
            </span>
            <span className="text-[12.5px] leading-[1.5] text-red-ink">
              {failure.body}
            </span>
          </div>
        </div>
      ) : null}
      <CalendarPanel
        connected={connected}
        accountEmail={accountEmail}
        timezone={timezone}
      />
    </>
  );
}
