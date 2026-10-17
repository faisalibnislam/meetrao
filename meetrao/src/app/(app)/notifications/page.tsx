import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { NotificationsScreen } from "@/components/app/notifications-screen";
import { listNotifications } from "@/lib/data/notifications";
import { requireOnboardedSession } from "@/lib/data/session";
import { activeContext } from "@/lib/data/context";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { userId } = await requireOnboardedSession();
  const [notifications, context] = await Promise.all([listNotifications(userId), activeContext()]);

  return (
    <AppScreen title="Notifications" subtitle="Everything that happened while you were away.">
      <NotificationsScreen notifications={notifications} here={context.companyId} />
    </AppScreen>
  );
}
