import { AppScreen } from "@/components/app/app-screen";
import { BodySkeleton, RowsSkeleton, TabsSkeleton } from "@/components/app/skeleton";

export default function Loading() {
  return (
    <AppScreen title="Contacts" subtitle="Everyone you have met through Meetrao, and anyone else you add.">
      <BodySkeleton>
        <TabsSkeleton tabs={3} />
        <RowsSkeleton rows={7} />
      </BodySkeleton>
    </AppScreen>
  );
}
