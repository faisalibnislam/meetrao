import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { AnalyticsScreen } from "@/components/admin/analytics-screen";
import { parseRange, siteAnalytics } from "@/lib/data/analytics";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string | string[] }>;
}) {
  /* The period lives in the URL. parseRange coerces anything else to 30 rather
     than throwing: ?days=9999 is a link somebody typed, not an attack, and a
     404 for it would be pedantry. The database clamps its own inputs too. */
  const range = parseRange((await searchParams).days);
  const data = await siteAnalytics(range);

  return (
    <AppScreen title="Analytics" subtitle="Who visits meetrao.com, and on what.">
      <AnalyticsScreen data={data} />
    </AppScreen>
  );
}
