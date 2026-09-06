import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { AvailabilityScreen } from "@/components/app/availability-screen";
import { getAvailability, requireProfile } from "@/lib/data/host";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const profile = await requireProfile();
  const rules = await getAvailability();

  return (
    <>
      <PageHeader
        title="Availability"
        subtitle="When people can book you."
      />
      <PageBody>
        <AvailabilityScreen timezone={profile.timezone} rules={rules} />
      </PageBody>
    </>
  );
}
