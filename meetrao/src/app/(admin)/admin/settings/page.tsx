import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { AdminSettingsForm } from "@/components/admin/admin-settings";
import { BillingProducts } from "@/components/admin/billing-products";
import { HeldLinks } from "@/components/admin/held-links";
import { signOut } from "@/lib/actions/auth";
import { listHeldBookingLinks } from "@/lib/actions/admin";
import { siteUrl } from "@/lib/env";
import { requireAdmin } from "@/lib/data/session";
import { convexServer } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import type { PlatformSettings } from "@/lib/types";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Admin settings" };

export default async function AdminSettingsPage() {
  const { profile } = await requireAdmin();
  const convex = await convexServer();
  const settings = (await convex.query(api.platformSettings.getForApp, {})) as PlatformSettings | null;
  const held = await listHeldBookingLinks();
  const products = await convex.query(api.platformSettings.products, {});
  // Shown as the host alone — an admin scanning a list wants to recognise the
  // link, not read https:// twelve times.
  const siteHost = siteUrl().replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <AppScreen title="Settings">
      <AdminSettingsForm
        appName={settings?.app_name ?? "Meetrao"}
        supportEmail={settings?.support_email ?? ""}
        adminName={profile.full_name || profile.username}
        adminEmail={profile.email}
        onSignOut={signOut}
      />
      <BillingProducts
        monthly={products.monthly}
        yearly={products.yearly}
        tokenConfigured={Boolean(env().POLAR_ACCESS_TOKEN)}
      />

      <div className="mx-auto flex w-full max-w-[560px] flex-col">
        <HeldLinks links={held} siteHost={siteHost} />
      </div>
    </AppScreen>
  );
}
