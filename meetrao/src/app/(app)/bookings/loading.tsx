import { AppScreen } from "@/components/app/app-screen";
import { BodySkeleton, RowsSkeleton, TabsSkeleton } from "@/components/app/skeleton";

/* Real header, shimmering body — see components/app/skeleton.tsx. The title and
   subtitle are the same strings page.tsx renders, so nothing here moves when
   the bookings arrive. */
export default function Loading() {
  return (
    <AppScreen
      title="Bookings"
      subtitle="Everyone who has booked time with you, and everything you scheduled yourself."
    >
      <BodySkeleton>
        <TabsSkeleton />
        <RowsSkeleton rows={5} grouped />
      </BodySkeleton>
    </AppScreen>
  );
}
