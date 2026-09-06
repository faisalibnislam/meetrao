import { redirect } from "next/navigation";
import { Sidebar, HOST_NAV } from "@/components/app/sidebar";
import {
  getBookings,
  partitionBookings,
  requireProfile,
} from "@/lib/data/host";
import { initialsOf } from "@/lib/initials";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  // A host who has not finished setup lands back in it — the design routes
  // signup straight into the five steps.
  if (!profile.onboarding_completed_at) redirect("/onboarding/1");

  const bookings = await getBookings();
  const { upcoming } = partitionBookings(bookings, new Date());
  const displayName = profile.full_name || profile.username;

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row md:items-stretch">
      <Sidebar
        items={HOST_NAV}
        isAdmin={false}
        name={displayName}
        email={profile.email}
        initials={initialsOf(displayName)}
        upcomingCount={upcoming.length}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-ground">
        {children}
      </div>
    </div>
  );
}
