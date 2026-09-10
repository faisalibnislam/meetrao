import { AppScreen } from "@/components/app/app-screen";
import { BodySkeleton, RowsSkeleton } from "@/components/app/skeleton";

export default function Loading() {
  return (
    <AppScreen title="Notifications" subtitle="Everything that happened while you were away.">
      <BodySkeleton>
        <RowsSkeleton rows={6} />
      </BodySkeleton>
    </AppScreen>
  );
}
