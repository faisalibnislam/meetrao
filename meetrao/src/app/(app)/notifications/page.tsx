import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { NotificationsScreen } from "@/components/app/notifications-screen";
import { listNotifications } from "@/lib/data/notifications";
import { requireOnboardedSession } from "@/lib/data/session";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { userId } = await requireOnboardedSession();
  const notifications = await listNotifications(userId);

  return (
    <AppScreen title="Notifications" subtitle="Everything that happened while you were away.">
      <NotificationsScreen notifications={notifications} />
    </AppScreen>
  );
}
