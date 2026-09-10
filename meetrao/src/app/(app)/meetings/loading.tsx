import { AppScreen } from "@/components/app/app-screen";
import { BodySkeleton, RowsSkeleton } from "@/components/app/skeleton";

export default function Loading() {
  return (
    <AppScreen title="Meetings" subtitle="What guests can book from your link.">
      <BodySkeleton>
        <RowsSkeleton rows={4} />
      </BodySkeleton>
    </AppScreen>
  );
}
