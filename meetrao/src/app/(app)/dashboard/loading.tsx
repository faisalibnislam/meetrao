import { DashboardScreen } from "@/components/app/app-screen";
import { Bar, BodySkeleton, CardsSkeleton, RowsSkeleton } from "@/components/app/skeleton";

/* The one screen whose header cannot be rendered for real: the greeting needs
   the host's name and timezone, which is exactly what we are waiting for. So
   the two lines are shimmered at the sizes DashboardHeader uses (clamp(30,38)
   over a 12.5px date line, in the same 7px stack) and the header keeps its
   height when the real greeting replaces it. */
export default function Loading() {
  return (
    <DashboardScreen
      header={
        <div className="flex min-w-0 flex-col gap-[7px]">
          <Bar w={340} h={38} className="max-[560px]:w-[240px]" />
          <Bar w={190} h={13} />
        </div>
      }
    >
      <BodySkeleton>
        <CardsSkeleton count={4} />
        <div className="mt-[8px] flex flex-col gap-[10px]">
          <Bar w={112} h={14} />
          <RowsSkeleton rows={3} />
        </div>
      </BodySkeleton>
    </DashboardScreen>
  );
}
