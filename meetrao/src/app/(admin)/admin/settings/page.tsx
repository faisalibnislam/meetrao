import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { AdminSettingsForm } from "@/components/admin/admin-settings";
import { signOut } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import type { PlatformSettings } from "@/lib/types";

export const metadata: Metadata = { title: "Admin settings" };

export default async function AdminSettingsPage() {
  const { profile } = await requireAdmin();
  const convex = await convexServer();
  const settings = (await convex.query(api.platformSettings.getForApp, {})) as PlatformSettings | null;

  return (
    <AppScreen title="Settings">
      <AdminSettingsForm
        appName={settings?.app_name ?? "Meetrao"}
        supportEmail={settings?.support_email ?? ""}
        adminName={profile.full_name || profile.username}
        adminEmail={profile.email}
        onSignOut={signOut}
      />
    </AppScreen>
  );
}
