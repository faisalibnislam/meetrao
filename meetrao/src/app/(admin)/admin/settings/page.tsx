import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { AdminSettingsForm } from "@/components/admin/admin-settings";
import { requireAdmin } from "@/lib/data/host";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · Settings" };

export default async function AdminSettingsPage() {
  const profile = await requireAdmin();

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("app_name, support_email")
    .eq("id", true)
    .maybeSingle();

  return (
    <>
      <PageHeader title="Settings" />
      <PageBody>
        <AdminSettingsForm
          platform={{
            appName: settings?.app_name ?? "Meetrao",
            supportEmail: settings?.support_email ?? "support@meetrao.com",
          }}
          account={{
            fullName: profile.full_name,
            email: profile.email,
          }}
        />
      </PageBody>
    </>
  );
}
